/**
 * AI Arena — Data Lake
 *
 * Storage strategy (hybrid):
 *   • Seed records  — always loaded from  data/seed/*.json  (committed to git, present on all environments)
 *   • Lake records  — runtime-ingested records:
 *       Production (Vercel KV_REST_API_URL is set)  → stored in Vercel KV
 *       Local dev  (no KV env vars)                 → stored in data/lake/*.json
 *
 * This means zero config changes for local development.
 * On Vercel, link a KV store to the project; the env vars are injected automatically.
 */

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import {
  DILRecord,
  DomainType,
  RawRecordInput,
  SplitType,
  ValidationError,
  QualityError,
  ALL_DOMAINS,
} from "./dil-schema";

// ── Environment detection ─────────────────────────────────────────────────────
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const USE_KV = !!(REDIS_URL && REDIS_TOKEN);

const KV_LAKE_KEY = "ai-arena:lake:records";
const KV_DEDUP_KEY = "ai-arena:lake:dedup"; // hash → id map

// ── Local file paths ──────────────────────────────────────────────────────────
const SEED_DIR = path.join(process.cwd(), "data", "seed");
const LAKE_DIR = path.join(process.cwd(), "data", "lake");

// ── In-memory cache & fallback ────────────────────────────────────────────────
let _cache: DILRecord[] | null = null;
let _loadingPromise: Promise<DILRecord[]> | null = null;
const _inMemoryLakeRecords: DILRecord[] = [];

function invalidateCache() {
  _cache = null;
  _loadingPromise = null;
}

// ── File helpers (local dev) ──────────────────────────────────────────────────
function ensureLakeDir() {
  try {
    if (!existsSync(LAKE_DIR)) mkdirSync(LAKE_DIR, { recursive: true });
  } catch {
    // Read-only filesystem (e.g. AWS Lambda / Vercel Serverless /var/task)
  }
}

function readJsonFile(filePath: string): DILRecord[] {
  try {
    if (!existsSync(filePath)) return [];
    const content = readFileSync(filePath, "utf-8").trim();
    return content ? (JSON.parse(content) as DILRecord[]) : [];
  } catch {
    return [];
  }
}

function loadSeedRecords(): DILRecord[] {
  const all: DILRecord[] = [];
  for (const domain of ALL_DOMAINS) {
    all.push(...readJsonFile(path.join(SEED_DIR, `${domain}.json`)));
  }
  return all;
}

function loadLakeFromFiles(): DILRecord[] {
  if (!existsSync(LAKE_DIR)) return [];
  const all: DILRecord[] = [];
  for (const domain of ALL_DOMAINS) {
    all.push(...readJsonFile(path.join(LAKE_DIR, `${domain}.json`)));
  }
  return all;
}

function appendToLakeFile(record: DILRecord) {
  try {
    ensureLakeDir();
    const filePath = path.join(LAKE_DIR, `${record.domain}.json`);
    const existing = readJsonFile(filePath);
    existing.push(record);
    writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
  } catch {
    // In read-only serverless environment without KV, store in memory
    _inMemoryLakeRecords.push(record);
  }
}

// ── Upstash Redis / Vercel KV helpers (Production) ───────────────────────────
let _redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (!_redis) {
    const { Redis } = await import("@upstash/redis");
    _redis = new Redis({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    });
  }
  return _redis;
}

async function loadLakeFromKV(): Promise<DILRecord[]> {
  const redis = await getRedis();
  return (await redis.get<DILRecord[]>(KV_LAKE_KEY)) ?? [];
}

async function appendToKV(record: DILRecord): Promise<void> {
  const redis = await getRedis();
  const existing = (await redis.get<DILRecord[]>(KV_LAKE_KEY)) ?? [];
  existing.push(record);
  await redis.set(KV_LAKE_KEY, existing);
}

async function getKVDedupMap(): Promise<Record<string, string>> {
  const redis = await getRedis();
  return (await redis.get<Record<string, string>>(KV_DEDUP_KEY)) ?? {};
}

async function setKVDedupMap(map: Record<string, string>): Promise<void> {
  const redis = await getRedis();
  await redis.set(KV_DEDUP_KEY, map);
}

// ── Unified record loader ─────────────────────────────────────────────────────
async function loadAllRecords(): Promise<DILRecord[]> {
  const seed = loadSeedRecords();
  const lake = USE_KV ? await loadLakeFromKV() : loadLakeFromFiles();
  return [...seed, ...lake, ..._inMemoryLakeRecords];
}

async function getAllRecords(): Promise<DILRecord[]> {
  if (_cache) return _cache;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = loadAllRecords().then((records) => {
    _cache = records;
    return records;
  });
  return _loadingPromise;
}

// ── Pipeline helpers ──────────────────────────────────────────────────────────
function computeHash(instruction: string, question: string, response: string): string {
  return createHash("sha256")
    .update(instruction + "\x00" + question + "\x00" + response)
    .digest("hex");
}

function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function computeQualityScore(record: Partial<DILRecord> & RawRecordInput): number {
  let score = 0;
  if ((record.response ?? "").length >= 20) score += 0.3;
  if (/[?.!]$/.test((record.question ?? "").trim())) score += 0.2;
  if (record.evidence && record.evidence.trim().length > 0) score += 0.2;
  if ((record.instruction ?? "").length >= 10) score += 0.15;
  const combined = [record.instruction, record.question, record.response, record.evidence]
    .filter(Boolean).join(" ").toLowerCase();
  if (!/\[placeholder\]|todo|fixme|xxx/.test(combined)) score += 0.15;
  return Math.min(1, Math.round(score * 100) / 100);
}

function assignSplit(id: string): SplitType {
  const num = parseInt(createHash("sha256").update(id).digest("hex").slice(0, 8), 16) % 100;
  if (num < 70) return "train";
  if (num < 85) return "validation";
  return "test";
}

// ── Dedup check (works for both KV and file modes) ────────────────────────────
async function findByHash(hash: string): Promise<DILRecord | undefined> {
  if (USE_KV) {
    const dedupMap = await getKVDedupMap();
    const existingId = dedupMap[hash];
    if (!existingId) return undefined;
    const records = await getAllRecords();
    return records.find((r) => r.id === existingId);
  }
  const records = await getAllRecords();
  return records.find((r) => r.meta.dedup_hash === hash);
}

// ── Main pipeline (7 stages) ──────────────────────────────────────────────────
export async function ingestRecord(input: RawRecordInput): Promise<DILRecord> {
  // Stage 1: Collect
  // Stage 2: Parse & extract
  const REQUIRED: (keyof RawRecordInput)[] = ["task", "domain", "instruction", "question", "response", "source_id"];
  const cleaned: RawRecordInput = { ...input };
  for (const field of REQUIRED) {
    const val = cleaned[field];
    if (typeof val !== "string" || stripControlChars(val).trim() === "") {
      throw new ValidationError(field);
    }
    (cleaned as unknown as Record<string, unknown>)[field] = stripControlChars(val as string).trim();
  }
  if (cleaned.context) cleaned.context = stripControlChars(cleaned.context).trim();
  if (cleaned.evidence) cleaned.evidence = stripControlChars(cleaned.evidence).trim();

  // Stage 3: Deduplicate
  const dedupHash = computeHash(cleaned.instruction, cleaned.question, cleaned.response);
  const existing = await findByHash(dedupHash);
  if (existing) return existing;

  // Stage 4: Normalize
  const domain = (cleaned.domain as string).toLowerCase() as DomainType;
  const difficulty = ((cleaned.difficulty ?? "medium") as string).toLowerCase() as "easy" | "medium" | "hard";
  const capabilities = cleaned.capabilities ?? [];
  const requires_retrieval = cleaned.requires_retrieval ?? false;
  const requires_tool = cleaned.requires_tool ?? false;
  const requires_calculation = cleaned.requires_calculation ?? false;
  const requires_human_escalation = cleaned.requires_human_escalation ?? false;

  // Stage 5: Metadata tagging
  const meta = {
    ingested_at: new Date().toISOString(),
    language: "en",
    jurisdiction: domain === "eu_regulatory_compliance" ? "EU" : undefined,
    version: "1.0",
    dedup_hash: dedupHash,
  };

  // Stage 6: Quality check
  const quality_score = computeQualityScore({ ...cleaned, domain, difficulty, requires_retrieval });
  if (quality_score < 0.3) throw new QualityError(quality_score);

  // Stage 7: Store
  const id = crypto.randomUUID();
  const split = assignSplit(id);

  const record: DILRecord = {
    id, stage: cleaned.task, task: cleaned.task, domain,
    instruction: cleaned.instruction, context: cleaned.context,
    question: cleaned.question, evidence: cleaned.evidence,
    response: cleaned.response, capabilities, difficulty,
    requires_retrieval, requires_tool, requires_calculation, requires_human_escalation,
    tool: cleaned.tool, tool_arguments: cleaned.tool_arguments, tool_result: cleaned.tool_result,
    source_id: cleaned.source_id, quality_score, split, meta,
  };

  if (USE_KV) {
    await appendToKV(record);
    const dedupMap = await getKVDedupMap();
    dedupMap[dedupHash] = id;
    await setKVDedupMap(dedupMap);
  } else {
    appendToLakeFile(record);
  }

  invalidateCache();
  return record;
}

// ── Query helpers (all async) ─────────────────────────────────────────────────
export async function listRecords(opts?: {
  domain?: DomainType;
  split?: string;
  task?: string;
  limit?: number;
}): Promise<DILRecord[]> {
  let records = await getAllRecords();
  if (opts?.domain) records = records.filter((r) => r.domain === opts.domain);
  if (opts?.split)  records = records.filter((r) => r.split === opts.split);
  if (opts?.task)   records = records.filter((r) => r.task.toLowerCase().includes(opts.task!.toLowerCase()));
  if (opts?.limit)  records = records.slice(0, opts.limit);
  return records;
}

export async function getRecord(id: string): Promise<DILRecord | undefined> {
  return (await getAllRecords()).find((r) => r.id === id);
}

export async function searchRecords(query: string, domain?: DomainType): Promise<DILRecord[]> {
  const q = query.toLowerCase();
  let records = await getAllRecords();
  if (domain) records = records.filter((r) => r.domain === domain);
  return records
    .filter((r) => {
      const haystack = [r.instruction, r.question, r.evidence, r.response]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 3);
}

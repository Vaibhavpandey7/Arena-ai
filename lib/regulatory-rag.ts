import fs from "fs";
import path from "path";

export interface RegulatoryChunk {
  id: string;
  regulation: "solvency_ii" | "delegated_reg_2015_35" | "eu_ai_act";
  regulationName: string;
  articleNumber: string;
  numericId?: number;
  title: string;
  path?: string;
  content: string;
  keywords: string[];
  wordCount: number;
}

export interface RegulatoryDocumentMeta {
  id: string;
  title: string;
  file: string;
  articleCount: number;
}

export interface RegulatorySearchResult {
  chunk: RegulatoryChunk;
  score: number;
  snippet: string;
  citation: string;
}

export interface RegulatoryIndexPayload {
  generatedAt: string;
  totalArticles: number;
  documents: RegulatoryDocumentMeta[];
  chunks: RegulatoryChunk[];
}

let cachedIndex: RegulatoryIndexPayload | null = null;
let tokenFreqMap: Map<string, number> | null = null;
let avgDocLength = 200;

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "for", "from", "shall", "under", "which",
  "article", "directive", "regulation", "paragraph", "referred", "accordance",
  "point", "such", "where", "have", "been", "their", "other", "into", "more",
  "about", "what", "does", "explain", "check", "compliance", "please", "rules"
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_-]{2,}/g) || []).filter(
    (t) => !STOP_WORDS.has(t)
  );
}

export function loadRegulatoryIndex(): RegulatoryIndexPayload {
  if (cachedIndex) return cachedIndex;

  try {
    // Statically bundled import for Vercel / serverless deployments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bundled = require("../regulatory_check/regulatory_index.json");
    cachedIndex = bundled as RegulatoryIndexPayload;
  } catch {
    const indexPath = path.join(process.cwd(), "regulatory_check", "regulatory_index.json");
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Regulatory index not found at ${indexPath}. Please run node scripts/build-regulatory-index.js`);
    }
    const raw = fs.readFileSync(indexPath, "utf-8");
    cachedIndex = JSON.parse(raw) as RegulatoryIndexPayload;
  }

  // Build BM25 inverted document frequency cache
  tokenFreqMap = new Map();
  let totalLength = 0;

  for (const chunk of cachedIndex.chunks) {
    const text = `${chunk.title} ${chunk.content} ${chunk.articleNumber}`.toLowerCase();
    const uniqueTokens = new Set(tokenize(text));
    totalLength += chunk.wordCount || 100;

    uniqueTokens.forEach((token) => {
      tokenFreqMap!.set(token, (tokenFreqMap!.get(token) || 0) + 1);
    });
  }

  avgDocLength = totalLength / (cachedIndex.chunks.length || 1);
  return cachedIndex;
}

export function getRegulatoryDocuments(): RegulatoryDocumentMeta[] {
  const index = loadRegulatoryIndex();
  return index.documents;
}

/**
 * High performance BM25 + Exact Article Match retrieval engine
 */
export function searchRegulatoryCorpus(
  query: string,
  options: {
    regulation?: "all" | "solvency_ii" | "delegated_reg_2015_35" | "eu_ai_act";
    topK?: number;
  } = {}
): RegulatorySearchResult[] {
  const index = loadRegulatoryIndex();
  const topK = Math.min(Math.max(options.topK ?? 3, 1), 8);
  const regFilter = options.regulation && options.regulation !== "all" ? options.regulation : undefined;

  const rawQuery = query.trim();
  if (!rawQuery) return [];

  // Check for explicit article numbers like "Article 101", "Art. 105", "Article 260", "Annex III"
  const artNumberMatch = rawQuery.match(/(?:article|art\.?)\s*(\d+[a-z]?)/i);
  const targetArticleNum = artNumberMatch ? artNumberMatch[1].toLowerCase() : null;
  const targetNumericId = targetArticleNum ? parseInt(targetArticleNum, 10) : null;

  const annexMatch = rawQuery.match(/annex\s*([ivxledm]+)/i);
  const targetAnnex = annexMatch ? annexMatch[1].toUpperCase() : null;

  const queryTokens = tokenize(rawQuery);
  const totalDocs = index.chunks.length;

  const k1 = 1.4;
  const b = 0.75;

  const scored: { chunk: RegulatoryChunk; score: number }[] = [];

  for (const chunk of index.chunks) {
    if (regFilter && chunk.regulation !== regFilter) {
      continue;
    }

    let score = 0;
    const chunkTokens = tokenize(`${chunk.title} ${chunk.content}`);
    const chunkDocLen = chunk.wordCount || 100;

    // Term frequencies in this chunk
    const tfMap = new Map<string, number>();
    for (const t of chunkTokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
    }

    // Exact Article / Annex Boosters
    if (targetArticleNum) {
      if (chunk.articleNumber.toLowerCase().includes(`article ${targetArticleNum}`)) {
        score += 85.0; // Huge boost for exact article request
      } else if (chunk.numericId === targetNumericId) {
        score += 65.0;
      }
    }

    if (targetAnnex && chunk.articleNumber.toUpperCase().includes(`ANNEX ${targetAnnex}`)) {
      score += 90.0;
    }

    // Exact Title Phrase Bonus
    const lowerTitle = chunk.title.toLowerCase();
    const lowerQuery = rawQuery.toLowerCase();
    if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
      score += 25.0;
    }

    // High value insurance regulatory topic boosters
    if (/high[- ]risk/i.test(lowerQuery) && /high[- ]risk|annex iii/i.test(lowerTitle + " " + chunk.content.slice(0, 500))) {
      score += 15.0;
    }
    if (/solvency capital requirement|scr/i.test(lowerQuery) && /solvency capital requirement|scr/i.test(lowerTitle)) {
      score += 15.0;
    }
    if (/minimum capital requirement|mcr/i.test(lowerQuery) && /minimum capital requirement|mcr/i.test(lowerTitle)) {
      score += 15.0;
    }
    if (/internal model/i.test(lowerQuery) && /internal model/i.test(lowerTitle)) {
      score += 15.0;
    }

    // BM25 calculation
    for (const qToken of queryTokens) {
      const tf = tfMap.get(qToken) || 0;
      if (tf > 0) {
        const df = (tokenFreqMap?.get(qToken) || 1);
        const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
        const num = tf * (k1 + 1);
        const den = tf + k1 * (1 - b + b * (chunkDocLen / avgDocLength));
        let termScore = idf * (num / den);

        // Title token boost
        if (lowerTitle.includes(qToken)) {
          termScore *= 2.5;
        }
        score += termScore;
      }
    }

    if (score > 1.5) {
      scored.push({ chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, topK);

  return topResults.map(({ chunk, score }) => {
    const citation = `${chunk.regulationName} — ${chunk.articleNumber} ("${chunk.title}")`;
    const snippet = generateSnippet(chunk.content, queryTokens);
    return {
      chunk,
      score: parseFloat(score.toFixed(2)),
      snippet,
      citation,
    };
  });
}

function generateSnippet(content: string, queryTokens: string[]): string {
  if (!content) return "";
  if (content.length <= 400) return content;

  // Find best sentence containing the most query tokens
  const sentences = content.split(/(?<=[.!?])\s+/);
  let bestSentenceIdx = 0;
  let maxHits = -1;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].toLowerCase();
    let hits = 0;
    for (const t of queryTokens) {
      if (s.includes(t)) hits++;
    }
    if (hits > maxHits) {
      maxHits = hits;
      bestSentenceIdx = i;
    }
  }

  const start = Math.max(0, bestSentenceIdx - 1);
  const end = Math.min(sentences.length, bestSentenceIdx + 2);
  const snippet = sentences.slice(start, end).join(" ");
  return snippet.length > 500 ? snippet.slice(0, 500) + "…" : snippet;
}

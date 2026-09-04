// DIL (Data Interchange Layer) Record Schema
// Unified schema for the insurance-domain data pipeline

export type DomainType =
  | "insurance_knowledge"
  | "eu_regulatory_compliance"
  | "insurance_documents"
  | "actuarial_numerical_data"
  | "tool_api_data"
  | "agentic_trajectory_data"
  | "human_feedback_preferences";

export type DifficultyType = "easy" | "medium" | "hard";
export type SplitType = "train" | "validation" | "test";

export interface DILRecordMeta {
  ingested_at: string;      // ISO timestamp
  language: string;         // default "en"
  jurisdiction?: string;    // "EU" for eu_regulatory_compliance, else undefined
  version: string;          // "1.0"
  dedup_hash: string;
}

export interface DILRecord {
  id: string;
  stage: string;
  task: string;
  domain: DomainType;
  instruction: string;
  context?: string;
  question: string;
  evidence?: string;
  response: string;
  capabilities: string[];
  difficulty: DifficultyType;
  requires_retrieval: boolean;
  requires_tool: boolean;
  requires_calculation: boolean;
  requires_human_escalation: boolean;
  tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_result?: string;
  source_id: string;
  quality_score: number;   // 0–1
  split: SplitType;
  meta: DILRecordMeta;
}

export interface RawRecordInput {
  task: string;
  domain: DomainType;
  instruction: string;
  question: string;
  response: string;
  source_id: string;
  context?: string;
  evidence?: string;
  capabilities?: string[];
  difficulty?: DifficultyType;
  requires_retrieval?: boolean;
  requires_tool?: boolean;
  requires_calculation?: boolean;
  requires_human_escalation?: boolean;
  tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_result?: string;
}

export class ValidationError extends Error {
  constructor(field: string) {
    super(`Validation failed: '${field}' is required and must be a non-empty string`);
    this.name = "ValidationError";
  }
}

export class QualityError extends Error {
  constructor(score: number) {
    super(`Quality check failed: score ${score.toFixed(2)} is below the minimum threshold of 0.30`);
    this.name = "QualityError";
  }
}

export const ALL_DOMAINS: DomainType[] = [
  "insurance_knowledge",
  "eu_regulatory_compliance",
  "insurance_documents",
  "actuarial_numerical_data",
  "tool_api_data",
  "agentic_trajectory_data",
  "human_feedback_preferences",
];

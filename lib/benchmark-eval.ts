/**
 * Benchmark evaluation and metric helpers for Head-to-Head model comparison.
 */

export interface GoldEvaluationResult {
  score: number; // 0 to 100
  label: "High Alignment" | "Moderate Alignment" | "Partial Alignment" | "Divergent";
  evidenceMatched: boolean;
  evidenceSnippet?: string;
  keyTermsMatched: string[];
  missingKeyTerms: string[];
}

export function calculateTokensPerSec(latencyMs: number, completionTokens: number): number {
  if (!latencyMs || latencyMs <= 0 || !completionTokens || completionTokens <= 0) return 0;
  return Math.round((completionTokens / (latencyMs / 1000)) * 10) / 10;
}

export function calculateWordCount(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
  "at", "by", "for", "with", "about", "against", "between", "into",
  "through", "during", "before", "after", "above", "below", "to",
  "from", "up", "down", "in", "out", "on", "off", "over", "under",
  "again", "further", "then", "once", "here", "there", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "s", "t", "can", "will", "just", "don", "should", "now",
  "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "having", "do", "does", "did", "doing", "would", "could"
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_%.-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Computes objective alignment between model response and verified gold standard response.
 */
export function evaluateGoldAlignment(
  modelAnswer?: string,
  goldResponse?: string,
  evidence?: string
): GoldEvaluationResult {
  if (!modelAnswer || !goldResponse) {
    return {
      score: 0,
      label: "Divergent",
      evidenceMatched: false,
      keyTermsMatched: [],
      missingKeyTerms: [],
    };
  }

  const modelLower = modelAnswer.toLowerCase();
  const goldTerms = Array.from(new Set(extractKeywords(goldResponse)));
  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];

  for (const term of goldTerms) {
    if (modelLower.includes(term)) {
      matchedTerms.push(term);
    } else {
      missingTerms.push(term);
    }
  }

  const keywordCoverage = goldTerms.length > 0 ? matchedTerms.length / goldTerms.length : 1;

  // Check evidence citations if available
  let evidenceMatched = false;
  if (evidence && evidence.trim()) {
    const evidenceKeywords = Array.from(new Set(extractKeywords(evidence))).filter((w) => w.length > 3);
    if (evidenceKeywords.length > 0) {
      const matchedCount = evidenceKeywords.filter((k) => modelLower.includes(k)).length;
      evidenceMatched = matchedCount / evidenceKeywords.length >= 0.5;
    } else {
      evidenceMatched = modelLower.includes(evidence.trim().toLowerCase().slice(0, 30));
    }
  }

  // Factor in evidence verification (+10% boost if verified)
  let rawScore = Math.round(keywordCoverage * 100);
  if (evidence && evidenceMatched) {
    rawScore = Math.min(100, rawScore + 10);
  }

  // Ensure minimum calibration
  const score = Math.max(0, Math.min(100, rawScore));

  let label: GoldEvaluationResult["label"] = "Divergent";
  if (score >= 80) label = "High Alignment";
  else if (score >= 60) label = "Moderate Alignment";
  else if (score >= 40) label = "Partial Alignment";

  return {
    score,
    label,
    evidenceMatched,
    evidenceSnippet: evidence,
    keyTermsMatched: matchedTerms.slice(0, 10),
    missingKeyTerms: missingTerms.slice(0, 8),
  };
}

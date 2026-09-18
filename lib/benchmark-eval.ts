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

function extractNumbers(text: string): string[] {
  // Extract percentages, decimals, currencies, ratios, and integers (e.g. 62%, 0.96, 2009/138, 77)
  const matches = text.match(/\b\d+[\.,]?\d*%?|\b\d+\/\d+\b/g) || [];
  return Array.from(new Set(matches.map((m) => m.trim()))).filter((m) => m.length > 0);
}

// Basic stemming to match variants (e.g. "calculates" / "calculation" -> "calculat")
function stemWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/(?:ing|tion|tions|ment|ments|ed|es|s)$/, "")
    .trim();
}

/**
 * Computes objective alignment between model response and verified gold standard response.
 * Evaluates across key domain concepts, numeric precision, regulatory citations, and semantic coverage.
 */
export function evaluateGoldAlignment(
  modelAnswer?: string,
  goldResponse?: string,
  evidence?: string,
  explicitKeyTerms?: string[]
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
  const goldLower = goldResponse.toLowerCase();

  // 1. Key Domain Terms Evaluation
  let targetTerms: string[] = [];
  if (explicitKeyTerms && explicitKeyTerms.length > 0) {
    targetTerms = explicitKeyTerms;
  } else {
    // Extract domain-specific key phrases from gold response (headers, bold items, quotes, and prominent terms)
    const boldMatches = goldResponse.match(/\*\*([^*]+)\*\*/g)?.map((b) => b.replace(/\*\*/g, "").trim()) || [];
    const significantWords = Array.from(new Set(extractKeywords(goldResponse))).filter((w) => w.length > 3);
    targetTerms = boldMatches.length >= 3 ? boldMatches : significantWords.slice(0, 16);
  }

  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];

  for (const rawTerm of targetTerms) {
    const termClean = rawTerm.toLowerCase().replace(/[^a-z0-9\s_%.-]/g, " ").trim();
    if (!termClean) continue;

    // Check direct substring, word tokens, or stemmed equivalence
    const tokens = termClean.split(/\s+/).filter(Boolean);
    const allTokensPresent = tokens.length > 0 && tokens.every((tok) => {
      if (modelLower.includes(tok)) return true;
      const stem = stemWord(tok);
      return stem.length >= 3 && modelLower.includes(stem);
    });

    if (modelLower.includes(termClean) || allTokensPresent) {
      matchedTerms.push(rawTerm);
    } else {
      missingTerms.push(rawTerm);
    }
  }

  const termRatio = targetTerms.length > 0 ? matchedTerms.length / targetTerms.length : 1;

  // 2. Numeric & Quantitative Precision Evaluation
  const goldNumbers = extractNumbers(goldResponse);
  let numericRatio = 1;
  if (goldNumbers.length > 0) {
    let matchedNumCount = 0;
    for (const num of goldNumbers) {
      const cleanNum = num.replace("%", "");
      if (modelAnswer.includes(num) || modelAnswer.includes(cleanNum)) {
        matchedNumCount++;
      }
    }
    numericRatio = matchedNumCount / goldNumbers.length;
  }

  // 3. Evidence & Regulatory Citation Verification
  let evidenceMatched = false;
  let evidenceRatio = 0.5;
  if (evidence && evidence.trim()) {
    const evidenceClauses = evidence.split(/[,;\.]/).map((s) => s.trim()).filter((s) => s.length > 4);
    let matchedClauses = 0;
    for (const clause of evidenceClauses) {
      const clauseLower = clause.toLowerCase();
      // Check for directive numbers, article numbers, or statutory names
      const clauseKeywords = extractKeywords(clauseLower);
      const matchedKw = clauseKeywords.filter((kw) => modelLower.includes(kw));
      if (clauseKeywords.length > 0 && matchedKw.length / clauseKeywords.length >= 0.4) {
        matchedClauses++;
      }
    }
    evidenceRatio = evidenceClauses.length > 0 ? matchedClauses / evidenceClauses.length : 0.5;
    evidenceMatched = evidenceRatio >= 0.4;
  }

  // 4. Overall Informative Keyword Overlap
  const allGoldKeywords = Array.from(new Set(extractKeywords(goldResponse)));
  const matchedKwCount = allGoldKeywords.filter((kw) => {
    if (modelLower.includes(kw)) return true;
    const stem = stemWord(kw);
    return stem.length >= 3 && modelLower.includes(stem);
  }).length;
  const kwRatio = allGoldKeywords.length > 0 ? matchedKwCount / allGoldKeywords.length : 1;

  // 5. Multi-Factor Balanced Scoring (Calibrated for domain benchmark reality)
  // Weighting: 40% Key Terms + 25% Numeric Precision + 20% Evidence Rigor + 15% Informative Overlap
  const weightedScore =
    termRatio * 40 +
    numericRatio * 25 +
    evidenceRatio * 20 +
    kwRatio * 15;

  // Add bonus for high evidence citation verification
  const finalRaw = Math.round(weightedScore + (evidenceMatched ? 5 : 0));
  const score = Math.max(0, Math.min(100, finalRaw));

  let label: GoldEvaluationResult["label"] = "Divergent";
  if (score >= 80) label = "High Alignment";
  else if (score >= 60) label = "Moderate Alignment";
  else if (score >= 40) label = "Partial Alignment";

  return {
    score,
    label,
    evidenceMatched,
    evidenceSnippet: evidence,
    keyTermsMatched: matchedTerms.slice(0, 12),
    missingKeyTerms: missingTerms.slice(0, 8),
  };
}

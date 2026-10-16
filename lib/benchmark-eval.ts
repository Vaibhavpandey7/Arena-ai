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

export type ReferenceScoringType =
  | "categorical"
  | "multiple-choice"
  | "numeric"
  | "free-form";

export interface ReferenceScoringPolicy {
  type?: ReferenceScoringType | "auto";
  absoluteTolerance?: number;
  relativeTolerance?: number;
}

export interface ReferenceTaskResult {
  taskType: ReferenceScoringType | "unavailable";
  metricName: string;
  available: boolean;
  reason?: string;
  correct?: boolean;
  absoluteError?: number;
  unit?: string;
  absoluteTolerance?: number;
  relativeTolerance?: number;
  tokenPrecision?: number;
  tokenRecall?: number;
  tokenF1?: number;
}

export interface ReferenceRunSample {
  sampleId: string;
  reference?: string;
  options?: Record<string, string>;
  policy?: ReferenceScoringPolicy;
  response?: string;
  status: "success" | "failed" | "cancelled";
}

export interface ReferenceMetricGroup {
  taskType: ReferenceScoringType;
  unit?: string;
  absoluteTolerance?: number;
  relativeTolerance?: number;
  sampleIds: string[];
  evaluatedCount: number;
  denominator: number;
  correctCount?: number;
  incorrectCount?: number;
  accuracy?: number;
  meanAbsoluteError?: number;
  meanTokenPrecision?: number;
  meanTokenRecall?: number;
  meanTokenF1?: number;
  metricName: string;
}

export interface ReferenceRunAggregate {
  selectedCount: number;
  completedCount: number;
  evaluatedCount: number;
  unscoredCount: number;
  skippedCount: number;
  failedCount: number;
  pendingCount: number;
  groups: ReferenceMetricGroup[];
}

interface ParsedNumber {
  value: number;
  unit: string;
}

const UNIT_CONVERSIONS: Record<string, { baseUnit: string; factor: number }> = {
  kg: { baseUnit: "g", factor: 1_000 },
  g: { baseUnit: "g", factor: 1 },
  km: { baseUnit: "m", factor: 1_000 },
  m: { baseUnit: "m", factor: 1 },
  cm: { baseUnit: "m", factor: 0.01 },
};

const BINARY_LABELS = new Set([
  "yes", "no", "true", "false", "pass", "fail", "approved", "rejected",
  "eligible", "ineligible", "compliant", "noncompliant", "positive", "negative",
]);

const FREE_FORM_DIAGNOSTIC_NAME =
  "Metric unavailable for semantic accuracy; token-level precision/recall/F1 (lexical diagnostic)";

const NUMBER_SOURCE =
  "[-+]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?(?:[eE][-+]?\\d+)?";
const NUMBER_PATTERN = new RegExp(NUMBER_SOURCE, "g");
const NUMERIC_REFERENCE_PATTERN = new RegExp(
  `^\\s*(?:(?:[$€£¥]|USD|EUR|GBP|CNY|RMB)\\s*)?${NUMBER_SOURCE}\\s*(?:(?:%|percent(?:age)?|USD|EUR|GBP|CNY|RMB|dollars?|euros?|yuan|rmb|cny|days?|years?|months?|kg|g|km|m|cm|k|thousand|million|billion|元)(?:\\s+(?:USD|EUR|GBP|CNY|RMB|dollars?|euros?|yuan))?)?\\s*[.!?]?\\s*$`,
  "i"
);

const UNIT_ALIASES: Record<string, string> = {
  "%": "percent",
  percent: "percent",
  percentage: "percent",
  usd: "usd",
  dollar: "usd",
  dollars: "usd",
  "$": "usd",
  eur: "eur",
  euro: "eur",
  euros: "eur",
  "€": "eur",
  gbp: "gbp",
  "£": "gbp",
  yuan: "cny",
  rmb: "cny",
  cny: "cny",
  "¥": "cny",
  元: "cny",
  day: "day",
  days: "day",
  year: "year",
  years: "year",
  month: "month",
  months: "month",
  kg: "kg",
  g: "g",
  km: "km",
  m: "m",
  cm: "cm",
};

function normalizeReferenceText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .replace(/[“”‘’]/g, "'")
    .replace(/[.!?;,]+$/g, "")
    .replace(/\s+/g, " ");
}

function uniqueOptionMatch(
  value: string,
  options: Record<string, string>
): string | undefined {
  const normalized = normalizeReferenceText(value);
  const matches = Object.entries(options).filter(
    ([letter, option]) =>
      normalizeReferenceText(letter) === normalized ||
      normalizeReferenceText(option) === normalized
  );
  return matches.length === 1 ? matches[0][0].toUpperCase() : undefined;
}

function mapMultipleChoiceAnswer(
  answer: string,
  options: Record<string, string>
): string | undefined {
  const normalized = normalizeReferenceText(answer);
  const direct = uniqueOptionMatch(normalized, options);
  if (direct) return direct;

  const ambiguousPattern = /\b(?:answer|option|choice)\s*(?:is|:|=)?\s*\(?[a-e]\)?(?:\s*(?:or|\/|,|and)\s*\(?[a-e]\)?)+/i;
  if (ambiguousPattern.test(normalized)) return undefined;

  const letterPattern = /\b(?:answer|option|choice)\s*(?:is|:|=)?\s*\(?([a-e])\)?\b/gi;
  const letters = Array.from(normalized.matchAll(letterPattern))
    .map((match) => match[1].toUpperCase())
    .filter((letter) => Object.prototype.hasOwnProperty.call(options, letter));
  if (new Set(letters).size === 1) return letters[0];
  if (new Set(letters).size > 1) return undefined;

  const valueMatches = Object.entries(options)
    .filter(([, option]) => {
      const normalizedOption = normalizeReferenceText(option);
      return normalizedOption.length > 0 &&
        normalized.includes(normalizedOption);
    })
    .map(([letter]) => letter.toUpperCase());
  return new Set(valueMatches).size === 1 ? valueMatches[0] : undefined;
}

function parseSingleNumber(value: string): ParsedNumber | undefined {
  const matches = Array.from(value.matchAll(NUMBER_PATTERN));
  if (matches.length !== 1) return undefined;
  const match = matches[0];
  const rawNumber = match[0].replace(/,/g, "");
  const number = Number(rawNumber);
  if (!Number.isFinite(number)) return undefined;

  const start = match.index ?? 0;
  const end = start + match[0].length;
  const before = value.slice(Math.max(0, start - 16), start);
  const after = value.slice(end, end + 24);
  const prefix = before.match(/(?:[$€£¥]|USD|EUR|GBP|CNY|RMB)\s*$/i)?.[0] ?? "";
  const suffixMatch = after.match(/^\s*(%|[A-Za-z]{1,12}|元)(?:\s+([A-Za-z]{1,12}|元))?/);
  const firstSuffix = suffixMatch?.[1] ?? "";
  const secondSuffix = suffixMatch?.[2] ?? "";
  const prefixUnit = prefix.trim().toLocaleLowerCase();
  const firstToken = firstSuffix.trim().toLocaleLowerCase();
  const secondToken = secondSuffix.trim().toLocaleLowerCase();
  const scaleToken = /^(k|thousand|million|billion)$/i.exec(firstToken)?.[1]?.toLowerCase();
  const scale = scaleToken === "k" || scaleToken === "thousand"
    ? 1_000
    : scaleToken === "million"
      ? 1_000_000
      : scaleToken === "billion"
        ? 1_000_000_000
        : 1;
  const unitToken = scaleToken
    ? secondToken || prefixUnit
    : firstToken || prefixUnit;
  const normalizedUnit = UNIT_ALIASES[unitToken] ?? unitToken;
  const conversion = UNIT_CONVERSIONS[normalizedUnit];
  return {
    value: number * scale * (conversion?.factor ?? 1),
    unit: conversion?.baseUnit ?? normalizedUnit,
  };
}

function getTaskType(
  reference: string,
  options: Record<string, string>,
  policy?: ReferenceScoringPolicy
): ReferenceScoringType {
  if (policy?.type && policy.type !== "auto") return policy.type;
  if (Object.keys(options).length > 0) return "multiple-choice";
  const normalized = normalizeReferenceText(reference);
  if (BINARY_LABELS.has(normalized)) return "categorical";
  if (NUMERIC_REFERENCE_PATTERN.test(reference) && parseSingleNumber(reference)) {
    return "numeric";
  }
  return "free-form";
}

function tokenCounts(value: string): Map<string, number> {
  const tokens = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

export function evaluateReferenceAnswer(
  response: string,
  reference: string | undefined,
  options: Record<string, string> = {},
  policy?: ReferenceScoringPolicy
): ReferenceTaskResult {
  if (!reference?.trim()) {
    return {
      taskType: "unavailable",
      metricName: "Metric unavailable",
      available: false,
      reason: "The sample has no reference answer.",
    };
  }

  const taskType = getTaskType(reference, options, policy);
  if (taskType === "multiple-choice") {
    const expected = uniqueOptionMatch(reference, options);
    if (!expected) {
      return {
        taskType: "unavailable",
        metricName: "Metric unavailable",
        available: false,
        reason: "The reference answer does not map unambiguously to one available option.",
      };
    }
    const actual = mapMultipleChoiceAnswer(response, options);
    if (!actual) {
      return {
        taskType,
        metricName: "Multiple-choice accuracy",
        available: false,
        reason: "The response does not identify exactly one available option.",
      };
    }
    return {
      taskType,
      metricName: "Multiple-choice accuracy",
      available: true,
      correct: actual === expected,
    };
  }

  if (taskType === "categorical") {
    const expected = normalizeReferenceText(reference);
    const actual = normalizeReferenceText(response);
    return {
      taskType,
      metricName: "Normalized exact-match accuracy",
      available: Boolean(actual),
      ...(actual ? { correct: actual === expected } : {
        reason: "The response is empty.",
      }),
    };
  }

  if (taskType === "numeric") {
    const expected = parseSingleNumber(reference);
    const actual = parseSingleNumber(response);
    if (!expected || !actual) {
      return {
        taskType,
        metricName: "Numeric accuracy",
        available: false,
        reason: !actual
          ? "The response must contain exactly one unambiguous numeric value."
          : "The reference must contain exactly one unambiguous numeric value.",
      };
    }
    if (expected.unit !== actual.unit) {
      return {
        taskType,
        metricName: "Numeric accuracy",
        available: false,
        reason: `Incompatible or missing units (reference: "${expected.unit || "none"}"; response: "${actual.unit || "none"}").`,
      };
    }
    const absoluteError = Math.abs(actual.value - expected.value);
    const absoluteTolerance = policy?.absoluteTolerance ?? 0;
    const relativeTolerance = policy?.relativeTolerance ?? 0;
    const tolerance = Math.max(
      absoluteTolerance,
      Math.abs(expected.value) * relativeTolerance
    );
    return {
      taskType,
      metricName: "Numeric accuracy",
      available: true,
      correct: absoluteError <= tolerance,
      absoluteError,
      unit: expected.unit,
      absoluteTolerance,
      relativeTolerance,
    };
  }

  const expectedCounts = tokenCounts(reference);
  const actualCounts = tokenCounts(response);
  const expectedTotal = Array.from(expectedCounts.values()).reduce((sum, count) => sum + count, 0);
  const actualTotal = Array.from(actualCounts.values()).reduce((sum, count) => sum + count, 0);
  if (expectedTotal === 0 || actualTotal === 0) {
    return {
      taskType,
      metricName: FREE_FORM_DIAGNOSTIC_NAME,
      available: false,
      reason: "Both the reference and response need at least one lexical token.",
    };
  }
  let overlap = 0;
  for (const [token, count] of expectedCounts) {
    overlap += Math.min(count, actualCounts.get(token) ?? 0);
  }
  const tokenPrecision = overlap / actualTotal;
  const tokenRecall = overlap / expectedTotal;
  const tokenF1 = tokenPrecision + tokenRecall === 0
    ? 0
    : 2 * tokenPrecision * tokenRecall / (tokenPrecision + tokenRecall);
  return {
    taskType,
    metricName: FREE_FORM_DIAGNOSTIC_NAME,
    available: true,
    tokenPrecision,
    tokenRecall,
    tokenF1,
  };
}

export function aggregateReferenceRun(
  samples: ReferenceRunSample[],
  selectedCount = samples.length,
  pendingCount = 0
): ReferenceRunAggregate {
  const groups = new Map<string, {
    taskType: ReferenceScoringType;
    unit?: string;
    absoluteTolerance?: number;
    relativeTolerance?: number;
    metricName: string;
    sampleIds: string[];
    correct: number[];
    errors: number[];
    precision: number[];
    recall: number[];
    f1: number[];
  }>();
  let evaluatedCount = 0;
  let unscoredCount = 0;
  let completedCount = 0;
  let failedCount = 0;

  for (const sample of samples) {
    if (sample.status === "failed") {
      failedCount++;
      continue;
    }
    if (sample.status !== "success") continue;
    completedCount++;
    const result = evaluateReferenceAnswer(
      sample.response ?? "",
      sample.reference,
      sample.options,
      sample.policy
    );
    if (!result.available || result.taskType === "unavailable") {
      unscoredCount++;
      continue;
    }
    evaluatedCount++;
    const groupKey = [
      result.taskType,
      result.unit ?? "",
      result.absoluteTolerance ?? "",
      result.relativeTolerance ?? "",
    ].join(":");
    const group = groups.get(groupKey) ?? {
      taskType: result.taskType,
      unit: result.unit,
      absoluteTolerance: result.absoluteTolerance,
      relativeTolerance: result.relativeTolerance,
      metricName: result.metricName,
      sampleIds: [],
      correct: [],
      errors: [],
      precision: [],
      recall: [],
      f1: [],
    };
    if (result.correct !== undefined) group.correct.push(result.correct ? 1 : 0);
    if (result.absoluteError !== undefined) group.errors.push(result.absoluteError);
    if (result.tokenPrecision !== undefined) group.precision.push(result.tokenPrecision);
    if (result.tokenRecall !== undefined) group.recall.push(result.tokenRecall);
    if (result.tokenF1 !== undefined) group.f1.push(result.tokenF1);
    group.sampleIds.push(sample.sampleId);
    groups.set(groupKey, group);
  }

  const metricGroups = Array.from(groups.values()).map((group): ReferenceMetricGroup => {
    const denominator = group.correct.length;
    return {
      taskType: group.taskType,
      ...(group.unit ? { unit: group.unit } : {}),
      ...(group.absoluteTolerance !== undefined
        ? { absoluteTolerance: group.absoluteTolerance }
        : {}),
      ...(group.relativeTolerance !== undefined
        ? { relativeTolerance: group.relativeTolerance }
        : {}),
      sampleIds: group.sampleIds,
      evaluatedCount: group.correct.length || group.f1.length,
      denominator,
      ...(denominator > 0 ? {
        correctCount: group.correct.filter(Boolean).length,
        incorrectCount: denominator - group.correct.filter(Boolean).length,
        accuracy: group.correct.filter(Boolean).length / denominator,
      } : {}),
      ...(group.errors.length > 0
        ? { meanAbsoluteError: group.errors.reduce((sum, value) => sum + value, 0) / group.errors.length }
        : {}),
      ...(group.f1.length > 0 ? {
        meanTokenPrecision: group.precision.reduce((sum, value) => sum + value, 0) / group.precision.length,
        meanTokenRecall: group.recall.reduce((sum, value) => sum + value, 0) / group.recall.length,
        meanTokenF1: group.f1.reduce((sum, value) => sum + value, 0) / group.f1.length,
      } : {}),
      metricName: group.metricName,
    };
  });

  return {
    selectedCount,
    completedCount,
    evaluatedCount,
    unscoredCount,
    skippedCount: Math.max(0, selectedCount - completedCount - failedCount - pendingCount),
    failedCount,
    pendingCount: Math.min(pendingCount, selectedCount),
    groups: metricGroups,
  };
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
 * Returns a heuristic reference-alignment diagnostic. Its lexical and citation
 * signals are not verified semantic accuracy and are not used by task scoring.
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

export interface CategoryEvaluationSummary {
  categoryId: string;
  categoryName: string;
  evaluatedCount: number;
  correctCount: number;
  accuracy: number | null; // null if evaluatedCount === 0
  unscoredCount: number;
  failedCount: number;
}

export interface HierarchicalBatchScoreResult {
  overallScore: number | null; // percentage 0-100, or null if no valid scored categories
  categoryScores: CategoryEvaluationSummary[];
  activeCategoryCount: number;
  totalEvaluated: number;
  totalCorrect: number;
  totalFailed: number;
  totalUnscored: number;
  weightingPolicy: "equal-category-mean" | "single-category-direct";
  formulaExplanation: string;
}

/**
 * Calculates batch score using a documented hierarchical equal-weighted category policy.
 * Prevents a large dataset category from dominating smaller high-rigor categories.
 */
export function calculateHierarchicalBatchScore(
  categories: CategoryEvaluationSummary[]
): HierarchicalBatchScoreResult {
  const activeCategories = categories.filter(
    (c) => c.evaluatedCount > 0 && c.accuracy !== null
  );

  const totalEvaluated = categories.reduce((sum, c) => sum + c.evaluatedCount, 0);
  const totalCorrect = categories.reduce((sum, c) => sum + c.correctCount, 0);
  const totalFailed = categories.reduce((sum, c) => sum + c.failedCount, 0);
  const totalUnscored = categories.reduce((sum, c) => sum + c.unscoredCount, 0);

  if (activeCategories.length === 0) {
    return {
      overallScore: null,
      categoryScores: categories,
      activeCategoryCount: 0,
      totalEvaluated,
      totalCorrect,
      totalFailed,
      totalUnscored,
      weightingPolicy: "equal-category-mean",
      formulaExplanation: "No scored responses available to compute aggregate accuracy.",
    };
  }

  if (activeCategories.length === 1) {
    const single = activeCategories[0];
    const acc = single.accuracy ?? 0;
    return {
      overallScore: Math.round(acc * 1000) / 10,
      categoryScores: categories,
      activeCategoryCount: 1,
      totalEvaluated,
      totalCorrect,
      totalFailed,
      totalUnscored,
      weightingPolicy: "single-category-direct",
      formulaExplanation: `Direct accuracy on ${single.categoryName}: ${single.correctCount}/${single.evaluatedCount} (${(acc * 100).toFixed(1)}%).`,
    };
  }

  // Equal-weighted category mean across all active categories
  const sumAcc = activeCategories.reduce((sum, c) => sum + (c.accuracy ?? 0), 0);
  const meanAcc = sumAcc / activeCategories.length;

  return {
    overallScore: Math.round(meanAcc * 1000) / 10,
    categoryScores: categories,
    activeCategoryCount: activeCategories.length,
    totalEvaluated,
    totalCorrect,
    totalFailed,
    totalUnscored,
    weightingPolicy: "equal-category-mean",
    formulaExplanation: `Equal-weighted mean of ${activeCategories.length} active categories (${(100 / activeCategories.length).toFixed(1)}% weight per category). Sample count imbalances across categories do not skew the aggregate score.`,
  };
}

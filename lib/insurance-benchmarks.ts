import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  INSURANCE_BENCHMARKS,
  type InsuranceBenchmarkDefinition,
  type InsuranceBenchmarkId,
} from "./insurance-benchmark-registry";
import type { ReferenceScoringPolicy } from "./benchmark-eval";

export {
  INSURANCE_BENCHMARKS,
  type InsuranceBenchmarkDefinition,
  type InsuranceBenchmarkId,
} from "./insurance-benchmark-registry";

export interface InsuranceBenchmarkRecord {
  id: string;
  benchmarkId: InsuranceBenchmarkId;
  sourceRowNumber: number;
  fullQuestion: string;
  questionStem?: string;
  options: Record<string, string>;
  correctAnswer: string;
}

const REQUIRED_COLUMNS = ["full question", "correct answer"] as const;
const OPTION_COLUMNS = ["A", "B", "C", "D", "E"] as const;
const DATA_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "h2h_benchmark_data",
  "CuFE"
);
const benchmarkCache = new Map<InsuranceBenchmarkId, InsuranceBenchmarkRecord[]>();

export class InsuranceBenchmarkDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsuranceBenchmarkDataError";
  }
}

export function getInsuranceBenchmarkDefinition(
  benchmarkId: string
): InsuranceBenchmarkDefinition {
  const definition = INSURANCE_BENCHMARKS.find((item) => item.id === benchmarkId);
  if (!definition) {
    throw new InsuranceBenchmarkDataError(
      `Unknown insurance benchmark ID "${benchmarkId}". Expected one of: ${INSURANCE_BENCHMARKS.map((item) => item.id).join(", ")}.`
    );
  }
  return definition;
}

export function getInsuranceBenchmarkScoringPolicy(
  definition: InsuranceBenchmarkDefinition,
  sourceRowNumber: number
): ReferenceScoringPolicy {
  return definition.scoringOverrides?.find(
    (override) =>
      sourceRowNumber >= override.firstSourceRow &&
      sourceRowNumber <= override.lastSourceRow
  )?.policy ?? definition.scoringPolicy;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function requiredValue(
  row: Record<string, string>,
  column: (typeof REQUIRED_COLUMNS)[number],
  fileName: string,
  sourceRowNumber: number
): string {
  const value = row[column]?.trim();
  if (!value) {
    throw new InsuranceBenchmarkDataError(
      `${fileName}: row ${sourceRowNumber} has an empty required "${column}" value.`
    );
  }
  return value;
}

/**
 * Parse a CSV string using record numbers (header is row 1) for traceable IDs.
 * Fields are trimmed only at their boundaries; internal whitespace is retained.
 */
export function parseInsuranceBenchmarkCsv(
  benchmarkId: string,
  csvText: string,
  fileName?: string
): InsuranceBenchmarkRecord[] {
  const definition = getInsuranceBenchmarkDefinition(benchmarkId);
  const sourceFile = fileName ?? definition.fileName;
  let headerValidated = false;

  try {
    const rows = parse(csvText, {
      bom: true,
      columns: (headers: string[]) => {
        const normalizedHeaders = headers.map(normalizeHeader);
        const missingHeaders = REQUIRED_COLUMNS.filter(
          (column) => !normalizedHeaders.includes(column)
        );
        if (missingHeaders.length > 0) {
          throw new InsuranceBenchmarkDataError(
            `${sourceFile}: row 1 is missing required column${missingHeaders.length === 1 ? "" : "s"} ${missingHeaders.map((column) => `"${column}"`).join(", ")}.`
          );
        }

        const duplicateHeaders = normalizedHeaders.filter(
          (header, index) => normalizedHeaders.indexOf(header) !== index
        );
        if (duplicateHeaders.length > 0) {
          throw new InsuranceBenchmarkDataError(
            `${sourceFile}: row 1 contains duplicate column "${duplicateHeaders[0]}".`
          );
        }

        headerValidated = true;
        return normalizedHeaders;
      },
      skip_empty_lines: true,
      trim: false,
      relax_column_count: false,
    }) as Record<string, string>[];

    if (!headerValidated) {
      throw new InsuranceBenchmarkDataError(
        `${sourceFile}: row 1 is missing required column headers.`
      );
    }
    if (rows.length === 0) {
      throw new InsuranceBenchmarkDataError(
        `${sourceFile}: no benchmark records were found after the header row.`
      );
    }

    return rows.map((row, index) => {
      const sourceRowNumber = index + 2;
      const fullQuestion = requiredValue(
        row,
        "full question",
        sourceFile,
        sourceRowNumber
      );
      const correctAnswer = requiredValue(
        row,
        "correct answer",
        sourceFile,
        sourceRowNumber
      );
      const questionStem = row["question stem"]?.trim();
      const options: Record<string, string> = {};

      for (const option of OPTION_COLUMNS) {
        const value = row[option.toLowerCase()]?.trim();
        if (value) options[option] = value;
      }

      return {
        id: `${definition.id}-row-${sourceRowNumber}`,
        benchmarkId: definition.id,
        sourceRowNumber,
        fullQuestion,
        ...(questionStem ? { questionStem } : {}),
        options,
        correctAnswer,
      };
    });
  } catch (error) {
    if (error instanceof InsuranceBenchmarkDataError) throw error;

    const csvError = error as Error & { lines?: number; line?: number };
    const lineNumber = csvError.lines ?? csvError.line;
    const location = lineNumber ? ` near row ${lineNumber}` : "";
    throw new InsuranceBenchmarkDataError(
      `${sourceFile}: invalid CSV${location}: ${csvError.message}`
    );
  }
}

export function loadInsuranceBenchmark(
  benchmarkId: string
): InsuranceBenchmarkRecord[] {
  const definition = getInsuranceBenchmarkDefinition(benchmarkId);
  const cachedRecords = benchmarkCache.get(definition.id);
  if (cachedRecords) return cachedRecords;

  const filePath = path.join(DATA_DIRECTORY, definition.fileName);

  let csvText: string;
  try {
    csvText = readFileSync(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InsuranceBenchmarkDataError(
      `${definition.fileName}: unable to read benchmark CSV from ${filePath}: ${message}`
    );
  }

  const records = parseInsuranceBenchmarkCsv(
    definition.id,
    csvText,
    definition.fileName
  );
  benchmarkCache.set(definition.id, records);
  return records;
}

export function loadAllInsuranceBenchmarks(): InsuranceBenchmarkRecord[] {
  return INSURANCE_BENCHMARKS.flatMap((benchmark) =>
    loadInsuranceBenchmark(benchmark.id)
  );
}

export function getInsuranceBenchmarkPreview(
  record: InsuranceBenchmarkRecord,
  maxLength = 240
): string {
  if (record.questionStem) return record.questionStem;

  const preview = record.fullQuestion.replace(/\s+/g, " ").trim();
  if (preview.length <= maxLength) return preview;

  const truncated = preview.slice(0, maxLength).trimEnd();
  const wordBoundary = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, wordBoundary > 0 ? wordBoundary : maxLength)}…`;
}

export function getInsuranceBenchmarkPrompt(
  record: InsuranceBenchmarkRecord
): string {
  return record.fullQuestion;
}

import { parse } from "csv-parse/sync";

export const MAX_MANUAL_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_MANUAL_CSV_ROWS = 500;

const REQUIRED_HEADERS = ["full question", "correct answer"] as const;
const OPTIONAL_HEADERS = [
  "question stem",
  "a",
  "b",
  "c",
  "d",
  "e",
] as const;

export interface ManualInsuranceCsvCase {
  id: string;
  sourceRowNumber: number;
  fullQuestion: string;
  questionStem?: string;
  options: Record<string, string>;
  correctAnswer: string;
  errors: string[];
}

export interface ManualInsuranceCsvReport {
  fileName: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  headers: string[];
  cases: ManualInsuranceCsvCase[];
}

export class ManualInsuranceCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualInsuranceCsvError";
  }
}

export function removeInvalidManualCsvCase(
  cases: ManualInsuranceCsvCase[],
  caseId: string
): ManualInsuranceCsvCase[] {
  const target = cases.find((item) => item.id === caseId);
  if (!target || target.errors.length === 0) return cases;
  return cases.filter((item) => item.id !== caseId);
}

export function cancelManualInsuranceCsvUpload(): ManualInsuranceCsvCase[] {
  return [];
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export interface ManualCsvColumnMapping {
  questionColumn: string;
  answerColumn: string;
  stemColumn?: string;
  optionColumns?: Record<string, string>;
}

export interface RawCsvInspection {
  fileName: string;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  hasStandardHeaders: boolean;
}

export function inspectManualCsv(
  fileName: string,
  csvText: string
): RawCsvInspection {
  if (!csvText.trim()) {
    throw new ManualInsuranceCsvError(`${fileName}: the CSV file is empty.`);
  }

  try {
    const parsedRows = parse(csvText, {
      bom: true,
      columns: false,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: false,
    }) as string[][];

    if (parsedRows.length === 0) {
      throw new ManualInsuranceCsvError(`${fileName}: the CSV file is empty.`);
    }

    const headers = parsedRows[0].map((h) => h.trim());
    const normalized = headers.map(normalizeHeader);
    const hasStandardHeaders =
      normalized.includes("full question") &&
      normalized.includes("correct answer");

    return {
      fileName,
      headers,
      sampleRows: parsedRows.slice(1, 4),
      totalRows: parsedRows.length - 1,
      hasStandardHeaders,
    };
  } catch (error) {
    if (error instanceof ManualInsuranceCsvError) throw error;
    const csvError = error as Error & { lines?: number; line?: number };
    const line = csvError.lines ?? csvError.line;
    throw new ManualInsuranceCsvError(
      `${fileName}: malformed CSV${line ? ` near line ${line}` : ""}: ${csvError.message}`
    );
  }
}

export function parseManualInsuranceCsv(
  fileName: string,
  csvText: string,
  columnMapping?: ManualCsvColumnMapping
): ManualInsuranceCsvReport {
  if (!csvText.trim()) {
    throw new ManualInsuranceCsvError(`${fileName}: the CSV file is empty.`);
  }

  let normalizedHeaders: string[] = [];
  let rawHeaders: string[] = [];
  let dataRows: string[][];
  try {
    const parsedRows = parse(csvText, {
      bom: true,
      columns: false,
      skip_empty_lines: false,
      relax_column_count: true,
      trim: false,
    }) as string[][];
    if (parsedRows.length === 0) {
      throw new ManualInsuranceCsvError(`${fileName}: the CSV file is empty.`);
    }

    rawHeaders = parsedRows[0].map((h) => h.trim());
    normalizedHeaders = rawHeaders.map(normalizeHeader);
    const duplicateHeaders = normalizedHeaders.filter(
      (header, index) => normalizedHeaders.indexOf(header) !== index
    );
    if (duplicateHeaders.length > 0) {
      throw new ManualInsuranceCsvError(
        `${fileName}: header row has duplicate column "${duplicateHeaders[0]}".`
      );
    }

    if (!columnMapping) {
      const missingHeaders = REQUIRED_HEADERS.filter(
        (header) => !normalizedHeaders.includes(header)
      );
      if (missingHeaders.length > 0) {
        throw new ManualInsuranceCsvError(
          `${fileName}: header row is missing required column${missingHeaders.length === 1 ? "" : "s"} ${missingHeaders.map((header) => `"${header}"`).join(", ")}. No alternative column names are inferred.`
        );
      }

      const allowedHeaders = new Set<string>([
        ...REQUIRED_HEADERS,
        ...OPTIONAL_HEADERS,
      ]);
      const unknownHeaders = normalizedHeaders.filter(
        (header) => !allowedHeaders.has(header)
      );
      if (unknownHeaders.length > 0) {
        throw new ManualInsuranceCsvError(
          `${fileName}: unsupported column${unknownHeaders.length === 1 ? "" : "s"} ${unknownHeaders.map((header) => `"${header}"`).join(", ")}. Use the standard CSV headers; no automatic column mapping is performed.`
        );
      }
    } else {
      const normQuestionCol = normalizeHeader(columnMapping.questionColumn);
      const normAnswerCol = normalizeHeader(columnMapping.answerColumn);
      if (!normalizedHeaders.includes(normQuestionCol)) {
        throw new ManualInsuranceCsvError(
          `${fileName}: mapped question column "${columnMapping.questionColumn}" was not found in CSV headers.`
        );
      }
      if (!normalizedHeaders.includes(normAnswerCol)) {
        throw new ManualInsuranceCsvError(
          `${fileName}: mapped answer column "${columnMapping.answerColumn}" was not found in CSV headers.`
        );
      }
    }

    dataRows = parsedRows.slice(1);
  } catch (error) {
    if (error instanceof ManualInsuranceCsvError) throw error;
    const csvError = error as Error & { lines?: number; line?: number };
    const line = csvError.lines ?? csvError.line;
    throw new ManualInsuranceCsvError(
      `${fileName}: malformed CSV${line ? ` near line ${line}` : ""}: ${csvError.message}`
    );
  }

  if (dataRows.length === 0) {
    throw new ManualInsuranceCsvError(
      `${fileName}: no data rows were found after the header.`
    );
  }
  if (dataRows.length > MAX_MANUAL_CSV_ROWS) {
    throw new ManualInsuranceCsvError(
      `${fileName}: contains ${dataRows.length} data rows; the maximum is ${MAX_MANUAL_CSV_ROWS}.`
    );
  }

  const columnIndex = new Map(
    normalizedHeaders.map((header, index) => [header, index])
  );
  const getValue = (row: string[], header: string) =>
    row[columnIndex.get(normalizeHeader(header)) ?? -1]?.trim() ?? "";

  const qCol = columnMapping ? columnMapping.questionColumn : "full question";
  const aCol = columnMapping ? columnMapping.answerColumn : "correct answer";
  const stemCol = columnMapping?.stemColumn;

  const cases = dataRows.map((row, index): ManualInsuranceCsvCase => {
    const sourceRowNumber = index + 2;
    const fullQuestion = getValue(row, qCol);
    const correctAnswer = getValue(row, aCol);
    const questionStem = stemCol ? getValue(row, stemCol) : getValue(row, "question stem");
    const options: Record<string, string> = {};
    const errors: string[] = [];

    if (row.length !== normalizedHeaders.length) {
      errors.push(
        `row has ${row.length} fields; expected ${normalizedHeaders.length}`
      );
    }
    if (!fullQuestion) errors.push("full question is empty");
    if (!correctAnswer) errors.push("correct answer is empty");

    if (columnMapping?.optionColumns) {
      for (const [letter, mappedCol] of Object.entries(columnMapping.optionColumns)) {
        const value = getValue(row, mappedCol);
        if (value) options[letter.toUpperCase()] = value;
      }
    } else {
      for (const option of ["A", "B", "C", "D", "E"]) {
        const value = getValue(row, option.toLowerCase());
        if (value) options[option] = value;
      }
    }

    return {
      id: `manual-row-${sourceRowNumber}`,
      sourceRowNumber,
      fullQuestion,
      ...(questionStem ? { questionStem } : {}),
      options,
      correctAnswer,
      errors,
    };
  });

  return {
    fileName,
    rowCount: cases.length,
    validCount: cases.filter((item) => item.errors.length === 0).length,
    invalidCount: cases.filter((item) => item.errors.length > 0).length,
    headers: normalizedHeaders,
    cases,
  };
}

export function decodeManualInsuranceCsv(
  fileName: string,
  bytes: Uint8Array,
  columnMapping?: ManualCsvColumnMapping
): ManualInsuranceCsvReport {
  if (bytes.byteLength > MAX_MANUAL_CSV_BYTES) {
    throw new ManualInsuranceCsvError(
      `${fileName}: file is ${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB; the maximum is 5 MB.`
    );
  }
  const hasUtf16Bom =
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff);
  const hasUtf32Bom =
    (bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      bytes[2] === 0xfe &&
      bytes[3] === 0xff) ||
    (bytes[0] === 0xff &&
      bytes[1] === 0xfe &&
      bytes[2] === 0x00 &&
      bytes[3] === 0x00);
  if (hasUtf16Bom || hasUtf32Bom) {
    throw new ManualInsuranceCsvError(
      `${fileName}: only UTF-8 CSV is supported. Save the file as UTF-8 and try again.`
    );
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ManualInsuranceCsvError(
      `${fileName}: file is not valid UTF-8. Save it as UTF-8 CSV and try again.`
    );
  }

  return parseManualInsuranceCsv(fileName, text, columnMapping);
}

export function decodeAndInspectManualCsv(
  fileName: string,
  bytes: Uint8Array
): RawCsvInspection {
  if (bytes.byteLength > MAX_MANUAL_CSV_BYTES) {
    throw new ManualInsuranceCsvError(
      `${fileName}: file is ${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB; the maximum is 5 MB.`
    );
  }
  const hasUtf16Bom =
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff);
  const hasUtf32Bom =
    (bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      bytes[2] === 0xfe &&
      bytes[3] === 0xff) ||
    (bytes[0] === 0xff &&
      bytes[1] === 0xfe &&
      bytes[2] === 0x00 &&
      bytes[3] === 0x00);
  if (hasUtf16Bom || hasUtf32Bom) {
    throw new ManualInsuranceCsvError(
      `${fileName}: only UTF-8 CSV is supported. Save the file as UTF-8 and try again.`
    );
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ManualInsuranceCsvError(
      `${fileName}: file is not valid UTF-8. Save it as UTF-8 CSV and try again.`
    );
  }

  return inspectManualCsv(fileName, text);
}

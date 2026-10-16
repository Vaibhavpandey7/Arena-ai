import { NextRequest, NextResponse } from "next/server";
import {
  getInsuranceBenchmarkDefinition,
  getInsuranceBenchmarkScoringPolicy,
  INSURANCE_BENCHMARKS,
  InsuranceBenchmarkDataError,
  loadInsuranceBenchmark,
} from "@/lib/insurance-benchmarks";
import type { InsuranceBenchmarkRecord } from "@/lib/insurance-benchmarks";
import { getInsuranceBenchmarkPreview } from "@/lib/insurance-benchmarks";
import { toBenchmarkInferenceInput } from "@/lib/benchmark-selection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function matchesSearch(record: InsuranceBenchmarkRecord, search: string): boolean {
  if (!search) return true;
  const query = search.toLocaleLowerCase();
  return [
    record.fullQuestion,
    record.questionStem ?? "",
    ...Object.values(record.options),
  ].some((value) => value.toLocaleLowerCase().includes(query));
}

function filterRecords(
  records: InsuranceBenchmarkRecord[],
  search: string,
  optionsFilter: string
): InsuranceBenchmarkRecord[] {
  return records.filter((record) => {
    if (!matchesSearch(record, search)) return false;
    const hasOptions = Object.keys(record.options).length > 0;
    if (optionsFilter === "with-options" && !hasOptions) return false;
    if (optionsFilter === "without-options" && hasOptions) return false;
    return true;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const benchmarkId = searchParams.get("benchmarkId");

  if (!benchmarkId) {
    return NextResponse.json({ benchmarks: INSURANCE_BENCHMARKS });
  }

  try {
    const definition = getInsuranceBenchmarkDefinition(benchmarkId);
    const records = loadInsuranceBenchmark(definition.id);
    const sampleId = searchParams.get("sampleId");

    if (sampleId) {
      const record = records.find((item) => item.id === sampleId);
      if (!record) {
        return NextResponse.json(
          { error: `${definition.fileName}: sample "${sampleId}" was not found.` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        record: {
          id: record.id,
          benchmarkId: record.benchmarkId,
          sourceRowNumber: record.sourceRowNumber,
          fullQuestion: record.fullQuestion,
          questionStem: record.questionStem,
          options: record.options,
          correctAnswer: record.correctAnswer,
        },
      });
    }

    const search = searchParams.get("search")?.trim() ?? "";
    const optionsFilter = searchParams.get("options") ?? "all";
    if (!["all", "with-options", "without-options"].includes(optionsFilter)) {
      return NextResponse.json(
        { error: 'options must be "all", "with-options", or "without-options".' },
        { status: 400 }
      );
    }

    const matchingRecords = filterRecords(records, search, optionsFilter);
    if (searchParams.get("idsOnly") === "true") {
      return NextResponse.json({
        ids: matchingRecords.map((record) => record.id),
        availableCount: records.length,
        filteredCount: matchingRecords.length,
      });
    }

    const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const parsedPageSize = Number.parseInt(
      searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
      10
    );
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const pageSize = Number.isFinite(parsedPageSize)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsedPageSize))
      : DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;
    const samples = matchingRecords.slice(start, start + pageSize).map((record) => ({
      id: record.id,
      benchmarkId: record.benchmarkId,
      sourceRowNumber: record.sourceRowNumber,
      preview: getInsuranceBenchmarkPreview(record),
      hasOptions: Object.keys(record.options).length > 0,
    }));

    return NextResponse.json({
      benchmark: definition,
      samples,
      availableCount: records.length,
      filteredCount: matchingRecords.length,
      page,
      pageSize,
      pageCount: Math.ceil(matchingRecords.length / pageSize),
    });
  } catch (error) {
    if (error instanceof InsuranceBenchmarkDataError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to load insurance benchmark data:", error);
    return NextResponse.json(
      { error: "Unable to load benchmark data. Check server logs for details." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { benchmarkId?: string; sampleIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (
    typeof body.benchmarkId !== "string" ||
    !Array.isArray(body.sampleIds) ||
    body.sampleIds.length === 0 ||
    body.sampleIds.some((sampleId) => typeof sampleId !== "string")
  ) {
    return NextResponse.json(
      { error: "benchmarkId and a non-empty sampleIds array are required." },
      { status: 400 }
    );
  }

  try {
    const definition = getInsuranceBenchmarkDefinition(body.benchmarkId);
    const records = loadInsuranceBenchmark(definition.id);
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const requestedRecords = body.sampleIds.map((sampleId) => recordsById.get(sampleId));
    const missingIndex = requestedRecords.findIndex((record) => !record);
    if (missingIndex >= 0) {
      return NextResponse.json(
        { error: `${definition.fileName}: sample "${body.sampleIds[missingIndex]}" was not found.` },
        { status: 404 }
      );
    }
    const validRecords = requestedRecords.filter(
      (record): record is InsuranceBenchmarkRecord => Boolean(record)
    );

    return NextResponse.json({
      records: validRecords.map(toBenchmarkInferenceInput),
      evaluation: validRecords.map((record) => ({
        id: record.id,
        options: record.options,
        correctAnswer: record.correctAnswer,
        scoringPolicy: getInsuranceBenchmarkScoringPolicy(
          definition,
          record.sourceRowNumber
        ),
      })),
    });
  } catch (error) {
    if (error instanceof InsuranceBenchmarkDataError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to load insurance benchmark inference inputs:", error);
    return NextResponse.json(
      { error: "Unable to load benchmark inference inputs. Check server logs for details." },
      { status: 500 }
    );
  }
}

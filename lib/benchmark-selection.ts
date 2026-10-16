import type { InsuranceBenchmarkId } from "./insurance-benchmark-registry";

export interface BenchmarkRunAssignment {
  sampleId: string;
  modelId: string;
  modelIndex: number;
}

export interface BenchmarkNavigationSelection {
  benchmarkId: InsuranceBenchmarkId;
  sampleIds?: string[];
}

export interface AppNavigationOptions {
  prompt?: string;
  benchmarkSelection?: BenchmarkNavigationSelection;
}

export function createHeadToHeadBenchmarkNavigation(
  benchmarkId: InsuranceBenchmarkId,
  sampleIds: string[] = []
): {
  tab: "head-to-head";
  options: AppNavigationOptions;
} {
  return {
    tab: "head-to-head",
    options: {
      benchmarkSelection: { benchmarkId, sampleIds: [...sampleIds] },
    },
  };
}

export interface BenchmarkRunConfiguration {
  source: "benchmark" | "manual-upload";
  benchmarkId?: string;
  benchmarkVersion: string;
  uploadFileName?: string;
  selectedSampleIds: string[];
  models: string[];
  sharedPromptConfiguration: {
    inputField: "fullQuestion";
    systemPrompt: null;
    useTools: false;
  };
}

export interface BenchmarkInferenceInput {
  id: string;
  fullQuestion: string;
  questionStem?: string;
}

export function toBenchmarkInferenceInput(record: {
  id: string;
  fullQuestion: string;
  questionStem?: string;
}): BenchmarkInferenceInput {
  return {
    id: record.id,
    fullQuestion: record.fullQuestion,
    ...(record.questionStem ? { questionStem: record.questionStem } : {}),
  };
}

export function toggleBenchmarkSampleSelection(
  selectedIds: string[],
  sampleId: string
): string[] {
  return selectedIds.includes(sampleId)
    ? selectedIds.filter((id) => id !== sampleId)
    : [...selectedIds, sampleId];
}

export function mergeBenchmarkSampleSelection(
  selectedIds: string[],
  sampleIds: string[]
): string[] {
  return Array.from(new Set([...selectedIds, ...sampleIds]));
}

export function resetBenchmarkSelectionForDatasetChange(): string[] {
  return [];
}

export function canRunBenchmarkComparison(
  sampleIds: string[],
  models: string[]
): boolean {
  return sampleIds.length > 0 && models.some((model) => Boolean(model.trim()));
}

export function buildBenchmarkRunAssignments(
  sampleIds: string[],
  models: string[]
): BenchmarkRunAssignment[] {
  return sampleIds.flatMap((sampleId) =>
    models.map((modelId, modelIndex) => ({ sampleId, modelId, modelIndex }))
  );
}

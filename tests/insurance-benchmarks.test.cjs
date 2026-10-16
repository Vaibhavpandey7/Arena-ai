const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const typescript = require("typescript");

require.extensions[".ts"] = (module, fileName) => {
  const source = readFileSync(fileName, "utf8");
  const result = typescript.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
    },
  });
  module._compile(result.outputText, fileName);
};

const {
  INSURANCE_BENCHMARKS,
  getInsuranceBenchmarkDefinition,
  getInsuranceBenchmarkScoringPolicy,
  getInsuranceBenchmarkPreview,
  getInsuranceBenchmarkPrompt,
  loadAllInsuranceBenchmarks,
  loadInsuranceBenchmark,
  parseInsuranceBenchmarkCsv,
} = require("../lib/insurance-benchmarks.ts");
const {
  buildBenchmarkRunAssignments,
  canRunBenchmarkComparison,
  createHeadToHeadBenchmarkNavigation,
  mergeBenchmarkSampleSelection,
  resetBenchmarkSelectionForDatasetChange,
  toBenchmarkInferenceInput,
  toggleBenchmarkSampleSelection,
} = require("../lib/benchmark-selection.ts");
const {
  getInsuranceBenchmarkForCufeCompetency,
} = require("../lib/insurance-benchmark-registry.ts");
const { BENCHMARK_DATASETS } = require("../lib/benchmark-datasets.ts");
const {
  cancelManualInsuranceCsvUpload,
  decodeManualInsuranceCsv,
  ManualInsuranceCsvError,
  MAX_MANUAL_CSV_BYTES,
  MAX_MANUAL_CSV_ROWS,
  parseManualInsuranceCsv,
  removeInvalidManualCsvCase,
} = require("../lib/manual-insurance-csv.ts");
const {
  aggregateReferenceRun,
  evaluateReferenceAnswer,
} = require("../lib/benchmark-eval.ts");

test("loads each registered source CSV and preserves row counts and traceable positions", () => {
  const expectedCounts = {
    "accuracy-rigor": 161,
    "agent-applications": 366,
    "industry-understanding": 573,
    "safety-compliance": 142,
    "theoretical-knowledge": 290,
  };
  const allRecords = loadAllInsuranceBenchmarks();

  assert.equal(INSURANCE_BENCHMARKS.length, 5);
  assert.equal(allRecords.length, 1532);
  for (const [benchmarkId, expectedCount] of Object.entries(expectedCounts)) {
    const records = loadInsuranceBenchmark(benchmarkId);
    assert.equal(records.length, expectedCount);
    assert.equal(records[0].sourceRowNumber, 2);
    assert.equal(records[0].benchmarkId, benchmarkId);
    assert.equal(records[0].id, `${benchmarkId}-row-2`);
    assert.ok(records[0].fullQuestion);
    assert.ok(records[0].correctAnswer);
  }
});

test("omits empty option cells and keeps non-empty option values", () => {
  const [record] = parseInsuranceBenchmarkCsv(
    "theoretical-knowledge",
    "full question,correct answer,A,B,C,D,E\nquestion,answer, yes ,,,,\n",
    "options.csv"
  );

  assert.deepEqual(record.options, { A: "yes" });
});

test("parses commas, embedded newlines, and Unicode without altering full model input", () => {
  const [record] = parseInsuranceBenchmarkCsv(
    "accuracy-rigor",
    'full question,Question stem,correct answer\n"Question, 第一行\n第二行",Short preview,Reference\n',
    "multiline.csv"
  );

  assert.equal(record.fullQuestion, "Question, 第一行\n第二行");
  assert.equal(getInsuranceBenchmarkPreview(record), "Short preview");
  assert.equal(getInsuranceBenchmarkPrompt(record), record.fullQuestion);
  assert.ok(!getInsuranceBenchmarkPrompt(record).includes(record.correctAnswer));
  assert.equal(record.correctAnswer, "Reference");
});

test("derives a short preview when the optional question stem is empty", () => {
  const [record] = parseInsuranceBenchmarkCsv(
    "industry-understanding",
    'full question,Question stem,correct answer\n"First line,\nsecond line",,Reference\n',
    "preview.csv"
  );

  assert.equal(getInsuranceBenchmarkPreview(record), "First line, second line");
  assert.equal(getInsuranceBenchmarkPrompt(record), "First line,\nsecond line");
});

test("reports malformed required headers with the source filename and header row", () => {
  assert.throws(
    () =>
      parseInsuranceBenchmarkCsv(
        "accuracy-rigor",
        "question,answer\nvalue,value\n",
        "bad-header.csv"
      ),
    /bad-header\.csv: row 1 is missing required columns "full question", "correct answer"/
  );
});

test("reports empty required fields with the source filename and record row", () => {
  assert.throws(
    () =>
      parseInsuranceBenchmarkCsv(
        "safety-compliance",
        "full question,correct answer\n,reference\n",
        "empty-question.csv"
      ),
    /empty-question\.csv: row 2 has an empty required "full question" value/
  );

  assert.throws(
    () =>
      parseInsuranceBenchmarkCsv(
        "safety-compliance",
        "full question,correct answer\nquestion, \n",
        "empty-answer.csv"
      ),
    /empty-answer\.csv: row 2 has an empty required "correct answer" value/
  );
});

test("uses stable IDs derived from benchmark ID and CSV record number", () => {
  const csv = "full question,correct answer\none,answer\ntwo,answer\n";
  const firstLoad = parseInsuranceBenchmarkCsv("agent-applications", csv);
  const secondLoad = parseInsuranceBenchmarkCsv("agent-applications", csv);

  assert.deepEqual(
    firstLoad.map((record) => record.id),
    ["agent-applications-row-2", "agent-applications-row-3"]
  );
  assert.deepEqual(
    firstLoad.map((record) => record.id),
    secondLoad.map((record) => record.id)
  );
});

test("rejects unknown benchmark IDs with an actionable diagnostic", () => {
  assert.throws(
    () => getInsuranceBenchmarkDefinition("not-a-benchmark"),
    /Unknown insurance benchmark ID "not-a-benchmark"/
  );
});

test("uses explicit row-range scoring overrides before the dataset policy", () => {
  const definition = {
    scoringPolicy: { type: "auto" },
    scoringOverrides: [
      {
        firstSourceRow: 5,
        lastSourceRow: 8,
        policy: { type: "numeric", absoluteTolerance: 0.5 },
      },
    ],
  };
  assert.deepEqual(getInsuranceBenchmarkScoringPolicy(definition, 6), {
    type: "numeric",
    absoluteTolerance: 0.5,
  });
  assert.deepEqual(getInsuranceBenchmarkScoringPolicy(definition, 9), {
    type: "auto",
  });
});

test("maps all five CUFE competency dimensions to registered local CSV groups", () => {
  const expectedMappings = {
    theory: "theoretical-knowledge",
    industry: "industry-understanding",
    compliance: "safety-compliance",
    agent: "agent-applications",
    rigor: "accuracy-rigor",
  };
  for (const [competency, benchmarkId] of Object.entries(expectedMappings)) {
    assert.equal(
      getInsuranceBenchmarkForCufeCompetency(competency).id,
      benchmarkId
    );
  }
});

test("creates an explicit Head-to-Head navigation selection without prompt encoding", () => {
  assert.deepEqual(
    createHeadToHeadBenchmarkNavigation("safety-compliance", ["safety-compliance-row-2"]),
    {
      tab: "head-to-head",
      options: {
        benchmarkSelection: {
          benchmarkId: "safety-compliance",
          sampleIds: ["safety-compliance-row-2"],
        },
      },
    }
  );
  assert.deepEqual(
    createHeadToHeadBenchmarkNavigation("accuracy-rigor").options.benchmarkSelection,
    { benchmarkId: "accuracy-rigor", sampleIds: [] }
  );
});

test("preserves the published CUFE scores and all academic benchmark tabs", () => {
  assert.deepEqual(
    BENCHMARK_DATASETS.CUFE.leaderboard.slice(0, 3).map(({ model, score }) => ({ model, score })),
    [
      { model: "Gemini-3.1-Pro-Preview", score: 87.36 },
      { model: "AntGroup Finix-S1", score: 87.23 },
      { model: "Doubao-Seed-2.0-Lite", score: 86.46 },
    ]
  );
  assert.deepEqual(Object.keys(BENCHMARK_DATASETS), [
    "INS-MMBench",
    "CUFE",
    "InsuranceQA",
    "INS-ActBench",
  ]);
});

test("sample selection toggles rows and reports a consistent selected count", () => {
  const selected = toggleBenchmarkSampleSelection([], "accuracy-rigor-row-2");
  assert.deepEqual(selected, ["accuracy-rigor-row-2"]);
  assert.deepEqual(
    toggleBenchmarkSampleSelection(selected, "accuracy-rigor-row-2"),
    []
  );
  assert.deepEqual(
    mergeBenchmarkSampleSelection(selected, [
      "accuracy-rigor-row-2",
      "accuracy-rigor-row-3",
    ]),
    ["accuracy-rigor-row-2", "accuracy-rigor-row-3"]
  );
});

test("changing benchmark datasets clears prior sample selections", () => {
  assert.deepEqual(resetBenchmarkSelectionForDatasetChange(), []);
});

test("assigns every selected sample to every selected model", () => {
  assert.deepEqual(
    buildBenchmarkRunAssignments(
      ["sample-1", "sample-2"],
      ["model-a", "model-b"]
    ),
    [
      { sampleId: "sample-1", modelId: "model-a", modelIndex: 0 },
      { sampleId: "sample-1", modelId: "model-b", modelIndex: 1 },
      { sampleId: "sample-2", modelId: "model-a", modelIndex: 0 },
      { sampleId: "sample-2", modelId: "model-b", modelIndex: 1 },
    ]
  );
});

test("does not allow benchmark runs without samples or models", () => {
  assert.equal(canRunBenchmarkComparison([], ["model-a"]), false);
  assert.equal(canRunBenchmarkComparison(["sample-1"], []), false);
  assert.equal(canRunBenchmarkComparison(["sample-1"], ["model-a"]), true);
});

test("keeps reference answers out of returned inference inputs", () => {
  const input = toBenchmarkInferenceInput({
    id: "sample-1",
    fullQuestion: "Question sent to the model",
    questionStem: "Preview only",
    correctAnswer: "Reference that must not be sent",
  });

  assert.deepEqual(input, {
    id: "sample-1",
    fullQuestion: "Question sent to the model",
    questionStem: "Preview only",
  });
  assert.equal("correctAnswer" in input, false);
});

test("accepts free-form and option-only question rows with optional headers", () => {
  const report = parseManualInsuranceCsv(
    "manual.csv",
    "full question,correct answer,A,B,C,D,E\nfree-form question,reference,,,,,\nchoice question,choice reference,yes,no,,,\n"
  );
  assert.equal(report.validCount, 2);
  assert.equal(Object.keys(report.cases[0].options).length, 0);
  assert.deepEqual(report.cases[1].options, { A: "yes", B: "no" });
});

test("accepts a missing optional stem and empty option cells", () => {
  const report = parseManualInsuranceCsv(
    "minimal.csv",
    "full question,correct answer,A,B,C,D,E\nquestion,reference,,B,,,\n"
  );
  assert.equal(report.validCount, 1);
  assert.equal(report.cases[0].questionStem, undefined);
  assert.deepEqual(report.cases[0].options, { B: "B" });
});

test("marks missing gold answers as invalid instead of silently dropping rows", () => {
  const report = parseManualInsuranceCsv(
    "missing-gold.csv",
    "full question,correct answer\nquestion,\n"
  );
  assert.equal(report.rowCount, 1);
  assert.equal(report.invalidCount, 1);
  assert.deepEqual(report.cases[0].errors, ["correct answer is empty"]);
  assert.equal(removeInvalidManualCsvCase(report.cases, report.cases[0].id).length, 0);
});

test("reports blank and wrong-width records for explicit removal", () => {
  const report = parseManualInsuranceCsv(
    "bad-rows.csv",
    "full question,correct answer\nquestion,answer\n\nquestion,answer,extra\n"
  );
  assert.equal(report.rowCount, 3);
  assert.equal(report.invalidCount, 2);
  assert.match(report.cases[1].errors.join(" "), /fields; expected 2/);
  assert.match(report.cases[2].errors.join(" "), /fields; expected 2/);
});

test("rejects malformed CSV quoting with a file-specific parser diagnostic", () => {
  assert.throws(
    () =>
      parseManualInsuranceCsv(
        "malformed.csv",
        'full question,correct answer\n"unterminated question,reference\n'
      ),
    /malformed\.csv: malformed CSV/
  );
});

test("rejects empty files and header-only files", () => {
  assert.throws(
    () => parseManualInsuranceCsv("empty.csv", ""),
    /empty\.csv: the CSV file is empty/
  );
  assert.throws(
    () =>
      parseManualInsuranceCsv(
        "header-only.csv",
        "full question,correct answer\n"
      ),
    /header-only\.csv: no data rows were found/
  );
});

test("rejects oversized uploads, invalid UTF-8, and excessive row counts", () => {
  assert.throws(
    () =>
      decodeManualInsuranceCsv(
        "large.csv",
        new Uint8Array(MAX_MANUAL_CSV_BYTES + 1)
      ),
    /large\.csv: file is .* maximum is 5 MB/
  );
  assert.throws(
    () => decodeManualInsuranceCsv("encoding.csv", new Uint8Array([0xff, 0xfe])),
    /encoding\.csv: only UTF-8 CSV is supported/
  );
  assert.throws(
    () =>
      decodeManualInsuranceCsv(
        "invalid-utf8.csv",
        new Uint8Array([0x66, 0x80])
      ),
    /invalid-utf8\.csv: file is not valid UTF-8/
  );

  const tooManyRows = [
    "full question,correct answer",
    ...Array.from(
      { length: MAX_MANUAL_CSV_ROWS + 1 },
      (_, index) => `question-${index},answer-${index}`
    ),
  ].join("\n");
  assert.throws(
    () => parseManualInsuranceCsv("too-many.csv", tooManyRows),
    /too-many\.csv: contains 501 data rows; the maximum is 500/
  );
});

test("normalizes categorical exact matches for casing and surrounding whitespace", () => {
  const result = evaluateReferenceAnswer("  YES  ", "yes");
  assert.equal(result.taskType, "categorical");
  assert.equal(result.available, true);
  assert.equal(result.correct, true);
});

test("applies numeric absolute tolerance inclusively and reports MAE", () => {
  const result = evaluateReferenceAnswer(
    "The result is $102.",
    "$100",
    {},
    { type: "numeric", absoluteTolerance: 2 }
  );
  assert.equal(result.available, true);
  assert.equal(result.correct, true);
  assert.equal(result.absoluteError, 2);
  assert.equal(result.unit, "usd");

  const outsideBoundary = evaluateReferenceAnswer(
    "102.01 USD",
    "100 USD",
    {},
    { type: "numeric", absoluteTolerance: 2 }
  );
  assert.equal(outsideBoundary.correct, false);

  const scaled = evaluateReferenceAnswer(
    "2,000,000 USD",
    "2 million USD"
  );
  assert.equal(scaled.available, true);
  assert.equal(scaled.correct, true);

  const convertedUnits = evaluateReferenceAnswer("5 m", "500 cm");
  assert.equal(convertedUnits.available, true);
  assert.equal(convertedUnits.correct, true);
  assert.equal(convertedUnits.unit, "m");

  const relativeTolerance = evaluateReferenceAnswer(
    "101",
    "100",
    {},
    { type: "numeric", relativeTolerance: 0.01 }
  );
  assert.equal(relativeTolerance.correct, true);
});

test("maps multiple-choice values only when the answer is unambiguous", () => {
  const options = { A: "Liability", B: "Collision", C: "Comprehensive" };
  assert.equal(
    evaluateReferenceAnswer("The answer is B.", "Collision", options).correct,
    true
  );
  assert.equal(
    evaluateReferenceAnswer("Comprehensive", "C", options).correct,
    true
  );
  assert.equal(
    evaluateReferenceAnswer("Answer: A or B", "A", options).available,
    false
  );
  assert.equal(
    evaluateReferenceAnswer("same", "same", { A: "same", B: "same" }).available,
    false
  );
});

test("keeps long free-form token metrics lexical and bounded by token counts", () => {
  const reference = Array.from({ length: 1200 }, (_, index) => `term${index}`).join(" ");
  const result = evaluateReferenceAnswer(reference, reference);
  assert.equal(result.taskType, "free-form");
  assert.match(result.metricName, /lexical diagnostic/);
  assert.equal(result.tokenPrecision, 1);
  assert.equal(result.tokenRecall, 1);
  assert.equal(result.tokenF1, 1);
});

test("reports missing labels and incompatible numeric units as unavailable", () => {
  assert.equal(
    evaluateReferenceAnswer("an answer", undefined).reason,
    "The sample has no reference answer."
  );
  const incompatible = evaluateReferenceAnswer("50%", "50 USD");
  assert.equal(incompatible.available, false);
  assert.match(incompatible.reason, /units/);
});

test("separates incompatible task types in aggregate metrics", () => {
  const aggregate = aggregateReferenceRun([
    { sampleId: "label", reference: "yes", response: "yes", status: "success" },
    { sampleId: "number", reference: "10", response: "11", status: "success" },
  ]);
  assert.equal(aggregate.evaluatedCount, 2);
  assert.equal(aggregate.groups.length, 2);
  assert.deepEqual(
    aggregate.groups.map((group) => group.taskType).sort(),
    ["categorical", "numeric"]
  );
});

test("does not merge numeric accuracy groups that use different tolerances", () => {
  const aggregate = aggregateReferenceRun([
    {
      sampleId: "strict",
      reference: "10",
      response: "11",
      status: "success",
      policy: { type: "numeric", absoluteTolerance: 0 },
    },
    {
      sampleId: "lenient",
      reference: "10",
      response: "11",
      status: "success",
      policy: { type: "numeric", absoluteTolerance: 1 },
    },
  ]);
  assert.equal(aggregate.groups.length, 2);
  assert.deepEqual(
    aggregate.groups.map((group) => group.accuracy).sort(),
    [0, 1]
  );
});

test("keeps failed model requests out of accuracy denominators", () => {
  const aggregate = aggregateReferenceRun([
    { sampleId: "failed", reference: "yes", response: "[Error: unavailable]", status: "failed" },
    { sampleId: "scored", reference: "yes", response: "no", status: "success" },
  ]);
  assert.equal(aggregate.selectedCount, 2);
  assert.equal(aggregate.failedCount, 1);
  assert.equal(aggregate.evaluatedCount, 1);
  assert.equal(aggregate.skippedCount, 0);
  assert.equal(aggregate.groups[0].denominator, 1);
  assert.equal(aggregate.groups[0].incorrectCount, 1);
});

test("reports missing metrics as unscored and keeps cancelled samples skipped", () => {
  const aggregate = aggregateReferenceRun([
    {
      sampleId: "no-reference",
      response: "answer",
      status: "success",
    },
    {
      sampleId: "cancelled",
      reference: "yes",
      response: "",
      status: "cancelled",
    },
    {
      sampleId: "scored",
      reference: "yes",
      response: "yes",
      status: "success",
    },
  ]);
  assert.equal(aggregate.selectedCount, 3);
  assert.equal(aggregate.completedCount, 2);
  assert.equal(aggregate.evaluatedCount, 1);
  assert.equal(aggregate.unscoredCount, 1);
  assert.equal(aggregate.skippedCount, 1);
  assert.equal(aggregate.groups[0].sampleIds.join(","), "scored");
});

test("returns zeroed counts and no fabricated metrics for empty result sets", () => {
  assert.deepEqual(aggregateReferenceRun([]), {
    selectedCount: 0,
    completedCount: 0,
    evaluatedCount: 0,
    unscoredCount: 0,
    skippedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    groups: [],
  });

  const pending = aggregateReferenceRun([], 3, 3);
  assert.equal(pending.selectedCount, 3);
  assert.equal(pending.pendingCount, 3);
  assert.equal(pending.skippedCount, 0);
  assert.deepEqual(pending.groups, []);
});

test("cancelling an upload clears staged rows, and valid rows cannot be removed as invalid", () => {
  const report = parseManualInsuranceCsv(
    "cancel.csv",
    "full question,correct answer\nquestion,answer\n"
  );
  const validRow = report.cases[0];
  assert.equal(removeInvalidManualCsvCase(report.cases, validRow.id), report.cases);
  assert.deepEqual(cancelManualInsuranceCsvUpload(), []);
});

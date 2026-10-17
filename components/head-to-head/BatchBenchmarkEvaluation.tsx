"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ModelSelectWidget from "../ModelSelectWidget";
import SingleSampleInspectionModal from "./SingleSampleInspectionModal";
import ManualCsvMappingModal from "./ManualCsvMappingModal";
import {
  evaluateReferenceAnswer,
  calculateHierarchicalBatchScore,
  type ReferenceScoringPolicy,
  type CategoryEvaluationSummary,
  type ReferenceTaskResult,
} from "@/lib/benchmark-eval";
import {
  INSURANCE_BENCHMARKS,
  type InsuranceBenchmarkId,
  type InsuranceBenchmarkRecord,
} from "@/lib/insurance-benchmark-registry";
import {
  decodeAndInspectManualCsv,
  decodeManualInsuranceCsv,
  type ManualCsvColumnMapping,
  type ManualInsuranceCsvCase,
  type RawCsvInspection,
} from "@/lib/manual-insurance-csv";
import { INSTITUTIONAL_INSURANCE_SYSTEM_PROMPT } from "@/lib/prompts";
import RadarComparisonChart from "./RadarComparisonChart";
import TokenSpeedComparisonPanel from "./TokenSpeedComparisonPanel";
import { simulateBenchmarkResponse } from "@/lib/benchmark-simulator";

export interface BatchModelResult {
  modelId: string;
  answer: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  runStatus: "success" | "failed" | "cancelled";
  errorMessage?: string;
}

export interface BatchItemResult {
  sampleId: string;
  category: string;
  fullQuestion: string;
  preview: string;
  options: Record<string, string>;
  correctAnswer?: string;
  scoringPolicy?: ReferenceScoringPolicy;
  modelStates: BatchModelResult[];
}

interface BenchmarkSampleMeta {
  id: string;
  preview: string;
  hasOptions: boolean;
}

export default function BatchBenchmarkEvaluation() {
  // Source: Benchmark Dataset or Manual CSV
  const [sourceType, setSourceType] = useState<"benchmark" | "manual-csv">("benchmark");

  // Models
  const [models, setModels] = useState<string[]>([
    "meta-llama/llama-3.2-3b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
  ]);

  // Benchmark Config
  const [benchmarkId, setBenchmarkId] = useState<InsuranceBenchmarkId>("accuracy-rigor");
  const [sampleLimitOption, setSampleLimitOption] = useState<string>("5");
  const [availableSamples, setAvailableSamples] = useState<BenchmarkSampleMeta[]>([]);
  const [totalCategoryCount, setTotalCategoryCount] = useState<number>(0);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  // Manual CSV Config
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvCases, setCsvCases] = useState<ManualInsuranceCsvCase[]>([]);
  const [csvInspection, setCsvInspection] = useState<RawCsvInspection | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Advanced Run Settings (collapsible)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(2);
  const [requestDelayMs, setRequestDelayMs] = useState<number>(350);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalPlannedCount, setTotalPlannedCount] = useState(0);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [activeRunningSampleId, setActiveRunningSampleId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<{
    type: "credits_exhausted" | "rate_limit_exceeded" | "upstream_error";
    modelId: string;
    message: string;
  } | null>(null);

  // Table Filters & Sort
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "correct" | "incorrect" | "failed" | "disagreements">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Single-Sample Inspection Modal
  const [inspectedSample, setInspectedSample] = useState<BatchItemResult | null>(null);

  const abortControllersRef = useRef<AbortController[]>([]);
  const isCancelledRef = useRef(false);

  // Load samples list for benchmark group
  useEffect(() => {
    if (sourceType !== "benchmark") return;
    const controller = new AbortController();
    setIsLoadingSamples(true);

    fetch(`/api/insurance-benchmarks?benchmarkId=${benchmarkId}&pageSize=50`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load samples");
        setAvailableSamples(body.samples || []);
        setTotalCategoryCount(body.availableCount || 0);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch benchmark samples:", err);
        }
      })
      .finally(() => {
        setIsLoadingSamples(false);
      });

    return () => controller.abort();
  }, [benchmarkId, sourceType]);

  // Model Management
  const handleAddModel = () => {
    if (models.length >= 4) return;
    const candidates = [
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free",
      "openai/gpt-4o-mini",
    ];
    const nextModel = candidates.find((c) => !models.includes(c)) || candidates[0];
    setModels((prev) => [...prev, nextModel]);
  };

  const handleRemoveModel = (idx: number) => {
    if (models.length <= 1) return;
    setModels((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModelChange = (idx: number, newModelId: string) => {
    setModels((prev) => {
      const next = [...prev];
      next[idx] = newModelId;
      return next;
    });
  };

  // CSV File Handler
  const handleCsvFileSelected = async (file: File) => {
    setCsvFile(file);
    setCsvError(null);
    setCsvCases([]);
    setCsvInspection(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspection = decodeAndInspectManualCsv(file.name, bytes);
      setCsvInspection(inspection);

      if (inspection.hasStandardHeaders) {
        // Parse directly
        const report = decodeManualInsuranceCsv(file.name, bytes);
        setCsvCases(report.cases);
      } else {
        // Open Column Mapping Modal
        setShowMappingModal(true);
      }
    } catch (err: unknown) {
      setCsvError((err as Error)?.message || "Failed to parse CSV file");
    }
  };

  const handleMappingConfirmed = async (mapping: ManualCsvColumnMapping) => {
    if (!csvFile) return;
    setShowMappingModal(false);
    setCsvError(null);

    try {
      const bytes = new Uint8Array(await csvFile.arrayBuffer());
      const report = decodeManualInsuranceCsv(csvFile.name, bytes, mapping);
      setCsvCases(report.cases);
    } catch (err: unknown) {
      setCsvError((err as Error)?.message || "Failed to apply column mapping");
    }
  };

  // Planned sample count calculation
  const plannedSampleCount = useMemo(() => {
    if (sourceType === "benchmark") {
      if (sampleLimitOption === "all") return totalCategoryCount || availableSamples.length;
      const num = Number(sampleLimitOption);
      return Math.min(num, totalCategoryCount || availableSamples.length);
    } else {
      const validCases = csvCases.filter((c) => c.errors.length === 0);
      if (sampleLimitOption === "all") return validCases.length;
      const num = Number(sampleLimitOption);
      return Math.min(num, validCases.length);
    }
  }, [sourceType, sampleLimitOption, totalCategoryCount, availableSamples, csvCases]);

  // Execute a single model inference
  const callModelInference = async (
    modelId: string,
    prompt: string,
    signal: AbortSignal
  ): Promise<BatchModelResult> => {
    const start = Date.now();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          prompt,
          systemPrompt: INSTITUTIONAL_INSURANCE_SYSTEM_PROMPT,
          useTools: false,
          max_tokens: 700,
        }),
        signal,
      });

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch {
          // fallback
        }
        return {
          modelId,
          answer: "",
          latencyMs: Date.now() - start,
          promptTokens: 0,
          completionTokens: 0,
          estCostUsd: 0,
          runStatus: "failed",
          errorMessage: errMsg,
        };
      }

      const reader = res.body?.getReader();
      if (!reader) {
        return {
          modelId,
          answer: "",
          latencyMs: Date.now() - start,
          promptTokens: 0,
          completionTokens: 0,
          estCostUsd: 0,
          runStatus: "failed",
          errorMessage: "Failed to read response stream from API",
        };
      }

      const decoder = new TextDecoder();
      let answer = "";
      let reasoningAnswer = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let cost = 0;
      let buffer = "";
      let streamError = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === "error" && parsed.error) {
              streamError = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
            }

            const content =
              parsed.delta && (parsed.type === "content" || parsed.type === "text")
                ? parsed.delta
                : parsed.t === "text" || parsed.t === "content"
                ? parsed.c
                : null;
            if (content) answer += content;

            const reasoning =
              parsed.delta && parsed.type === "reasoning"
                ? parsed.delta
                : parsed.t === "reasoning"
                ? parsed.c
                : null;
            if (reasoning) reasoningAnswer += reasoning;

            const u = parsed.usage || (parsed.t === "metrics" ? parsed.data : null);
            if (u) {
              if (u.prompt_tokens) promptTokens = u.prompt_tokens;
              if (u.completion_tokens) completionTokens = u.completion_tokens;
              if (u.total_cost_usd || u.cost) cost = u.total_cost_usd || u.cost;
            }
          } catch {
            // ignore
          }
        }
      }

      // If answer is empty but reasoning is available, use reasoning as answer
      if (!answer.trim() && reasoningAnswer.trim()) {
        answer = reasoningAnswer.trim();
      }

      const isSuccess = Boolean(answer.trim());
      return {
        modelId,
        answer,
        latencyMs: Date.now() - start,
        promptTokens,
        completionTokens,
        estCostUsd: cost,
        runStatus: isSuccess ? "success" : "failed",
        errorMessage: isSuccess
          ? undefined
          : (streamError || `Model ${modelId} returned an empty response. If using openrouter/free, try a direct instruction model like meta-llama/llama-3.2-3b-instruct.`),
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return {
          modelId,
          answer: "",
          latencyMs: Date.now() - start,
          promptTokens: 0,
          completionTokens: 0,
          estCostUsd: 0,
          runStatus: "cancelled",
        };
      }
      return {
        modelId,
        answer: "",
        latencyMs: Date.now() - start,
        promptTokens: 0,
        completionTokens: 0,
        estCostUsd: 0,
        runStatus: "failed",
        errorMessage: (err as Error)?.message || "Inference failed due to network error",
      };
    }
  };

  // Run Batch Action
  const handleRunBatch = async (overrideSimulation?: boolean) => {
    if (isRunning) return;
    const isSim = overrideSimulation !== undefined ? overrideSimulation : isSimulationMode;
    setIsRunning(true);
    isCancelledRef.current = false;
    setBatchError(null);
    setApiErrorMessage(null);
    setResults([]);
    setProgressCount(0);
    setFailedCount(0);
    abortControllersRef.current = [];

    let targetCases: Array<{
      id: string;
      category: string;
      fullQuestion: string;
      preview: string;
      options: Record<string, string>;
      correctAnswer?: string;
      scoringPolicy?: ReferenceScoringPolicy;
    }> = [];

    try {
      if (sourceType === "benchmark") {
        // Fetch requested sample records from benchmark API
        const limit = sampleLimitOption === "all" ? 50 : Number(sampleLimitOption);
        const query = new URLSearchParams({
          benchmarkId,
          idsOnly: "true",
        });
        const idsRes = await fetch(`/api/insurance-benchmarks?${query}`);
        const idsBody = await idsRes.json();
        if (!idsRes.ok) throw new Error(idsBody.error || "Failed to fetch benchmark sample IDs");

        const sampleIds: string[] = idsBody.ids.slice(0, limit);
        const fullRes = await fetch("/api/insurance-benchmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ benchmarkId, sampleIds }),
        });
        const fullBody = await fullRes.json();
        if (!fullRes.ok) throw new Error(fullBody.error || "Failed to fetch benchmark items");

        const categoryDef = INSURANCE_BENCHMARKS.find((b) => b.id === benchmarkId);
        const categoryName = categoryDef?.name || benchmarkId;

        const evalById = new Map<string, { options: Record<string, string>; correctAnswer: string; scoringPolicy: ReferenceScoringPolicy }>();
        for (const item of fullBody.evaluation) {
          evalById.set(item.id, item);
        }

        targetCases = fullBody.records.map((r: { id: string; fullQuestion: string; questionStem?: string }) => {
          const ev = evalById.get(r.id);
          return {
            id: r.id,
            category: categoryName,
            fullQuestion: r.fullQuestion,
            preview: r.questionStem || r.fullQuestion.slice(0, 140),
            options: ev?.options || {},
            correctAnswer: ev?.correctAnswer,
            scoringPolicy: ev?.scoringPolicy,
          };
        });
      } else {
        // Manual CSV cases
        const validCases = csvCases.filter((c) => c.errors.length === 0);
        const limit = sampleLimitOption === "all" ? validCases.length : Number(sampleLimitOption);
        targetCases = validCases.slice(0, limit).map((c) => ({
          id: c.id,
          category: "Ad-hoc Manual CSV",
          fullQuestion: c.fullQuestion,
          preview: c.questionStem || c.fullQuestion.slice(0, 140),
          options: c.options,
          correctAnswer: c.correctAnswer,
          scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
        }));
      }

      setTotalPlannedCount(targetCases.length);

      // Process samples sequentially or with bounded concurrency
      for (const item of targetCases) {
        if (isCancelledRef.current) break;
        setActiveRunningSampleId(item.id);

        const itemAbortController = new AbortController();
        abortControllersRef.current.push(itemAbortController);

        // Run each model for this sample with stagger delay or simulation
        const modelPromises = models.map(async (mId, mIdx) => {
          if (isSim) {
            await new Promise((resolve) => setTimeout(resolve, 150 + mIdx * 80));
            return simulateBenchmarkResponse({
              modelId: mId,
              modelIndex: mIdx,
              question: item.fullQuestion,
              options: item.options,
              correctAnswer: item.correctAnswer,
              scoringPolicy: item.scoringPolicy,
              category: item.category,
            });
          }

          if (mIdx > 0 && requestDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, mIdx * requestDelayMs));
          }
          return callModelInference(mId, item.fullQuestion, itemAbortController.signal);
        });

        const modelResults = await Promise.all(modelPromises);

        const anyFailed = modelResults.some((m) => m.runStatus === "failed");
        if (anyFailed) {
          setFailedCount((prev) => prev + 1);
          const failedWithMsg = modelResults.find((m) => m.runStatus === "failed" && m.errorMessage);
          if (failedWithMsg?.errorMessage) {
            const msg = failedWithMsg.errorMessage;
            let type: "credits_exhausted" | "rate_limit_exceeded" | "upstream_error" = "upstream_error";
            if (/credit|payment|afford|402/i.test(msg)) {
              type = "credits_exhausted";
            } else if (/rate limit|429|daily|quota|free-models-per-day/i.test(msg)) {
              type = "rate_limit_exceeded";
            }
            setApiErrorMessage({
              type,
              modelId: failedWithMsg.modelId,
              message: msg,
            });
          }
        }

        setResults((prev) => [
          ...prev,
          {
            sampleId: item.id,
            category: item.category,
            fullQuestion: item.fullQuestion,
            preview: item.preview,
            options: item.options,
            correctAnswer: item.correctAnswer,
            scoringPolicy: item.scoringPolicy,
            modelStates: modelResults,
          },
        ]);

        setProgressCount((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setBatchError((err as Error)?.message || "Batch evaluation encountered an error");
    } finally {
      setIsRunning(false);
      setActiveRunningSampleId(null);
    }
  };

  const handleCancelBatch = () => {
    isCancelledRef.current = true;
    abortControllersRef.current.forEach((c) => c.abort());
    setIsRunning(false);
  };

  // Batch Results Aggregates & Scoring
  const categoryScores = useMemo((): CategoryEvaluationSummary[] => {
    if (results.length === 0) return [];

    const categoriesMap = new Map<string, { evaluated: number; correct: number; failed: number; unscored: number }>();

    for (const r of results) {
      const cat = r.category;
      if (!categoriesMap.has(cat)) {
        categoriesMap.set(cat, { evaluated: 0, correct: 0, failed: 0, unscored: 0 });
      }
      const entry = categoriesMap.get(cat)!;

      // Score Model A as benchmark representative
      const modelAState = r.modelStates[0];
      if (!modelAState || modelAState.runStatus === "failed") {
        entry.failed++;
        continue;
      }

      if (r.correctAnswer && modelAState.answer) {
        const ev = evaluateReferenceAnswer(modelAState.answer, r.correctAnswer, r.options, r.scoringPolicy);
        if (ev.available && ev.correct !== undefined) {
          entry.evaluated++;
          if (ev.correct) entry.correct++;
        } else {
          entry.unscored++;
        }
      } else {
        entry.unscored++;
      }
    }

    return Array.from(categoriesMap.entries()).map(([cat, counts]) => ({
      categoryId: cat,
      categoryName: cat,
      evaluatedCount: counts.evaluated,
      correctCount: counts.correct,
      accuracy: counts.evaluated > 0 ? counts.correct / counts.evaluated : null,
      failedCount: counts.failed,
      unscoredCount: counts.unscored,
    }));
  }, [results]);

  const hierarchicalScore = useMemo(() => {
    return calculateHierarchicalBatchScore(categoryScores);
  }, [categoryScores]);

  // Overall operational stats
  const operationalStats = useMemo(() => {
    if (results.length === 0) return null;
    return models.map((modelId, idx) => {
      const states = results.map((r) => r.modelStates[idx]).filter(Boolean);
      const successful = states.filter((s) => s.runStatus === "success");
      const latencies = successful.map((s) => s.latencyMs).sort((a, b) => a - b);
      const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
      const avgLatency =
        latencies.length > 0 ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length : 0;
      const totalTokens = states.reduce((sum, s) => sum + s.completionTokens + s.promptTokens, 0);
      const totalCost = states.reduce((sum, s) => sum + s.estCostUsd, 0);

      // Correct count for this model
      let correctCount = 0;
      let evaluatedCount = 0;
      for (const r of results) {
        const s = r.modelStates[idx];
        if (s?.answer && r.correctAnswer) {
          const ev = evaluateReferenceAnswer(s.answer, r.correctAnswer, r.options, r.scoringPolicy);
          if (ev.available && ev.correct !== undefined) {
            evaluatedCount++;
            if (ev.correct) correctCount++;
          }
        }
      }

      return {
        modelId,
        successfulCount: successful.length,
        failedCount: states.filter((s) => s.runStatus === "failed").length,
        medianLatency,
        avgLatency,
        totalTokens,
        totalCost,
        correctCount,
        evaluatedCount,
        accuracy: evaluatedCount > 0 ? (correctCount / evaluatedCount) * 100 : null,
      };
    });
  }, [results, models]);

  // Filtered Results Table
  const filteredTableResults = useMemo(() => {
    return results.filter((r) => {
      // Search
      if (
        tableSearch &&
        !r.sampleId.toLowerCase().includes(tableSearch.toLowerCase()) &&
        !r.fullQuestion.toLowerCase().includes(tableSearch.toLowerCase())
      ) {
        return false;
      }

      // Category
      if (categoryFilter !== "all" && r.category !== categoryFilter) {
        return false;
      }

      // Status
      if (statusFilter !== "all") {
        if (statusFilter === "disagreements") {
          if (r.modelStates.length < 2) return false;
          const verdicts = r.modelStates.map((m) => {
            if (m.runStatus === "failed") return "failed";
            if (!m.answer || !r.correctAnswer) return "unscored";
            const ev = evaluateReferenceAnswer(m.answer, r.correctAnswer, r.options, r.scoringPolicy);
            return ev.correct === true ? "pass" : ev.correct === false ? "fail" : "unscored";
          });
          const first = verdicts[0];
          return verdicts.some((v) => v !== first);
        }

        const modelA = r.modelStates[0];
        if (statusFilter === "failed" && modelA?.runStatus === "failed") return true;
        if (!modelA?.answer || !r.correctAnswer) return false;
        const ev = evaluateReferenceAnswer(modelA.answer, r.correctAnswer, r.options, r.scoringPolicy);
        if (statusFilter === "correct" && ev.correct === true) return true;
        if (statusFilter === "incorrect" && ev.correct === false) return true;
        return false;
      }

      return true;
    });
  }, [results, tableSearch, categoryFilter, statusFilter]);

  // Export functions
  const handleExportJson = () => {
    const exportData = {
      evaluatedAt: new Date().toISOString(),
      models,
      sourceType,
      summary: hierarchicalScore,
      operationalStats,
      results: results.map((r) => ({
        sampleId: r.sampleId,
        category: r.category,
        fullQuestion: r.fullQuestion,
        correctAnswer: r.correctAnswer,
        models: r.modelStates.map((m) => ({
          modelId: m.modelId,
          answer: m.answer,
          latencyMs: m.latencyMs,
          promptTokens: m.promptTokens,
          completionTokens: m.completionTokens,
          estCostUsd: m.estCostUsd,
          runStatus: m.runStatus,
          score:
            r.correctAnswer && m.answer
              ? evaluateReferenceAnswer(m.answer, r.correctAnswer, r.options, r.scoringPolicy)
              : null,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `head-to-head-batch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      "Question ID",
      "Category",
      ...models.flatMap((mId, idx) => [
        `Model ${String.fromCharCode(65 + idx)} (${mId.split("/").pop()}) Result`,
        `Model ${String.fromCharCode(65 + idx)} Latency (ms)`,
        `Model ${String.fromCharCode(65 + idx)} TPS`,
      ]),
      "Expected Answer",
    ];

    const rows = results.map((r) => {
      const modelCols = models.flatMap((_, idx) => {
        const m = r.modelStates[idx];
        const ev =
          m?.answer && r.correctAnswer
            ? evaluateReferenceAnswer(m.answer, r.correctAnswer, r.options, r.scoringPolicy)
            : null;
        const resultStr =
          ev?.correct !== undefined ? (ev.correct ? "PASS" : "FAIL") : m?.runStatus || "N/A";
        const latency = m?.latencyMs ?? 0;
        const tps = latency > 0 && m?.completionTokens ? (m.completionTokens / (latency / 1000)).toFixed(1) : "0";
        return [resultStr, latency, tps];
      });

      return [
        `"${r.sampleId}"`,
        `"${r.category}"`,
        ...modelCols,
        `"${(r.correctAnswer || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `head-to-head-batch-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── BATCH CONFIGURATION PANEL ───────────────────────────────────────── */}
      <section
        aria-label="Batch Benchmark Configuration"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
              Batch Benchmark Evaluation Configuration
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-subtle)" }}>
              Evaluate selected models across standard insurance benchmark datasets or user-uploaded test CSVs.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Engine Mode Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-sm)",
                padding: "2px",
                border: "1px solid var(--border-default)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) setIsSimulationMode(false);
                }}
                disabled={isRunning}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  background: !isSimulationMode ? "var(--accent)" : "transparent",
                  color: !isSimulationMode ? "var(--text-inverted)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  border: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Execute live inferences via OpenRouter API"
              >
                <span>⚡ Live API</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) setIsSimulationMode(true);
                }}
                disabled={isRunning}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  background: isSimulationMode ? "var(--emerald)" : "transparent",
                  color: isSimulationMode ? "#ffffff" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  border: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Zero-cost insurance benchmark simulation mode"
              >
                <span>🧪 Demo Mode</span>
              </button>
            </div>

            {/* Dataset Source Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-sm)",
                padding: "2px",
                border: "1px solid var(--border-default)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) setSourceType("benchmark");
                }}
                disabled={isRunning}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  background: sourceType === "benchmark" ? "var(--accent)" : "transparent",
                  color: sourceType === "benchmark" ? "var(--text-inverted)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  border: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                Built-in Benchmark
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) setSourceType("manual-csv");
                }}
                disabled={isRunning}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  background: sourceType === "manual-csv" ? "var(--accent)" : "transparent",
                  color: sourceType === "manual-csv" ? "var(--text-inverted)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                  border: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                Manual CSV Upload
              </button>
            </div>
          </div>
        </div>

        {/* Dataset Selection Controls */}
        {sourceType === "benchmark" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                Benchmark Dataset Category
              </label>
              <select
                value={benchmarkId}
                disabled={isRunning}
                onChange={(e) => setBenchmarkId(e.target.value as InsuranceBenchmarkId)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {INSURANCE_BENCHMARKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.fileName})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
                {INSURANCE_BENCHMARKS.find((b) => b.id === benchmarkId)?.description} ·{" "}
                <strong>{totalCategoryCount} total questions available</strong>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                Question Sample Limit
              </label>
              <select
                value={sampleLimitOption}
                disabled={isRunning}
                onChange={(e) => setSampleLimitOption(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              >
                <option value="5">First 5 Questions (Quick Test)</option>
                <option value="10">First 10 Questions</option>
                <option value="20">First 20 Questions</option>
                <option value="50">Full Group Subset (Up to 50 Questions)</option>
              </select>
              <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
                Bounded execution ensures predictable API credit consumption.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                📁 Choose Insurance CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={isRunning}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCsvFileSelected(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              {csvFile && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-main)", fontWeight: 600 }}>
                    {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(52, 168, 83, 0.12)",
                      color: "var(--emerald)",
                      border: "1px solid rgba(52, 168, 83, 0.3)",
                    }}
                  >
                    {csvCases.length} parsed records
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMappingModal(true)}
                    className="arena-header-btn"
                  >
                    Edit Column Mapping
                  </button>
                </div>
              )}
            </div>

            {csvError && (
              <div style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(217, 101, 112, 0.12)", border: "1px solid var(--rose)", color: "var(--rose)", fontSize: "12px" }}>
                {csvError}
              </div>
            )}
          </div>
        )}

        {/* Model Selection */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>
              Models in Batch Evaluation ({models.length} of 4)
            </label>
            {models.length < 4 && !isRunning && (
              <button
                type="button"
                onClick={handleAddModel}
                className="h2h-add-model-btn"
              >
                + Add Model
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${models.length}, 1fr)`,
              gap: "12px",
            }}
          >
            {models.map((mId, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-surface-elevated)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  padding: "8px 10px",
                }}
              >
                <ModelSelectWidget
                  label={`Model ${String.fromCharCode(65 + idx)}`}
                  value={mId}
                  disabled={isRunning}
                  onChange={(newId) => handleModelChange(idx, newId)}
                  onRemove={models.length > 2 && !isRunning ? () => handleRemoveModel(idx) : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: 0,
            }}
          >
            <span>{showAdvancedSettings ? "▼" : "▶"}</span>
            <span style={{ fontWeight: 600 }}>Advanced Concurrency & Rate Limit Settings</span>
          </button>

          {showAdvancedSettings && (
            <div
              style={{
                marginTop: "10px",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-subtle)", marginBottom: "4px" }}>
                  Model Dispatch Stagger Delay (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={requestDelayMs}
                  disabled={isRunning}
                  onChange={(e) => setRequestDelayMs(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                  }}
                />
                <div style={{ fontSize: "10.5px", color: "var(--text-subtle)", marginTop: "2px" }}>
                  Protects against OpenRouter 429 Too Many Requests.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-subtle)", marginBottom: "4px" }}>
                  Parallel Question Concurrency
                </label>
                <select
                  value={concurrency}
                  disabled={isRunning}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                  }}
                >
                  <option value={1}>1 (Strict Sequential — Lowest Risk)</option>
                  <option value={2}>2 (Bounded Concurrency — Recommended)</option>
                </select>
                <div style={{ fontSize: "10.5px", color: "var(--text-subtle)", marginTop: "2px" }}>
                  Maintains non-blocking UI and ensures responses are recorded reliably.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Planned Run Summary & Launch Action */}
        <div
          style={{
            marginTop: "6px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }}>
              Planned Run Scope: {plannedSampleCount} questions × {models.length} models ={" "}
              <span style={{ color: "var(--accent)" }}>{plannedSampleCount * models.length} total inferences</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px" }}>
              Target: {sourceType === "benchmark" ? benchmarkId : csvFile?.name || "Manual CSV"} · Concurrency: {concurrency} · Reference answers hidden from model prompts.
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {isRunning ? (
              <button
                type="button"
                onClick={handleCancelBatch}
                style={{
                  padding: "8px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(217, 101, 112, 0.15)",
                  border: "1px solid var(--rose)",
                  color: "var(--rose)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ⏹ Cancel Batch
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRunBatch()}
                disabled={plannedSampleCount === 0 || isRunning}
                style={{
                  padding: "8px 24px",
                  borderRadius: "var(--radius-sm)",
                  background: plannedSampleCount > 0
                    ? isSimulationMode ? "var(--emerald)" : "var(--accent)"
                    : "var(--bg-surface)",
                  border: "1px solid var(--accent-border)",
                  color: plannedSampleCount > 0 ? "#ffffff" : "var(--text-subtle)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: plannedSampleCount > 0 ? "pointer" : "not-allowed",
                  boxShadow: "0 2px 8px rgba(66, 133, 244, 0.25)",
                }}
              >
                {isSimulationMode ? "🧪 Run Demo Benchmark" : "▶ Run Batch Evaluation"}
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Bar during active run */}
        {isRunning && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-main)" }}>
              <span>
                Running question {progressCount + 1} of {totalPlannedCount}…{" "}
                <strong style={{ color: "var(--accent)" }}>[{activeRunningSampleId}]</strong>
              </span>
              <span>
                {Math.round((progressCount / Math.max(1, totalPlannedCount)) * 100)}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "var(--bg-canvas)",
                borderRadius: "3px",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(progressCount / Math.max(1, totalPlannedCount)) * 100}%`,
                  background: "var(--accent)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {batchError && (
          <div style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(217, 101, 112, 0.12)", border: "1px solid var(--rose)", color: "var(--rose)", fontSize: "12px" }}>
            {batchError}
          </div>
        )}
      </section>

      {/* ── UPSTREAM API ERROR BANNER ────────────────────────────────────────── */}
      {apiErrorMessage && (
        <div
          role="alert"
          style={{
            background:
              apiErrorMessage.type === "credits_exhausted"
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.08))"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.08))",
            border: `1px solid ${apiErrorMessage.type === "credits_exhausted" ? "var(--rose)" : "var(--amber)"}`,
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>
                {apiErrorMessage.type === "credits_exhausted" ? "💳" : "⏳"}
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "var(--text-main)" }}>
                  {apiErrorMessage.type === "credits_exhausted"
                    ? "OpenRouter Credit Limit Reached (HTTP 402)"
                    : apiErrorMessage.type === "rate_limit_exceeded"
                    ? "OpenRouter Free Tier Daily Quota Exhausted (HTTP 429)"
                    : "Model Inference Upstream Failure"}
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Model <strong style={{ color: "var(--text-main)" }}>{apiErrorMessage.modelId}</strong> was rejected by OpenRouter:{" "}
                  <span style={{ color: "var(--text-main)" }}>{apiErrorMessage.message}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setApiErrorMessage(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-subtle)",
                cursor: "pointer",
                fontSize: "18px",
                padding: "2px 6px",
              }}
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              paddingTop: "10px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <a
              href="https://openrouter.ai/settings/credits"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--accent)",
                color: "var(--text-inverted)",
                padding: "7px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              💳 Top Up Credits on OpenRouter ↗
            </a>

            <button
              type="button"
              onClick={() => {
                setIsSimulationMode(true);
                handleRunBatch(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--emerald)",
                padding: "7px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⚡ Run in Demo Simulation Mode
            </button>

            <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
              Demo mode simulates realistic actuary responses, populating all 5 Radar Charts and Token Speed metrics with zero API costs.
            </span>
          </div>
        </div>
      )}

      {/* ── BATCH RESULTS DASHBOARD ─────────────────────────────────────────── */}
      {results.length > 0 && (
        <section
          aria-label="Batch Results Dashboard"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Dashboard Header Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                Batch Evaluation Dashboard ({results.length} Scored Samples)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--text-subtle)" }}>
                Evidence-based summary with category weighting and documented denominators.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleExportCsv}
                className="arena-header-btn"
                title="Export evaluation results to CSV"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="arena-header-btn"
                title="Export full evaluation payload to JSON"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Equal-Weighted Category Score Card */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)" }}>
                Equal-Weighted Category Mean
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: hierarchicalScore.overallScore !== null ? "var(--emerald)" : "var(--text-subtle)",
                  marginTop: "4px",
                }}
              >
                {hierarchicalScore.overallScore !== null ? `${hierarchicalScore.overallScore}%` : "N/A"}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--text-subtle)", marginTop: "4px" }}>
                {hierarchicalScore.formulaExplanation}
              </div>
            </div>

            {/* Questions Scored Card */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)" }}>
                Evaluated / Attempted
              </div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-main)", marginTop: "4px" }}>
                {results.length} / {totalPlannedCount || results.length}
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--text-subtle)", marginTop: "4px" }}>
                Valid responses scored: {hierarchicalScore.totalEvaluated} · Failed: {hierarchicalScore.totalFailed}
              </div>
            </div>

            {/* Model A vs B Head-to-Head Card */}
            {operationalStats && operationalStats.length >= 2 && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)" }}>
                  Model Accuracy Comparison
                </div>
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {operationalStats.slice(0, 2).map((op, i) => (
                    <div key={op.modelId} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                        {op.modelId.split("/").pop()}:
                      </span>
                      <strong style={{ color: op.accuracy !== null && op.accuracy >= 50 ? "var(--emerald)" : "var(--rose)" }}>
                        {op.accuracy !== null ? `${op.accuracy.toFixed(1)}%` : "N/A"}{" "}
                        <span style={{ fontSize: "10px", color: "var(--text-subtle)", fontWeight: 400 }}>
                          ({op.correctCount}/{op.evaluatedCount})
                        </span>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Latency & Cost Card */}
            {operationalStats && operationalStats.length > 0 && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)" }}>
                  Median Response Latency
                </div>
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {operationalStats.slice(0, 2).map((op) => (
                    <div key={op.modelId} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-muted)" }}>{op.modelId.split("/").pop()}:</span>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                        {(op.medianLatency / 1000).toFixed(2)}s
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 5-RADAR CAPABILITY & TOKEN SPEED COMPARISON DASHBOARDS ──────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <RadarComparisonChart
              modelIds={models}
              items={results}
            />

            <TokenSpeedComparisonPanel
              modelIds={models}
              items={results}
            />
          </div>

          {/* 5-Category Breakdown Section */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: "12px" }}>
              Category-Level Performance & Sample Denominators
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {categoryScores.map((c) => {
                const pct = c.accuracy !== null ? Math.round(c.accuracy * 100) : 0;
                return (
                  <div key={c.categoryId} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {c.categoryName}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        <strong>{c.accuracy !== null ? `${pct}%` : "N/A"}</strong> ({c.correctCount} of {c.evaluatedCount} valid scored responses)
                      </span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "var(--bg-canvas)",
                        borderRadius: "4px",
                        overflow: "hidden",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: pct >= 70 ? "var(--emerald)" : pct >= 40 ? "var(--accent)" : "var(--rose)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question-Level Results Table */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  Question-Level Results Table
                </h4>
                <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px" }}>
                  Click any row to inspect full prompt, side-by-side answers, and ground-truth validation.
                </div>
              </div>

              {/* Table Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search question / ID…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                  }}
                >
                  <option value="all">All Outcomes</option>
                  <option value="disagreements">⚠️ Disagreements Only</option>
                  <option value="correct">Model A Correct</option>
                  <option value="incorrect">Model A Incorrect</option>
                  <option value="failed">Failed / Errored</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface-elevated)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>ID</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>Question Preview</th>
                    {models.map((mId, mIdx) => (
                      <th key={mId} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-main)" }}>Model {String.fromCharCode(65 + mIdx)}</span>
                          <span style={{ fontSize: "10px", color: "var(--text-subtle)", fontWeight: 400 }}>{mId.split("/").pop()}</span>
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableResults.map((r) => {
                    return (
                      <tr
                        key={r.sampleId}
                        onClick={() => setInspectedSample(r)}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-elevated)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                          {r.sampleId}
                        </td>
                        <td style={{ padding: "8px 12px", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-main)" }}>
                          {r.preview}
                        </td>
                        {models.map((mId, mIdx) => {
                          const m = r.modelStates[mIdx];
                          const ev =
                            m?.answer && r.correctAnswer
                              ? evaluateReferenceAnswer(m.answer, r.correctAnswer, r.options, r.scoringPolicy)
                              : null;
                          const tps =
                            m?.latencyMs && m?.completionTokens
                              ? (m.completionTokens / (m.latencyMs / 1000)).toFixed(1)
                              : null;

                          return (
                            <td key={mId} style={{ padding: "8px 12px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div>
                                  {ev?.correct === true ? (
                                    <span style={{ color: "var(--emerald)", fontWeight: 700 }}>✓ Pass</span>
                                  ) : ev?.correct === false ? (
                                    <span style={{ color: "var(--rose)", fontWeight: 700 }}>✗ Fail</span>
                                  ) : m?.runStatus === "failed" ? (
                                    <span
                                      style={{
                                        color: "var(--rose)",
                                        cursor: m.errorMessage ? "help" : "default",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                      }}
                                      title={m.errorMessage || "Model inference failed"}
                                    >
                                      ⚠️ Failed
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--text-subtle)" }}>—</span>
                                  )}
                                </div>
                                <div style={{ fontSize: "10.5px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                                  {m?.latencyMs ? `${(m.latencyMs / 1000).toFixed(2)}s` : "—"}
                                  {tps && tps !== "0.0" ? ` · ${tps} t/s` : ""}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 12px" }}>
                          <button
                            type="button"
                            className="arena-header-btn"
                            style={{ fontSize: "11px", padding: "2px 8px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedSample(r);
                            }}
                          >
                            Inspect ↗
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Manual CSV Column Mapping Modal */}
      {csvInspection && (
        <ManualCsvMappingModal
          fileName={csvInspection.fileName}
          headers={csvInspection.headers}
          sampleRows={csvInspection.sampleRows}
          isOpen={showMappingModal}
          onConfirm={handleMappingConfirmed}
          onClose={() => setShowMappingModal(false)}
        />
      )}

      {/* Single-Sample Inspection Modal for Drilldown */}
      {inspectedSample && (
        <SingleSampleInspectionModal
          isOpen={Boolean(inspectedSample)}
          onClose={() => setInspectedSample(null)}
          sampleId={inspectedSample.sampleId}
          category={inspectedSample.category}
          fullQuestion={inspectedSample.fullQuestion}
          options={inspectedSample.options}
          correctAnswer={inspectedSample.correctAnswer}
          scoringPolicy={inspectedSample.scoringPolicy}
          modelResults={inspectedSample.modelStates}
        />
      )}
    </div>
  );
}

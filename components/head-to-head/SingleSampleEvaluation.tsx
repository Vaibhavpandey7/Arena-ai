"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ModelSelectWidget from "../ModelSelectWidget";
import StructuredMarkdown from "../StructuredMarkdown";
import GroundTruthPanel from "../GroundTruthPanel";
import { DocumentPreviewModal, ParsedDocument } from "../DocumentPreviewModal";
import { DocumentIngestModal } from "../DocumentIngestModal";
import ModelMaximizeModal from "./ModelMaximizeModal";
import { INSTITUTIONAL_INSURANCE_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  evaluateReferenceAnswer,
  calculateTokensPerSec,
  calculateWordCount,
  type ReferenceScoringPolicy,
  type ReferenceTaskResult,
} from "@/lib/benchmark-eval";
import {
  INSURANCE_BENCHMARKS,
  type InsuranceBenchmarkId,
  type InsuranceBenchmarkRecord,
} from "@/lib/insurance-benchmark-registry";
import {
  INSURANCE_USE_CASES,
  type InsuranceUseCaseId,
} from "@/lib/use-case-metrics";
import { BENCHMARK_GOLD_REGISTRY } from "@/lib/benchmark-gold-data";

export interface SingleModelState {
  answer: string;
  reasoning: string;
  isRunning: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estCostUsd: number;
  startTime: number | null;
  elapsed: number;
  runStatus?: "success" | "failed" | "cancelled";
}

const emptyModelState = (): SingleModelState => ({
  answer: "",
  reasoning: "",
  isRunning: false,
  promptTokens: 0,
  completionTokens: 0,
  latencyMs: 0,
  estCostUsd: 0,
  startTime: null,
  elapsed: 0,
});

interface SampleItem {
  id: string;
  sourceRowNumber: number;
  preview: string;
  hasOptions: boolean;
}

interface Props {
  initialPrompt?: string;
  initialBenchmarkId?: InsuranceBenchmarkId;
  initialSampleId?: string;
  onClearInitialNavigation?: () => void;
}

const USE_CASES_LIST: { id: InsuranceUseCaseId; label: string; samplePrompt: string; goldKey: string }[] = [
  {
    id: "data-extraction",
    label: "Data Extraction",
    samplePrompt: "Extract all key commercial property policy terms from this insurance schedule: named insured, policy period, building replacement cost limit, deductible, and business interruption sub-limit.",
    goldKey: "SC-001",
  },
  {
    id: "policy-translation",
    label: "Policy Translation / Understanding",
    samplePrompt: "Explain how Section 4(c) 'Water Damage Exclusions' applies to a sudden pipe burst versus gradual seepage from an underground sewer line.",
    goldKey: "SC-002",
  },
  {
    id: "ai-triage",
    label: "AI Triage",
    samplePrompt: "Assess this First Notice of Loss (FNOL) for motor vehicle collision involving pedestrian injury and route to appropriate claim severity tier.",
    goldKey: "SC-003",
  },
  {
    id: "claim-assessment",
    label: "Claim Assessment",
    samplePrompt: "Adjudicate comprehensive auto coverage for stolen vehicle with recovery damages, calculating net payable indemnity after $500 deductible.",
    goldKey: "SC-004",
  },
  {
    id: "eiopa-regulatory",
    label: "EIOPA Regulatory Check",
    samplePrompt: "Review Solvency II Article 132 Prudent Person Principle compliance for life insurer allocating 18% of technical provisions into private credit funds.",
    goldKey: "SC-005",
  },
  {
    id: "underwriting-risk",
    label: "Underwriting Risk Assessment",
    samplePrompt: "Evaluate commercial cyber insurance submission for regional healthcare network: MFA enforcement, backup segregation, and ransomware sublimit recommendation.",
    goldKey: "SC-006",
  },
  {
    id: "actuarial-reasoning",
    label: "Actuarial Reasoning",
    samplePrompt: "Calculate cumulative development factors and estimated ultimate losses for 2024 accident year using the provided 5-year paid loss triangle.",
    goldKey: "SC-008",
  },
];

export default function SingleSampleEvaluation({
  initialPrompt,
  initialBenchmarkId = "accuracy-rigor",
  initialSampleId,
  onClearInitialNavigation,
}: Props) {
  // Source: Benchmark Dataset or Manual Question
  const [source, setSource] = useState<"benchmark" | "manual">("benchmark");

  // Models (defaults to free tier to save credits)
  const [models, setModels] = useState<string[]>([
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ]);
  const [states, setStates] = useState<SingleModelState[]>([
    emptyModelState(),
    emptyModelState(),
  ]);

  // Layout Modes & Compact UI State
  const [layoutMode, setLayoutMode] = useState<"columns" | "stacked" | "tabbed">("columns");
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [activeTabModelIndex, setActiveTabModelIndex] = useState(0);
  const [syncScroll, setSyncScroll] = useState(true);
  const [maximizedModelIndex, setMaximizedModelIndex] = useState<number | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});

  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSyncingScroll = useRef(false);

  const handleBodyScroll = (idx: number, e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingScroll.current || layoutMode !== "columns") return;
    isSyncingScroll.current = true;
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    scrollContainerRefs.current.forEach((el, i) => {
      if (i !== idx && el) {
        el.scrollTop = scrollTop;
      }
    });
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Benchmark Dataset Selection
  const [benchmarkId, setBenchmarkId] = useState<InsuranceBenchmarkId>(initialBenchmarkId);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [currentBenchmarkRecord, setCurrentBenchmarkRecord] = useState<InsuranceBenchmarkRecord | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [sampleSearchQuery, setSampleSearchQuery] = useState("");

  // Manual Question Selection
  const [activeUseCase, setActiveUseCase] = useState<InsuranceUseCaseId>("data-extraction");
  const [manualPrompt, setManualPrompt] = useState(initialPrompt || "");

  // Optional Context Document
  const [attachedDoc, setAttachedDoc] = useState<ParsedDocument | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDoc(true);
    setDocUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse document");
      }

      setAttachedDoc({
        ...data.document,
        fileUrl: URL.createObjectURL(file),
        mimeType: file.type || "application/pdf",
      });
      setShowContextDrawer(true);
    } catch (err: unknown) {
      setDocUploadError((err as Error)?.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
      e.target.value = "";
    }
  };

  // Expanded reasoning traces
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const [showGroundTruth, setShowGroundTruth] = useState(false);

  const abortRefs = useRef<(AbortController | null)[]>([null, null, null, null]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAnyRunning = states.some((s) => s.isRunning);
  const hasCompletedInference = states.some((s) => Boolean(s.answer.trim()) && !s.isRunning);

  // Sync state length with models length
  useEffect(() => {
    setStates((prev) => {
      if (prev.length === models.length) return prev;
      if (prev.length < models.length) {
        const added = Array.from({ length: models.length - prev.length }, () => emptyModelState());
        return [...prev, ...added];
      }
      return prev.slice(0, models.length);
    });
  }, [models.length]);

  // Elapsed time ticker
  useEffect(() => {
    if (isAnyRunning) {
      tickerRef.current = setInterval(() => {
        setStates((prev) =>
          prev.map((s) =>
            s.isRunning && s.startTime ? { ...s, elapsed: Date.now() - s.startTime } : s
          )
        );
      }, 100);
    } else {
      if (tickerRef.current) clearInterval(tickerRef.current);
    }
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isAnyRunning]);

  // Load benchmark samples list when benchmarkId changes
  useEffect(() => {
    if (source !== "benchmark") return;
    const controller = new AbortController();
    setIsLoadingSamples(true);

    fetch(`/api/insurance-benchmarks?benchmarkId=${benchmarkId}&pageSize=50`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load samples");
        setSamples(body.samples || []);
        if (body.samples && body.samples.length > 0) {
          // If initialSampleId is specified, match it
          const matchIdx = initialSampleId
            ? body.samples.findIndex((s: SampleItem) => s.id === initialSampleId)
            : 0;
          setSelectedSampleIndex(matchIdx >= 0 ? matchIdx : 0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error loading benchmark samples:", err);
        }
      })
      .finally(() => {
        setIsLoadingSamples(false);
      });

    return () => controller.abort();
  }, [benchmarkId, source, initialSampleId]);

  // Fetch full sample record when selectedSampleIndex or samples change
  useEffect(() => {
    if (source !== "benchmark" || samples.length === 0) return;
    const sample = samples[selectedSampleIndex];
    if (!sample) return;

    const controller = new AbortController();
    fetch(`/api/insurance-benchmarks?benchmarkId=${benchmarkId}&sampleId=${sample.id}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to fetch sample record");
        setCurrentBenchmarkRecord(body.record);
        // Reset responses when question changes
        setStates(models.map(() => emptyModelState()));
        setShowGroundTruth(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load sample detail:", err);
        }
      });

    return () => controller.abort();
  }, [benchmarkId, selectedSampleIndex, samples, source]);

  // Clear initial external navigation
  useEffect(() => {
    if (initialPrompt) {
      setSource("manual");
      setManualPrompt(initialPrompt);
      onClearInitialNavigation?.();
    }
  }, [initialPrompt, onClearInitialNavigation]);

  // Add / Remove Model
  const handleAddModel = () => {
    if (models.length >= 4) return;
    const candidates = [
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
    ];
    const nextModel = candidates.find((c) => !models.includes(c)) || candidates[0];
    setModels((prev) => [...prev, nextModel]);
  };

  const handleRemoveModel = (idx: number) => {
    if (models.length <= 1) return;
    abortRefs.current[idx]?.abort();
    setModels((prev) => prev.filter((_, i) => i !== idx));
    setStates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModelChange = (idx: number, newModelId: string) => {
    setModels((prev) => {
      const next = [...prev];
      next[idx] = newModelId;
      return next;
    });
    setStates((prev) => {
      const next = [...prev];
      next[idx] = emptyModelState();
      return next;
    });
  };

  // Derive current effective prompt
  const getEffectivePrompt = useCallback(() => {
    let questionText = "";
    if (source === "benchmark") {
      questionText = currentBenchmarkRecord?.fullQuestion || "";
    } else {
      questionText = manualPrompt.trim();
    }

    if (!attachedDoc) return questionText;

    const docHeader = `[ATTACHED POLICY / DOCUMENT: ${attachedDoc.name} | Type: ${attachedDoc.type}]\n--- DOCUMENT CONTENT START ---\n${attachedDoc.text}\n--- DOCUMENT CONTENT END ---\n\n`;
    if (!questionText) {
      return `${docHeader}[TASK]\nPlease analyse this attached policy document according to standard insurance underwriting, claims assessment, and regulatory review principles. Summarise key findings, coverage limits, exclusions, deductibles, and risk indicators.`;
    }
    return `${docHeader}[QUESTION / INQUIRY]\n${questionText}`;
  }, [source, currentBenchmarkRecord, manualPrompt, attachedDoc]);

  // Stream a single model
  const streamSingleModel = useCallback(
    async (idx: number, modelId: string, promptText: string) => {
      abortRefs.current[idx] = new AbortController();
      const startTime = Date.now();
      let state: SingleModelState = {
        ...emptyModelState(),
        isRunning: true,
        startTime,
      };

      const updateState = (updater: (curr: SingleModelState) => SingleModelState) => {
        state = updater(state);
        setStates((prev) => {
          const next = [...prev];
          next[idx] = state;
          return next;
        });
      };

      setStates((prev) => {
        const next = [...prev];
        next[idx] = state;
        return next;
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            prompt: promptText,
            systemPrompt: INSTITUTIONAL_INSURANCE_SYSTEM_PROMPT,
            useTools: false,
          }),
          signal: abortRefs.current[idx]?.signal,
        });

        if (!res.ok || !res.body) {
          let errMsg = `Request failed (${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson.error) errMsg = errJson.error;
          } catch {
            // fallback
          }
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "failed",
            answer: `[Error: ${errMsg}]`,
            latencyMs: Date.now() - startTime,
          }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
            if (dataStr === "[DONE]") {
              updateState((curr) => ({
                ...curr,
                isRunning: false,
                runStatus: curr.answer.trim() ? "success" : "failed",
                latencyMs: curr.latencyMs || Date.now() - startTime,
              }));
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "done" || parsed.t === "done") {
                updateState((curr) => ({
                  ...curr,
                  isRunning: false,
                  runStatus: curr.answer.trim() ? "success" : "failed",
                  latencyMs: curr.latencyMs || Date.now() - startTime,
                }));
                return;
              }

              // Reasoning chunk
              const reasoningChunk =
                parsed.delta && parsed.type === "reasoning"
                  ? parsed.delta
                  : parsed.t === "reasoning"
                  ? parsed.c
                  : null;
              if (reasoningChunk) {
                updateState((curr) => ({
                  ...curr,
                  reasoning: curr.reasoning + reasoningChunk,
                }));
              }

              // Content chunk
              const contentChunk =
                parsed.delta && (parsed.type === "content" || parsed.type === "text")
                  ? parsed.delta
                  : parsed.t === "text" || parsed.t === "content"
                  ? parsed.c
                  : null;
              if (contentChunk) {
                updateState((curr) => ({
                  ...curr,
                  answer: curr.answer + contentChunk,
                }));
              }

              // Usage / metrics
              const u = parsed.usage || (parsed.t === "metrics" ? parsed.data : null);
              if (u) {
                updateState((curr) => ({
                  ...curr,
                  promptTokens: u.prompt_tokens ?? curr.promptTokens,
                  completionTokens: u.completion_tokens ?? curr.completionTokens,
                  latencyMs: u.latency_ms ?? curr.latencyMs,
                  estCostUsd: u.total_cost_usd ?? u.cost ?? curr.estCostUsd,
                }));
              }
            } catch {
              // Ignore non-JSON lines
            }
          }
        }

        updateState((curr) => ({
          ...curr,
          isRunning: false,
          runStatus: curr.answer.trim() ? "success" : "failed",
          latencyMs: curr.latencyMs || Date.now() - startTime,
        }));
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "cancelled",
            latencyMs: Date.now() - startTime,
          }));
        } else {
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "failed",
            answer: `[Error: ${(err as Error)?.message || "Network error"}]`,
            latencyMs: Date.now() - startTime,
          }));
        }
      }
    },
    []
  );

  // Run Comparison action
  const handleRunComparison = () => {
    const promptText = getEffectivePrompt();
    if (!promptText.trim() || isAnyRunning) return;

    setShowGroundTruth(false);
    setIsConfigCollapsed(true);
    models.forEach((modelId, idx) => {
      void streamSingleModel(idx, modelId, promptText);
    });
  };

  const handleStopAll = () => {
    abortRefs.current.forEach((ref) => ref?.abort());
    setStates((prev) => prev.map((s) => ({ ...s, isRunning: false })));
  };

  const handleReset = () => {
    handleStopAll();
    setStates(models.map(() => emptyModelState()));
    setShowGroundTruth(false);
    setIsConfigCollapsed(false);
  };

  // Sample Navigation
  const handlePrevSample = () => {
    if (selectedSampleIndex > 0) {
      setSelectedSampleIndex((prev) => prev - 1);
    }
  };

  const handleNextSample = () => {
    if (selectedSampleIndex < samples.length - 1) {
      setSelectedSampleIndex((prev) => prev + 1);
    }
  };

  // Ground Truth reference determination
  const goldAnswer =
    source === "benchmark"
      ? currentBenchmarkRecord?.correctAnswer
      : BENCHMARK_GOLD_REGISTRY[USE_CASES_LIST.find((u) => u.id === activeUseCase)?.goldKey || "SC-001"]?.goldResponse;

  const currentOptions =
    source === "benchmark" ? currentBenchmarkRecord?.options || {} : {};

  const scoringPolicy: ReferenceScoringPolicy = {
    type: "auto",
    absoluteTolerance: 0,
    relativeTolerance: 0,
  };

  // Filtered samples for quick jump
  const filteredSamples = samples.filter((s) =>
    sampleSearchQuery
      ? s.id.toLowerCase().includes(sampleSearchQuery.toLowerCase()) ||
        s.preview.toLowerCase().includes(sampleSearchQuery.toLowerCase())
      : true
  );

  // Calculate Executive Verdict
  const answeredModels = models
    .map((mId, idx) => ({ idx, modelId: mId, state: states[idx] }))
    .filter((m) => !!m.state.answer);

  const hasVerdict = answeredModels.length >= 2;

  let speedVerdict: string | null = null;
  let accuracyVerdict: string | null = null;
  let tokenVerdict: string | null = null;

  if (hasVerdict) {
    // Latency comparison
    const sortedByLatency = [...answeredModels]
      .filter((m) => m.state.latencyMs > 0)
      .sort((a, b) => a.state.latencyMs - b.state.latencyMs);

    if (sortedByLatency.length >= 2) {
      const fastest = sortedByLatency[0];
      const second = sortedByLatency[1];
      const ratio = second.state.latencyMs / Math.max(fastest.state.latencyMs, 1);
      if (ratio >= 1.2) {
        speedVerdict = `Model ${String.fromCharCode(65 + fastest.idx)} (${fastest.modelId.split("/").pop()}) is ${ratio.toFixed(1)}x faster (${(fastest.state.latencyMs / 1000).toFixed(1)}s vs ${(second.state.latencyMs / 1000).toFixed(1)}s)`;
      } else {
        speedVerdict = `Comparable speeds (~${(fastest.state.latencyMs / 1000).toFixed(1)}s)`;
      }
    }

    // Accuracy comparison against reference if available
    if (goldAnswer) {
      const evalScores = answeredModels.map((m) => ({
        ...m,
        evalRes: evaluateReferenceAnswer(m.state.answer, goldAnswer, currentOptions, scoringPolicy),
      }));
      const corrects = evalScores.filter((e) => e.evalRes.correct === true);
      const incorrects = evalScores.filter((e) => e.evalRes.correct === false);
      if (corrects.length > 0 && incorrects.length > 0) {
        accuracyVerdict = `${corrects.map((c) => `Model ${String.fromCharCode(65 + c.idx)}`).join(", ")} matched reference; ${incorrects.map((i) => `Model ${String.fromCharCode(65 + i.idx)}`).join(", ")} diverged`;
      } else if (corrects.length === answeredModels.length) {
        accuracyVerdict = `All models matched reference answer`;
      } else if (incorrects.length === answeredModels.length) {
        accuracyVerdict = `All models diverged from reference`;
      }
    }

    // Token comparison
    const sortedTokens = [...answeredModels].sort((a, b) => b.state.completionTokens - a.state.completionTokens);
    if (sortedTokens.length >= 2) {
      const mostVerbose = sortedTokens[0];
      const mostConcise = sortedTokens[sortedTokens.length - 1];
      tokenVerdict = `Model ${String.fromCharCode(65 + mostVerbose.idx)}: ${mostVerbose.state.completionTokens} tokens vs Model ${String.fromCharCode(65 + mostConcise.idx)}: ${mostConcise.state.completionTokens} tokens`;
    }
  }

  const renderModelCard = (modelId: string, idx: number, isStacked = false) => {
    const state = states[idx] || emptyModelState();
    const evalResult: ReferenceTaskResult | null =
      state.answer && goldAnswer
        ? evaluateReferenceAnswer(state.answer, goldAnswer, currentOptions, scoringPolicy)
        : null;

    const isCorrect = evalResult?.correct === true;
    const isIncorrect = evalResult?.correct === false;
    const tps = calculateTokensPerSec(state.latencyMs, state.completionTokens);
    const isCollapsed = isStacked && !!collapsedCards[idx];

    return (
      <div
        key={modelId + idx}
        className={isStacked ? "h2h-stacked-card" : undefined}
        style={
          isStacked
            ? undefined
            : {
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: layoutMode === "columns" && models.length > 2 ? "380px" : undefined,
              }
        }
      >
        {/* Card Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: isCollapsed ? "none" : "1px solid var(--border-default)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                Model {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                {modelId.split("/").pop()}
              </span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-subtle)",
                marginTop: "3px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {state.isRunning ? (
                <span style={{ color: "var(--accent)" }}>
                  Running… {(state.elapsed / 1000).toFixed(1)}s
                </span>
              ) : state.latencyMs > 0 ? (
                `${(state.latencyMs / 1000).toFixed(2)}s · ${state.completionTokens} tokens · ${tps} t/s`
              ) : (
                "Ready to compare"
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Objective status badge */}
            {evalResult && (
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: isCorrect
                    ? "rgba(52, 168, 83, 0.15)"
                    : isIncorrect
                    ? "rgba(217, 101, 112, 0.15)"
                    : "rgba(255, 255, 255, 0.08)",
                  color: isCorrect
                    ? "var(--emerald)"
                    : isIncorrect
                    ? "var(--rose)"
                    : "var(--text-muted)",
                  border: `1px solid ${
                    isCorrect
                      ? "rgba(52, 168, 83, 0.4)"
                      : isIncorrect
                      ? "rgba(217, 101, 112, 0.4)"
                      : "var(--border-subtle)"
                  }`,
                }}
              >
                {isCorrect ? "Correct" : isIncorrect ? "Incorrect" : evalResult.metricName}
              </span>
            )}

            {/* Maximize Zen Reader Button */}
            {state.answer && (
              <button
                type="button"
                onClick={() => setMaximizedModelIndex(idx)}
                className="arena-header-btn"
                title="Open in distraction-free reader"
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                ⤢ Maximize
              </button>
            )}

            {/* Stacked Accordion Collapse/Expand Button */}
            {isStacked && (
              <button
                type="button"
                onClick={() =>
                  setCollapsedCards((prev) => ({
                    ...prev,
                    [idx]: !prev[idx],
                  }))
                }
                className="arena-header-btn"
                style={{ padding: "3px 8px", fontSize: "11px" }}
                title={isCollapsed ? "Expand card" : "Collapse card"}
              >
                {isCollapsed ? "▼ Expand" : "▲ Collapse"}
              </button>
            )}
          </div>
        </div>

        {/* Card Body (only rendered if not collapsed) */}
        {!isCollapsed && (
          <>
            {/* Reasoning trace toggle if present */}
            {state.reasoning && (
              <div
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-canvas-subtle)",
                  padding: "6px 14px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedReasoning((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-subtle)",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: 0,
                  }}
                >
                  <span>{expandedReasoning[idx] ? "▼" : "▶"}</span>
                  <span>Thinking Trace ({state.reasoning.length} chars)</span>
                </button>

                {expandedReasoning[idx] && (
                  <div
                    style={{
                      marginTop: "6px",
                      maxHeight: "180px",
                      overflowY: "auto",
                      fontSize: "11.5px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {state.reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Response Body */}
            <div
              ref={(el) => {
                scrollContainerRefs.current[idx] = el;
              }}
              onScroll={(e) => handleBodyScroll(idx, e)}
              style={{
                padding: "16px",
                flex: 1,
                minHeight: isStacked ? "200px" : "260px",
                maxHeight: isStacked ? "600px" : "500px",
                overflowY: "auto",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "var(--text-main)",
              }}
            >
              {state.isRunning && !state.answer ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-subtle)" }}>
                  <span className="live-dot" />
                  Generating response…
                </div>
              ) : state.runStatus === "failed" ? (
                <div style={{ color: "var(--rose)", fontStyle: "italic" }}>
                  {state.answer || "Model failed to produce a valid response."}
                </div>
              ) : state.answer ? (
                <StructuredMarkdown content={state.answer} />
              ) : (
                <div style={{ color: "var(--text-subtle)", fontStyle: "italic", textAlign: "center", marginTop: "80px" }}>
                  Model response will appear here after clicking <strong>Run Comparison</strong>.
                </div>
              )}
            </div>

            {/* Performance & Operational Metrics Footer */}
            {state.answer && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid var(--border-default)",
                  background: "var(--bg-canvas)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--text-subtle)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div>
                  Tokens: {state.completionTokens} out / {state.promptTokens} in
                </div>
                <div>
                  {state.estCostUsd > 0
                    ? `Cost: $${state.estCostUsd.toFixed(5)}`
                    : "Cost: $0.00 (Free tier)"}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── STAGE 1: CONFIGURE ──────────────────────────────────────────────── */}
      {isConfigCollapsed ? (
        <div className="h2h-config-summary-bar">
          <div className="h2h-summary-chips">
            <span className="h2h-chip category">
              📂 {source === "benchmark" ? (INSURANCE_BENCHMARKS.find((b) => b.id === benchmarkId)?.name || benchmarkId) : (USE_CASES_LIST.find((u) => u.id === activeUseCase)?.label || activeUseCase)}
            </span>
            <span className="h2h-chip sample">
              📑 {source === "benchmark" ? (currentBenchmarkRecord?.id || `Sample #${selectedSampleIndex + 1}`) : "Manual Prompt"}
            </span>
            <span className="h2h-chip models">
              🤖 {models.map((m, i) => `Model ${String.fromCharCode(65 + i)}: ${m.split("/").pop()}`).join(" vs ")}
            </span>
            {attachedDoc && (
              <span className="h2h-chip doc">
                📄 {attachedDoc.name}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsConfigCollapsed(false)}
              className="arena-header-btn"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
            >
              ✎ Edit Configuration
            </button>
            {isAnyRunning ? (
              <button
                type="button"
                onClick={handleStopAll}
                className="arena-header-btn"
                style={{ color: "var(--rose)", borderColor: "var(--rose)" }}
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={!getEffectivePrompt().trim()}
                className="arena-header-btn"
                style={{ background: "var(--accent)", color: "var(--text-inverted)" }}
              >
                ▶ Re-Run
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <section
          aria-label="Stage 1: Configure Evaluation"
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  Stage 1
                </span>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                  Configure Single-Sample Evaluation
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-subtle)" }}>
                Select evaluation source, domain category, and target models to inspect head-to-head.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsConfigCollapsed(true)}
                className="arena-header-btn"
                title="Collapse configuration panel to save space"
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                ▲ Collapse Config
              </button>

              {/* Source Toggle */}
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
                if (!isAnyRunning) {
                  setSource("benchmark");
                  handleReset();
                }
              }}
              disabled={isAnyRunning}
              style={{
                padding: "6px 14px",
                borderRadius: "4px",
                background: source === "benchmark" ? "var(--accent)" : "transparent",
                color: source === "benchmark" ? "var(--text-inverted)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                border: "none",
                cursor: isAnyRunning ? "not-allowed" : "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              Benchmark Dataset
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAnyRunning) {
                  setSource("manual");
                  handleReset();
                }
              }}
              disabled={isAnyRunning}
              style={{
                padding: "6px 14px",
                borderRadius: "4px",
                background: source === "manual" ? "var(--accent)" : "transparent",
                color: source === "manual" ? "var(--text-inverted)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                border: "none",
                cursor: isAnyRunning ? "not-allowed" : "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              Manual Question
            </button>
          </div>
        </div>
      </div>

        {/* Source-specific config */}
        {source === "benchmark" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Category Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                  Insurance Category
                </label>
                <select
                  value={benchmarkId}
                  disabled={isAnyRunning}
                  onChange={(e) => {
                    setBenchmarkId(e.target.value as InsuranceBenchmarkId);
                    setSelectedSampleIndex(0);
                    handleReset();
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {INSURANCE_BENCHMARKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Selector */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)" }}>
                    Selected Question Sample ({samples.length > 0 ? `${selectedSampleIndex + 1} of ${samples.length}` : "Loading..."})
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handlePrevSample}
                      disabled={isAnyRunning || selectedSampleIndex <= 0}
                      style={{
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        color: selectedSampleIndex > 0 ? "var(--text-main)" : "var(--text-subtle)",
                        cursor: selectedSampleIndex > 0 ? "pointer" : "not-allowed",
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSample}
                      disabled={isAnyRunning || selectedSampleIndex >= samples.length - 1}
                      style={{
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        color: selectedSampleIndex < samples.length - 1 ? "var(--text-main)" : "var(--text-subtle)",
                        cursor: selectedSampleIndex < samples.length - 1 ? "pointer" : "not-allowed",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>

                <select
                  value={selectedSampleIndex}
                  disabled={isAnyRunning || isLoadingSamples}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {samples.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      [{s.id}] {s.preview}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Display Card */}
            {currentBenchmarkRecord && (
              <div
                style={{
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--text-main)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700 }}>
                    QUESTION PROMPT · {currentBenchmarkRecord.id}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                    Source Row: {currentBenchmarkRecord.sourceRowNumber}
                  </span>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {currentBenchmarkRecord.fullQuestion}
                </div>

                {Object.keys(currentBenchmarkRecord.options).length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--border-subtle)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "6px",
                    }}
                  >
                    {Object.entries(currentBenchmarkRecord.options).map(([letter, text]) => (
                      <div key={letter} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        <strong style={{ color: "var(--accent)" }}>{letter}:</strong> {text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Manual Use Case Tabs */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "6px" }}>
                Insurance Use Case Template
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {USE_CASES_LIST.map((uc) => (
                  <button
                    key={uc.id}
                    type="button"
                    onClick={() => {
                      setActiveUseCase(uc.id);
                      setManualPrompt(uc.samplePrompt);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      background: activeUseCase === uc.id ? "var(--accent-dim)" : "var(--bg-surface-elevated)",
                      border: `1px solid ${activeUseCase === uc.id ? "var(--accent-border)" : "var(--border-subtle)"}`,
                      color: activeUseCase === uc.id ? "var(--accent)" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {uc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Prompt Input */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                Prompt / Task Instructions
              </label>
              <textarea
                value={manualPrompt}
                onChange={(e) => setManualPrompt(e.target.value)}
                rows={4}
                placeholder="Type your insurance question, claim adjudication task, or policy query here..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        )}

        {/* Model Selection Row */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>
              Evaluation Models ({models.length} of 4)
            </label>
            {models.length < 4 && !isAnyRunning && (
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
                  disabled={isAnyRunning}
                  onChange={(newId) => handleModelChange(idx, newId)}
                  onRemove={models.length > 2 && !isAnyRunning ? () => handleRemoveModel(idx) : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Document Attachment Drawer */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
          <button
            type="button"
            onClick={() => setShowContextDrawer(!showContextDrawer)}
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
            <span>{showContextDrawer ? "▼" : "▶"}</span>
            <span style={{ fontWeight: 600 }}>
              Optional Document Context {attachedDoc ? `(1 attached: ${attachedDoc.name})` : "(0 attached)"}
            </span>
          </button>

          {showContextDrawer && (
            <div
              style={{
                marginTop: "10px",
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-main)", fontWeight: 600 }}>
                  {attachedDoc ? attachedDoc.name : "No policy or regulatory document attached"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px" }}>
                  {attachedDoc
                    ? `${attachedDoc.type.toUpperCase()} · ${attachedDoc.formattedSize} · Provided to all models as context`
                    : "Attach an insurance policy PDF, contract wordings, or regulatory document."}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {attachedDoc ? (
                  <>
                    <button
                      type="button"
                      className="arena-header-btn"
                      onClick={() => setShowDocPreview(true)}
                    >
                      Preview Document
                    </button>
                    <button
                      type="button"
                      className="arena-header-btn"
                      onClick={() => setAttachedDoc(null)}
                      style={{ color: "var(--rose)" }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="arena-header-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnyRunning || isUploadingDoc}
                    >
                      {isUploadingDoc ? "Parsing Document…" : "+ Attach Policy PDF / Text"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </>
                )}
              </div>
              {docUploadError && (
                <div style={{ width: "100%", fontSize: "11px", color: "var(--rose)", marginTop: "4px" }}>
                  {docUploadError}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── STAGE 2: RUN ────────────────────────────────────────────────────── */}
      <section
        aria-label="Stage 2: Run Comparison"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--emerald)",
              background: "var(--emerald-dim)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(52, 168, 83, 0.3)",
            }}
          >
            Stage 2
          </span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
              Run Head-to-Head Comparison
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "1px" }}>
              All {models.length} selected models receive the exact same prompt and permitted context.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAnyRunning ? (
            <button
              type="button"
              onClick={handleStopAll}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(217, 101, 112, 0.15)",
                border: "1px solid var(--rose)",
                color: "var(--rose)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⏹</span> Stop Inference
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={isAnyRunning || !getEffectivePrompt().trim()}
              style={{
                padding: "8px 22px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                border: "1px solid var(--accent-border)",
                color: "var(--text-inverted)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: getEffectivePrompt().trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(66, 133, 244, 0.25)",
              }}
            >
              <span>▶</span> Run Comparison
            </button>
          )}

          {hasCompletedInference && !isAnyRunning && (
            <button
              type="button"
              onClick={handleReset}
              className="arena-header-btn"
            >
              Clear Results
            </button>
          )}
        </div>
      </section>
      </>
      )}

      {/* ── STAGE 3: INSPECT ────────────────────────────────────────────────── */}
      <section
        aria-label="Stage 3: Inspect Model Responses"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Executive Verdict Banner */}
        {hasVerdict && (
          <div className="h2h-verdict-strip">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                }}
              >
                Executive Comparison Verdict:
              </span>
              {speedVerdict && (
                <span className="h2h-verdict-badge speed-win">
                  ⚡ {speedVerdict}
                </span>
              )}
              {accuracyVerdict && (
                <span className="h2h-verdict-badge accuracy-win">
                  🎯 {accuracyVerdict}
                </span>
              )}
              {tokenVerdict && (
                <span className="h2h-verdict-badge tie">
                  📊 {tokenVerdict}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--cyan)",
                background: "var(--cyan-dim)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--cyan-border)",
              }}
            >
              Stage 3
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
              Inspect Model Responses & Evaluation
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* 3-Way Layout Switcher */}
            <div className="h2h-segmented-control" role="group" aria-label="Layout mode">
              <button
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "columns" ? "active" : ""}`}
                onClick={() => setLayoutMode("columns")}
                title="Side-by-side columns with horizontal scroll rail"
              >
                ⫴ Columns
              </button>
              <button
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "stacked" ? "active" : ""}`}
                onClick={() => setLayoutMode("stacked")}
                title="Full-width stacked rows with collapsible cards"
              >
                ☰ Stacked
              </button>
              <button
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "tabbed" ? "active" : ""}`}
                onClick={() => setLayoutMode("tabbed")}
                title="Single-model focus reader with tabs"
              >
                ⧉ Tabbed Focus
              </button>
            </div>

            {/* Auxiliary controls */}
            {layoutMode === "columns" && (
              <button
                type="button"
                onClick={() => setSyncScroll(!syncScroll)}
                className="arena-header-btn"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                title="Synchronize vertical scrolling across columns"
              >
                {syncScroll ? "🔗 Sync Scroll: ON" : "⛓ Sync Scroll: OFF"}
              </button>
            )}

            {layoutMode === "stacked" && (
              <button
                type="button"
                onClick={() => {
                  const allCollapsed =
                    models.length > 0 &&
                    models.every((_, i) => !!collapsedCards[i]);
                  if (allCollapsed) {
                    setCollapsedCards({});
                  } else {
                    const all: Record<number, boolean> = {};
                    models.forEach((_, i) => (all[i] = true));
                    setCollapsedCards(all);
                  }
                }}
                className="arena-header-btn"
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                {models.length > 0 && models.every((_, i) => !!collapsedCards[i])
                  ? "Expand All"
                  : "Collapse All"}
              </button>
            )}

            {source === "benchmark" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={handlePrevSample}
                  disabled={isAnyRunning || selectedSampleIndex <= 0}
                  className="arena-header-btn"
                  title="Go to previous benchmark sample"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextSample}
                  disabled={isAnyRunning || selectedSampleIndex >= samples.length - 1}
                  className="arena-header-btn"
                  title="Go to next benchmark sample"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Model Output View */}
        {layoutMode === "columns" && (
          <div
            className="h2h-columns-rail"
            style={{
              gridTemplateColumns: `repeat(${models.length}, minmax(${models.length > 2 ? "380px" : "1fr"}, 1fr))`,
            }}
          >
            {models.map((modelId, idx) => renderModelCard(modelId, idx, false))}
          </div>
        )}

        {layoutMode === "stacked" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {models.map((modelId, idx) => renderModelCard(modelId, idx, true))}
          </div>
        )}

        {layoutMode === "tabbed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="h2h-tab-bar" role="tablist">
              {models.map((mId, idx) => {
                const state = states[idx] || emptyModelState();
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activeTabModelIndex === idx}
                    className={`h2h-model-tab ${activeTabModelIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveTabModelIndex(idx)}
                  >
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}
                    >
                      Model {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{mId.split("/").pop()}</span>
                    {state.isRunning && <span className="live-dot" />}
                    {state.answer && !state.isRunning && (
                      <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                        ({(state.latencyMs / 1000).toFixed(1)}s)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Single active model card at 100% full width */}
            {renderModelCard(models[activeTabModelIndex] || models[0], activeTabModelIndex, false)}
          </div>
        )}

        {/* Post-Inference Ground Truth Reference Panel */}
        {hasCompletedInference && goldAnswer && (
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--emerald)",
                    background: "rgba(52, 168, 83, 0.12)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(52, 168, 83, 0.3)",
                  }}
                >
                  Reference Details
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  Ground Truth & Scoring Integrity
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGroundTruth(!showGroundTruth)}
                className="arena-header-btn"
              >
                {showGroundTruth ? "▲ Collapse Reference Details" : "▼ Expand Reference Details"}
              </button>
            </div>

            {/* Expected Answer snippet */}
            <div
              style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                EXPECTED GROUND TRUTH ANSWER:
              </div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>
                {goldAnswer}
              </div>
            </div>

            {/* Expanded Detailed Comparison */}
            {showGroundTruth && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {models.map((modelId, idx) => {
                  const state = states[idx];
                  if (!state.answer) return null;
                  const res = evaluateReferenceAnswer(state.answer, goldAnswer, currentOptions, scoringPolicy);
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                          Model {String.fromCharCode(65 + idx)} ({modelId.split("/").pop()}):
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: res.correct ? "var(--emerald)" : "var(--rose)",
                          }}
                        >
                          {res.correct === true
                            ? "PASS (Exact / Numeric Match)"
                            : res.correct === false
                            ? "FAIL (Mismatch)"
                            : res.metricName}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        <strong>Scoring Method:</strong> {res.metricName}
                      </div>
                      {res.reason && (
                        <div style={{ color: "var(--rose)", marginTop: "2px" }}>
                          <strong>Mismatch explanation:</strong> {res.reason}
                        </div>
                      )}
                      {res.tokenF1 !== undefined && (
                        <div style={{ color: "var(--text-subtle)", marginTop: "2px" }}>
                          Lexical F1: {(res.tokenF1 * 100).toFixed(1)}% (Precision: {((res.tokenPrecision ?? 0) * 100).toFixed(1)}%, Recall: {((res.tokenRecall ?? 0) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Document Ingest Modal */}
      {showDocModal && (
        <DocumentIngestModal
          initialDocument={attachedDoc}
          isOpen={showDocModal}
          onClose={() => setShowDocModal(false)}
          onIngestSuccess={() => setShowDocModal(false)}
        />
      )}

      {/* Document Preview Modal */}
      {attachedDoc && (
        <DocumentPreviewModal
          isOpen={showDocPreview}
          onClose={() => setShowDocPreview(false)}
          document={attachedDoc}
        />
      )}

      {/* Maximize Zen Reader Modal */}
      {maximizedModelIndex !== null && (
        <ModelMaximizeModal
          modelId={models[maximizedModelIndex]}
          modelLetter={String.fromCharCode(65 + maximizedModelIndex)}
          answer={states[maximizedModelIndex]?.answer || ""}
          reasoning={states[maximizedModelIndex]?.reasoning}
          promptTokens={states[maximizedModelIndex]?.promptTokens || 0}
          completionTokens={states[maximizedModelIndex]?.completionTokens || 0}
          latencyMs={states[maximizedModelIndex]?.latencyMs || 0}
          estCostUsd={states[maximizedModelIndex]?.estCostUsd || 0}
          onClose={() => setMaximizedModelIndex(null)}
        />
      )}
    </div>
  );
}

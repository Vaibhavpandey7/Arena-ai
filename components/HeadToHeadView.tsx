"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ModelSelectWidget from "./ModelSelectWidget";
import GroundTruthPanel from "./GroundTruthPanel";
import { MODEL_REGISTRY, getModel } from "@/lib/model-registry";
import {
  INSURANCE_USE_CASES,
  InsuranceUseCaseId,
  evaluateUseCaseMetrics,
  UseCaseEvaluation,
} from "@/lib/use-case-metrics";
import { BENCHMARK_GOLD_REGISTRY } from "@/lib/benchmark-gold-data";

/* ── Use Cases ─────────────────────────────────────────────────────────────── */
const USE_CASES: { id: InsuranceUseCaseId; icon: string; label: string; prompt: string; goldKey?: string }[] = [
  {
    id: "data-extraction",
    icon: "📄",
    label: "1. Data Extraction",
    prompt:
      "Extract all key coverage terms, policy limits, exclusions, deductibles, and renewal conditions from this insurance policy document. Present findings in a structured table.",
    goldKey: "SC-001",
  },
  {
    id: "policy-translation",
    icon: "🌐",
    label: "2. Policy Translation / Understanding",
    prompt:
      "Translate the following French insurance policy clause into English: 'Déchéance de garantie en cas de déclaration tardive sauf cas fortuit ou force majeure.' Identify legal nuances, preserve coverage obligations, and advise on enforceability.",
    goldKey: "SC-002",
  },
  {
    id: "ai-triage",
    icon: "🚨",
    label: "3. AI Triage",
    prompt:
      "Assess the following FNOL notification and triage it: classify coverage trigger, identify potential policy defences (warranty breach), flag subrogation opportunities, calculate initial reserve, and assign SLA track.",
    goldKey: "SC-003",
  },
  {
    id: "claim-assessment",
    icon: "🔍",
    label: "4. Claim Assessment",
    prompt:
      "Assess this motor total loss claim: verify constructive total loss (CTL) threshold, calculate pre-accident agreed value payout, determine finance shortfall, and assess GAP insurance trigger conditions.",
    goldKey: "SC-004",
  },
  {
    id: "eiopa-regulatory",
    icon: "⚖️",
    label: "5. EIOPA Regulatory Check",
    prompt:
      "Audit the following SFCR narrative extract against EIOPA Guidelines 21–26 and Solvency II Directive 2009/138/EC. Identify what is present and absent, cite legal articles, rank findings by supervisory materiality, and recommend an internal audit notice.",
    goldKey: "SC-005",
  },
  {
    id: "underwriting-risk",
    icon: "🏗️",
    label: "6. Underwriting Risk Assessment",
    prompt:
      "Evaluate this commercial property underwriting submission: compute composite risk profile, assess sum insured adequacy against RICS benchmarks, calculate Estimated Maximum Loss (EML), and provide conditional accept/decline terms.",
    goldKey: "SC-006",
  },
  {
    id: "fraud-detection",
    icon: "🕵️",
    label: "7. Fraud Detection",
    prompt:
      "Analyse this personal injury claim file for fraud indicators. Classify signals as primary vs. corroborative, evaluate against Insurance Fraud Bureau (IFB) intelligence flags, compute a fraud propensity score, and outline an SIU 14-day action plan.",
    goldKey: "SC-007",
  },
  {
    id: "actuarial-reasoning",
    icon: "📐",
    label: "8. Actuarial Reasoning",
    prompt:
      "Using the chain ladder method, project ultimate losses from the provided paid loss triangle. Apply EIOPA mandatory adjustments (inflation and Ogden discount rate), calculate IBNR, discount to best estimate liabilities per Solvency II Article 77, and evaluate risk margin.",
    goldKey: "SC-008",
  },
];

const QUICK_CHIPS = [
  "Assess this property claim for coverage",
  "Extract key clauses from this policy slip",
  "Check EIOPA Solvency II compliance",
  "Locate reserve using chain ladder",
  "Triage and classify this FNOL notification",
];

export interface ModelState {
  reasoning: string;
  answer: string;
  isRunning: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estCostUsd: number;
  reasoningTokens: number;
  startTime: number | null;
  elapsed: number;
  customGold?: string;
  customEvidence?: string;
}

const emptyModelState = (): ModelState => ({
  reasoning: "",
  answer: "",
  isRunning: false,
  promptTokens: 0,
  completionTokens: 0,
  latencyMs: 0,
  estCostUsd: 0,
  reasoningTokens: 0,
  startTime: null,
  elapsed: 0,
});

/* ── Model Column Component ─────────────────────────────────────────────────── */
function ModelColumn({
  index,
  modelId,
  state,
  useCaseId,
  goldItem,
  onRemove,
  canRemove,
}: {
  index: number;
  modelId: string;
  state: ModelState;
  useCaseId: InsuranceUseCaseId;
  goldItem?: { goldResponse: string; evidence: string };
  onRemove?: () => void;
  canRemove?: boolean;
}) {
  const [showThinking, setShowThinking] = useState(true);
  const modelInfo = getModel(modelId);
  const displayName = modelInfo?.label ?? modelId.split("/").pop() ?? modelId;
  const isFree = modelInfo?.isFree || modelId.endsWith(":free");
  const hasContent = Boolean(state.reasoning || state.answer || state.isRunning);
  const elapsedSec = (state.elapsed / 1000).toFixed(1);

  const activeGold = state.customGold || goldItem?.goldResponse;
  const activeEvidence = state.customEvidence || goldItem?.evidence;

  return (
    <div
      className="h2h-model-col"
      style={{
        flex: 1,
        minWidth: "320px",
        display: "flex",
        flexDirection: "column",
        background: "rgba(11, 22, 40, 0.7)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Column Header */}
      <div
        className="h2h-col-header"
        style={{
          padding: "12px 16px",
          background: "rgba(15, 30, 54, 0.95)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "5px",
              background: "rgba(0, 212, 255, 0.15)",
              color: "var(--cyan)",
              border: "1px solid rgba(0, 212, 255, 0.3)",
            }}
          >
            M{index + 1}
          </span>
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={displayName}
          >
            {displayName}
          </span>
          {isFree && (
            <span
              style={{
                fontSize: "0.62rem",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--emerald)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: 700,
              }}
            >
              FREE
            </span>
          )}
          {modelInfo?.tags?.includes("reasoning") && (
            <span
              style={{
                fontSize: "0.62rem",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "rgba(14, 165, 233, 0.15)",
                color: "var(--cyan-light)",
                fontWeight: 700,
              }}
            >
              🧠 REASONING
            </span>
          )}
        </div>

        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.9rem",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
            title="Remove model from comparison"
          >
            ✕
          </button>
        )}
      </div>

      {/* Column Body */}
      <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {!hasContent ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🤖</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
              Ready for Evaluation
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "260px", lineHeight: 1.4 }}>
              Run a prompt or select an insurance use case on the left.
            </div>
          </div>
        ) : (
          <>
            {/* Live Metrics Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "6px",
                marginBottom: "14px",
                padding: "8px",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tokens In</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                  {state.promptTokens || "—"}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tokens Out</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                  {state.completionTokens || "—"}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Latency</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                  {state.latencyMs ? `${(state.latencyMs / 1000).toFixed(2)}s` : state.isRunning ? `${elapsedSec}s...` : "—"}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Cost</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                  {isFree ? "FREE" : state.estCostUsd ? `$${state.estCostUsd.toFixed(4)}` : "$0.00"}
                </div>
              </div>
            </div>

            {/* Reasoning / Thinking Drawer */}
            {state.reasoning && (
              <div
                style={{
                  marginBottom: "14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                  background: "rgba(14, 165, 233, 0.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setShowThinking(!showThinking)}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(14, 165, 233, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--cyan-light)",
                  }}
                >
                  <span>🧠 Thinking Process ({state.reasoning.split(/\s+/).length} words)</span>
                  <span>{showThinking ? "▲" : "▼"}</span>
                </div>
                {showThinking && (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontSize: "0.75rem",
                      lineHeight: 1.5,
                      color: "var(--text-dim)",
                      maxHeight: "180px",
                      overflowY: "auto",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {state.reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Response Content */}
            <div style={{ flex: 1, fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text)" }}>
              {state.answer ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{state.answer}</ReactMarkdown>
                </div>
              ) : state.isRunning ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--cyan)", fontSize: "0.78rem" }}>
                  <span className="spinner-border" /> Generating response...
                </div>
              ) : null}
            </div>

            {/* Ground Truth Alignment Section */}
            {state.answer && activeGold && (
              <GroundTruthPanel
                modelAnswer={state.answer}
                goldResponse={activeGold}
                evidence={activeEvidence}
                useCaseId={useCaseId}
                modelName={displayName}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Use Case Metric Scorecard Comparison ────────────────────────────────────── */
function UseCaseScorecard({
  useCaseId,
  models,
  states,
  goldItem,
}: {
  useCaseId: InsuranceUseCaseId;
  models: string[];
  states: ModelState[];
  goldItem?: { goldResponse: string; evidence: string };
}) {
  const config = INSURANCE_USE_CASES[useCaseId];
  if (!config) return null;

  // Calculate metrics for each model that has an answer
  const evaluations: (UseCaseEvaluation | null)[] = models.map((_, idx) => {
    const s = states[idx];
    if (!s?.answer) return null;
    const gold = s.customGold || goldItem?.goldResponse;
    const ev = s.customEvidence || goldItem?.evidence;
    return evaluateUseCaseMetrics(useCaseId, s.answer, gold, ev);
  });

  const colors = ["#00d4ff", "#10b981", "#f59e0b", "#a855f7"];

  return (
    <div
      style={{
        marginTop: "24px",
        padding: "20px",
        borderRadius: "12px",
        background: "rgba(11, 22, 40, 0.9)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.72rem", color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Domain Evaluation Scorecard
          </span>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", margin: "2px 0 0 0" }}>
            {config.title}
          </h3>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Comparative evaluation across {models.length} models
        </span>
      </div>

      {/* Primary Metric Comparison Bars */}
      <div
        style={{
          padding: "16px",
          borderRadius: "10px",
          background: "rgba(0, 212, 255, 0.04)",
          border: "1px solid rgba(0, 212, 255, 0.2)",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase" }}>
              Primary Metric
            </span>
            <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text)" }}>
              {config.primaryMetric.name}
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {config.primaryMetric.description}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {models.map((mId, idx) => {
            const ev = evaluations[idx];
            const score = ev?.primary.score ?? 0;
            const modelName = getModel(mId)?.label ?? mId.split("/").pop() ?? mId;
            return (
              <div key={mId}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: colors[idx % colors.length] }}>
                    M{idx + 1}: {modelName}
                  </span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                    {ev ? `${score}%` : "Pending..."}
                  </span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${score}%`,
                      background: colors[idx % colors.length],
                      borderRadius: "4px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Metrics Comparison Table */}
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px" }}>
          Secondary Metrics Matrix
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 600 }}>Metric</th>
                {models.map((mId, idx) => {
                  const name = getModel(mId)?.label ?? mId.split("/").pop() ?? mId;
                  return (
                    <th
                      key={mId}
                      style={{
                        textAlign: "center",
                        padding: "8px 12px",
                        color: colors[idx % colors.length],
                        fontWeight: 700,
                      }}
                    >
                      M{idx + 1}: {name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {config.secondaryMetrics.map((sec, secIdx) => (
                <tr
                  key={sec.id}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: secIdx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500 }} title={sec.description}>
                    {sec.name}
                  </td>
                  {models.map((mId, mIdx) => {
                    const ev = evaluations[mIdx];
                    const secMetric = ev?.secondaries.find((s) => s.metricId === sec.id);
                    const score = secMetric?.score;
                    return (
                      <td
                        key={mId}
                        style={{
                          textAlign: "center",
                          padding: "8px 12px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: score !== undefined ? (score >= 75 ? "var(--emerald)" : score >= 50 ? "var(--cyan)" : "var(--amber)") : "var(--text-muted)",
                        }}
                      >
                        {score !== undefined ? `${score}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main HeadToHeadView Component ─────────────────────────────────────────── */
interface HeadToHeadProps {
  initialPrompt?: string;
  onReady?: () => void;
}

export default function HeadToHeadView({ initialPrompt, onReady }: HeadToHeadProps = {}) {
  // Support up to 4 models (defaulted to 100% free models to preserve user credits)
  const [models, setModels] = useState<string[]>([
    "deepseek/deepseek-v4-flash-0731:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ]);
  const [states, setStates] = useState<ModelState[]>([emptyModelState(), emptyModelState()]);
  const [activeUseCase, setActiveUseCase] = useState<InsuranceUseCaseId>("data-extraction");
  const [prompt, setPrompt] = useState(initialPrompt || USE_CASES[0].prompt);

  // Sync initialPrompt from benchmark or external navigation
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onReady?.();
    }
  }, [initialPrompt, onReady]);

  const abortRefs = useRef<(AbortController | null)[]>([null, null, null, null]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAnyRunning = states.some((s) => s.isRunning);

  // Sync states length with models length
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

  // Global elapsed time ticker for running models
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

  const handleModelChange = (index: number, newModelId: string) => {
    setModels((prev) => {
      const next = [...prev];
      next[index] = newModelId;
      return next;
    });
    setStates((prev) => {
      const next = [...prev];
      next[index] = emptyModelState();
      return next;
    });
  };

  const handleAddModel = () => {
    if (models.length >= 4) return;
    const candidates = [
      "nvidia/nemotron-3.5-lightning:free",
      "qwen/qwen3.8-27b:free",
      "openrouter/free",
      "openai/gpt-4o-mini",
    ];
    const nextModel = candidates.find((c) => !models.includes(c)) || candidates[0];
    setModels((prev) => [...prev, nextModel]);
  };

  const handleRemoveModel = (index: number) => {
    if (models.length <= 1) return;
    abortRefs.current[index]?.abort();
    setModels((prev) => prev.filter((_, i) => i !== index));
    setStates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUseCaseSelect = (uc: typeof USE_CASES[0]) => {
    setActiveUseCase(uc.id);
    setPrompt(uc.prompt);
  };

  // Stream a single model
  const streamModel = useCallback(
    async (index: number, modelId: string, promptText: string) => {
      abortRefs.current[index] = new AbortController();
      const startTime = Date.now();

      setStates((prev) => {
        const next = [...prev];
        next[index] = {
          ...emptyModelState(),
          isRunning: true,
          startTime,
        };
        return next;
      });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            prompt: promptText,
            useTools: false,
          }),
          signal: abortRefs.current[index]?.signal,
        });

        if (!res.ok || !res.body) {
          setStates((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], isRunning: false };
            return next;
          });
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
              setStates((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], isRunning: false };
                return next;
              });
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "done" || parsed.t === "done") {
                setStates((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], isRunning: false };
                  return next;
                });
                return;
              }

              // Reasoning text
              const reasoningChunk = parsed.delta && parsed.type === "reasoning"
                ? parsed.delta
                : parsed.t === "reasoning" ? parsed.c : null;
              if (reasoningChunk) {
                setStates((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], reasoning: next[index].reasoning + reasoningChunk };
                  return next;
                });
              }

              // Answer content
              const contentChunk = parsed.delta && (parsed.type === "content" || parsed.type === "text")
                ? parsed.delta
                : (parsed.t === "text" || parsed.t === "content") ? parsed.c : null;
              if (contentChunk) {
                setStates((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], answer: next[index].answer + contentChunk };
                  return next;
                });
              }

              // Usage / metrics
              const u = parsed.usage || (parsed.t === "metrics" ? parsed.data : null);
              if (u) {
                setStates((prev) => {
                  const next = [...prev];
                  next[index] = {
                    ...next[index],
                    promptTokens: u.prompt_tokens ?? next[index].promptTokens,
                    completionTokens: u.completion_tokens ?? next[index].completionTokens,
                    latencyMs: u.latency_ms ?? next[index].latencyMs,
                    estCostUsd: u.total_cost_usd ?? u.cost ?? next[index].estCostUsd,
                    reasoningTokens: u.reasoning_tokens ?? next[index].reasoningTokens,
                  };
                  return next;
                });
              }

              // Error handling
              if (parsed.type === "error" || parsed.error) {
                const errMsg = parsed.error || "Generation error";
                setStates((prev) => {
                  const next = [...prev];
                  next[index] = {
                    ...next[index],
                    answer: next[index].answer ? `${next[index].answer}\n\n⚠ ${errMsg}` : `⚠ ${errMsg}`,
                    isRunning: false,
                  };
                  return next;
                });
              }
            } catch {
              // ignore parse errors in stream
            }
          }
        }

        setStates((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            isRunning: false,
            latencyMs: next[index].latencyMs || Date.now() - startTime,
          };
          return next;
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream failed:", err);
        }
        setStates((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], isRunning: false };
          return next;
        });
      }
    },
    []
  );

  const handleRunAll = () => {
    if (!prompt.trim() || isAnyRunning) return;
    models.forEach((modelId, idx) => {
      streamModel(idx, modelId, prompt.trim());
    });
  };

  const handleStopAll = () => {
    abortRefs.current.forEach((ref) => ref?.abort());
    setStates((prev) => prev.map((s) => ({ ...s, isRunning: false })));
  };

  // Active ground truth item for selected use case
  const currentUseCaseConfig = USE_CASES.find((u) => u.id === activeUseCase);
  const goldItem = currentUseCaseConfig?.goldKey
    ? BENCHMARK_GOLD_REGISTRY[currentUseCaseConfig.goldKey]
    : undefined;

  return (
    <div className="h2h-root" style={{ display: "flex", gap: "20px", padding: "24px", maxWidth: "1680px", margin: "0 auto" }}>
      {/* ── Left Sidebar (Controls & Use Cases) ── */}
      <div
        className="h2h-sidebar"
        style={{
          width: "320px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Model Slots Card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(11, 22, 40, 0.9)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--cyan)", letterSpacing: "0.06em" }}>
              Active Models ({models.length} of 4)
            </span>
            {models.length < 4 && (
              <button
                onClick={handleAddModel}
                style={{
                  fontSize: "0.72rem",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  background: "rgba(0, 212, 255, 0.12)",
                  border: "1px solid rgba(0, 212, 255, 0.3)",
                  color: "var(--cyan)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ＋ Add Model
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {models.map((modelId, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1 }}>
                  <ModelSelectWidget
                    label={`Model ${idx + 1}`}
                    value={modelId}
                    onChange={(newId) => handleModelChange(idx, newId)}
                  />
                </div>
                {models.length > 1 && (
                  <button
                    onClick={() => handleRemoveModel(idx)}
                    style={{
                      marginTop: "16px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                    title="Remove model"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases Card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(11, 22, 40, 0.9)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--cyan)", letterSpacing: "0.06em", marginBottom: "10px" }}>
            Insurance Use Cases
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {USE_CASES.map((uc) => {
              const isSelected = activeUseCase === uc.id;
              return (
                <button
                  key={uc.id}
                  onClick={() => handleUseCaseSelect(uc)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    textAlign: "left",
                    background: isSelected ? "rgba(0, 212, 255, 0.12)" : "rgba(255, 255, 255, 0.02)",
                    border: isSelected ? "1px solid var(--cyan)" : "1px solid var(--border)",
                    color: isSelected ? "var(--cyan-light)" : "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: isSelected ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>{uc.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Workspace Area ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Prompt Input Card */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(11, 22, 40, 0.9)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Evaluation Prompt & Scenario
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {isAnyRunning ? (
                <button
                  onClick={handleStopAll}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    background: "rgba(244, 63, 94, 0.2)",
                    border: "1px solid var(--rose)",
                    color: "var(--rose)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⏹ Stop Stream
                </button>
              ) : (
                <button
                  onClick={handleRunAll}
                  disabled={!prompt.trim()}
                  style={{
                    padding: "6px 18px",
                    borderRadius: "6px",
                    background: "var(--cyan)",
                    border: "none",
                    color: "#050b14",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: prompt.trim() ? "pointer" : "not-allowed",
                    boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)",
                  }}
                >
                  ▶ Run Head-to-Head ({models.length} Models)
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type insurance prompt or policy clauses to evaluate..."
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "0.82rem",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          {/* Quick chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(chip)}
                style={{
                  fontSize: "0.68rem",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dynamic Multi-Model Grid (Up to 4 columns!) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${models.length}, minmax(300px, 1fr))`,
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          {models.map((modelId, idx) => (
            <ModelColumn
              key={`${idx}-${modelId}`}
              index={idx}
              modelId={modelId}
              state={states[idx] || emptyModelState()}
              useCaseId={activeUseCase}
              goldItem={goldItem}
              canRemove={models.length > 1}
              onRemove={() => handleRemoveModel(idx)}
            />
          ))}
        </div>

        {/* ── Domain Evaluation Scorecard (All 8 Use-Case Metrics) ── */}
        <UseCaseScorecard
          useCaseId={activeUseCase}
          models={models}
          states={states}
          goldItem={goldItem}
        />
      </div>
    </div>
  );
}

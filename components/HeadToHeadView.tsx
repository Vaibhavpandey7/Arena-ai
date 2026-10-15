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
import { DocumentPreviewModal, ParsedDocument } from "./DocumentPreviewModal";
import { DocumentIngestModal } from "./DocumentIngestModal";

/* ── Use Cases ─────────────────────────────────────────────────────────────── */
const USE_CASES: { id: InsuranceUseCaseId; icon: string; label: string; prompt: string; goldKey?: string }[] = [
  {
    id: "data-extraction",
    icon: "01",
    label: "Data Extraction",
    prompt: "",
    goldKey: "SC-001",
  },
  {
    id: "policy-translation",
    icon: "02",
    label: "Policy Translation / Understanding",
    prompt: "",
    goldKey: "SC-002",
  },
  {
    id: "ai-triage",
    icon: "03",
    label: "AI Triage",
    prompt: "",
    goldKey: "SC-003",
  },
  {
    id: "claim-assessment",
    icon: "04",
    label: "Claim Assessment",
    prompt: "",
    goldKey: "SC-004",
  },
  {
    id: "eiopa-regulatory",
    icon: "05",
    label: "EIOPA Regulatory Check",
    prompt: "",
    goldKey: "SC-005",
  },
  {
    id: "underwriting-risk",
    icon: "06",
    label: "Underwriting Risk Assessment",
    prompt: "",
    goldKey: "SC-006",
  },
  {
    id: "actuarial-reasoning",
    icon: "07",
    label: "Actuarial Reasoning",
    prompt: "",
    goldKey: "SC-008",
  },
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
  showAnalytics = false,
  onToggleAnalytics,
  layoutMode = "vertical",
  isCollapsed = false,
  onToggleCollapse,
}: {
  index: number;
  modelId: string;
  state: ModelState;
  useCaseId: InsuranceUseCaseId;
  goldItem?: { goldResponse: string; evidence: string };
  onRemove?: () => void;
  canRemove?: boolean;
  showAnalytics?: boolean;
  onToggleAnalytics?: () => void;
  layoutMode?: "vertical" | "columns";
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [showThinking, setShowThinking] = useState(true);
  const [copied, setCopied] = useState(false);
  const modelInfo = getModel(modelId);
  const displayName = modelInfo?.label ?? modelId.split("/").pop() ?? modelId;
  const isFree = modelInfo?.isFree || modelId.endsWith(":free");
  const hasContent = Boolean(state.reasoning || state.answer || state.isRunning);
  const elapsedSec = (state.elapsed / 1000).toFixed(1);

  const activeGold = state.customGold || goldItem?.goldResponse;
  const activeEvidence = state.customEvidence || goldItem?.evidence;

  const handleCopy = () => {
    if (!state.answer) return;
    navigator.clipboard.writeText(state.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      id={`model-card-${index}`}
      className="h2h-model-col"
      style={{
        flex: 1,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxSizing: "border-box",
        transition: "all 0.2s ease",
      }}
    >
      {/* Column Header */}
      <div
        className="h2h-col-header"
        style={{
          padding: layoutMode === "vertical" ? "12px 18px" : "10px 14px",
          background: "var(--bg-surface)",
          borderBottom: isCollapsed ? "none" : "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: "4px",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
            }}
          >
            M{index + 1}
          </span>
          <span
            style={{
              fontSize: "13.5px",
              fontWeight: 600,
              fontFamily: "var(--font-display-new)",
              color: "var(--text-main)",
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
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "var(--emerald-dim)",
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
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "var(--violet-dim)",
                color: "var(--violet)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                fontWeight: 700,
              }}
            >
              REASONING
            </span>
          )}
          {state.isRunning && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span className="spinner-border" style={{ width: "9px", height: "9px" }} /> Streaming...
            </span>
          )}
          {state.latencyMs > 0 && !state.isRunning && (
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "4px",
                background: "var(--emerald-dim)",
                color: "var(--emerald)",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >
              {(state.latencyMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Live Quick Stats Strip */}
        {layoutMode === "vertical" && (state.promptTokens > 0 || state.completionTokens > 0 || state.estCostUsd !== undefined) && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "11.5px", color: "var(--text-subtle)" }}>
            {(state.promptTokens > 0 || state.completionTokens > 0) && (
              <span style={{ fontFamily: "var(--font-mono)" }}>
                Tokens: <strong style={{ color: "var(--accent)" }}>{state.promptTokens || 0}</strong> in / <strong style={{ color: "var(--accent)" }}>{state.completionTokens || 0}</strong> out
              </span>
            )}
            {state.estCostUsd !== undefined && (
              <span style={{ fontFamily: "var(--font-mono)" }}>
                Cost: <strong style={{ color: isFree ? "var(--emerald)" : "var(--amber)" }}>{isFree ? "FREE" : `$${state.estCostUsd.toFixed(4)}`}</strong>
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {state.answer && (
            <button
              type="button"
              className="arena-header-btn"
              onClick={handleCopy}
              style={{ fontSize: "11px", padding: "3px 8px" }}
              title="Copy model response to clipboard"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}

          {hasContent && onToggleCollapse && (
            <button
              type="button"
              className="arena-header-btn"
              onClick={onToggleCollapse}
              style={{ fontSize: "11px", padding: "3px 8px" }}
              title={isCollapsed ? "Expand model response" : "Collapse model response"}
            >
              {isCollapsed ? "▼ Expand" : "▲ Collapse"}
            </button>
          )}

          {canRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="arena-header-btn"
              style={{
                fontSize: "12px",
                padding: "2px 6px",
                color: "var(--rose)",
                borderColor: "transparent",
              }}
              title="Remove model from comparison"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Column Body (Hidden when card is collapsed) */}
      {!isCollapsed && (
      <div
        style={{
          flex: 1,
          padding: layoutMode === "vertical" ? "18px 22px" : "14px 16px",
          overflowY: layoutMode === "vertical" ? "visible" : "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
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
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Ready for Evaluation
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-subtle)", maxWidth: "260px", lineHeight: 1.4 }}>
              Click Run to stream responses side-by-side.
            </div>
          </div>
        ) : (
          <>
            {/* Live Metrics Row - Shown ONLY when Analytics is ON */}
            {showAnalytics && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "6px",
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-subtle)", textTransform: "uppercase" }}>Tokens In</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    {state.promptTokens || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-subtle)", textTransform: "uppercase" }}>Tokens Out</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    {state.completionTokens || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-subtle)", textTransform: "uppercase" }}>Latency</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                    {state.latencyMs ? `${(state.latencyMs / 1000).toFixed(2)}s` : state.isRunning ? `${elapsedSec}s...` : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-subtle)", textTransform: "uppercase" }}>Cost</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                    {isFree ? "FREE" : state.estCostUsd ? `$${state.estCostUsd.toFixed(4)}` : "$0.00"}
                  </div>
                </div>
              </div>
            )}

            {/* Reasoning / Thinking Drawer */}
            {state.reasoning && (
              <div
                style={{
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  background: "var(--violet-dim)",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setShowThinking(!showThinking)}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(139, 92, 246, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--violet)",
                  }}
                >
                  <span>Thinking Process ({state.reasoning.split(/\s+/).length} words)</span>
                  <span>{showThinking ? "▲" : "▼"}</span>
                </div>
                {showThinking && (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      lineHeight: 1.55,
                      color: "var(--text-muted)",
                      maxHeight: "180px",
                      overflowY: "auto",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "pre-wrap",
                      background: "var(--bg-surface)",
                    }}
                  >
                    {state.reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Response Content */}
            <div style={{ flex: 1, fontSize: "13.5px", lineHeight: 1.65, color: "var(--text-main)" }}>
              {state.answer ? (
                <div className="prose prose-invert max-w-none arena-msg-bubble" style={{ background: "transparent", padding: 0, border: "none", maxWidth: "100%" }}>
                  <ReactMarkdown>{state.answer}</ReactMarkdown>
                </div>
              ) : state.isRunning ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent)", fontSize: "13px" }}>
                  <span className="spinner-border" /> Generating response...
                </div>
              ) : null}
            </div>

            {/* Metrics footer when finished */}
            {state.answer && !state.isRunning && (
              <div className="arena-msg-metrics" style={{ marginTop: "4px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
                {state.promptTokens > 0 && <span>{state.promptTokens.toLocaleString()} in</span>}
                {state.completionTokens > 0 && <span>{state.completionTokens.toLocaleString()} out</span>}
                {state.latencyMs > 0 && <span>{(state.latencyMs / 1000).toFixed(2)}s</span>}
                {state.estCostUsd !== undefined && (
                  <span>
                    {isFree ? "FREE" : state.estCostUsd < 0.0001 ? `$${state.estCostUsd.toExponential(2)}` : `$${state.estCostUsd.toFixed(4)}`}
                  </span>
                )}
              </div>
            )}

            {/* Ground Truth Alignment Section - Shown ONLY when Analytics is ON */}
            {showAnalytics && state.answer && activeGold && (
              <div style={{ marginTop: "12px" }}>
                <GroundTruthPanel
                  modelAnswer={state.answer}
                  goldResponse={activeGold}
                  evidence={activeEvidence}
                  useCaseId={useCaseId}
                  modelName={displayName}
                />
              </div>
            )}

            {/* Subtle Quick-Link when Analytics is OFF */}
            {!showAnalytics && state.answer && onToggleAnalytics && (
              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={onToggleAnalytics}
                  className="arena-header-btn"
                  style={{
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Show Ground Truth and Domain Metrics"
                >
                  <span>View Analytics</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
      )}
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
        marginTop: "16px",
        padding: "18px 20px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Domain Evaluation Scorecard
            </span>
            <span
              style={{
                fontSize: "10.5px",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
                fontWeight: 600,
              }}
            >
              {config.recommendedBenchmark.name}
            </span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display-new)", color: "var(--text-main)", margin: "4px 0 0 0" }}>
            {config.title}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {config.primaryMetricsList.map((m, idx) => (
            <span
              key={idx}
              style={{
                fontSize: "10.5px",
                padding: "2px 7px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Primary Metric Comparison Bars */}
      <div
        style={{
          padding: "14px 16px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
          <div>
            <span style={{ fontSize: "10.5px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Primary Metric
            </span>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
              {config.primaryMetric.name}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: colors[idx % colors.length] }}>
                    M{idx + 1}: {modelName}
                  </span>
                  <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                    {ev ? `${score}%` : "Pending..."}
                  </span>
                </div>
                <div style={{ height: "6px", borderRadius: "3px", background: "var(--bg-surface-elevated)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${score}%`,
                      background: colors[idx % colors.length],
                      borderRadius: "3px",
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
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          Secondary Metrics Matrix
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-subtle)", fontWeight: 600 }}>Metric</th>
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
                    borderBottom: "1px solid var(--border-subtle)",
                    background: secIdx % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "transparent",
                  }}
                >
                  <td style={{ padding: "8px 12px", color: "var(--text-main)", fontWeight: 500 }} title={sec.description}>
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
                          color: score !== undefined ? (score >= 75 ? "var(--emerald)" : score >= 50 ? "var(--cyan-light)" : "var(--amber)") : "var(--text-subtle)",
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
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ]);
  const [states, setStates] = useState<ModelState[]>([emptyModelState(), emptyModelState()]);
  const [activeUseCase, setActiveUseCase] = useState<InsuranceUseCaseId>("data-extraction");
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [attachedDoc, setAttachedDoc] = useState<ParsedDocument | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showDocIngestModal, setShowDocIngestModal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Clutter-free UI states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"vertical" | "columns">("vertical");
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRefs = useRef<(AbortController | null)[]>([null, null, null, null]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasAnyResults = states.some((s) => Boolean(s.answer || s.reasoning || s.isRunning));

  // Sync initialPrompt from benchmark or external navigation
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      setTimeout(() => {
        promptTextareaRef.current?.focus();
      }, 50);
      onReady?.();
    }
  }, [initialPrompt, onReady]);

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
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3.5-lightning:free",
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
                    answer: next[index].answer ? `${next[index].answer}\n\n[Error: ${errMsg}]` : `[Error: ${errMsg}]`,
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

  const handleDocUpload = async (file: File) => {
    setIsUploadingDoc(true);
    setUploadError(null);
    const localFileUrl = URL.createObjectURL(file);
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

      // If server signals that it needs client-side page rendering (e.g. deployed on Vercel without poppler)
      if (data.needsClientOcr && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        try {
          const { renderPdfPagesToImages } = await import("@/lib/client-pdf-renderer");
          const renderedPages = await renderPdfPagesToImages(file, 5);
          if (renderedPages.length > 0) {
            const ocrFormData = new FormData();
            ocrFormData.append("file", file);
            ocrFormData.append("pageImages", JSON.stringify(renderedPages));
            const ocrRes = await fetch("/api/documents/parse", {
              method: "POST",
              body: ocrFormData,
            });
            const ocrData = await ocrRes.json();
            if (ocrData.success && ocrData.document) {
              setAttachedDoc({
                ...ocrData.document,
                fileUrl: localFileUrl || ocrData.document.fileUrl,
                mimeType: file.type || "application/pdf",
              });
              return;
            }
          }
        } catch (clientOcrErr) {
          console.warn("Client-side PDF rendering fallback failed:", clientOcrErr);
        }
      }

      setAttachedDoc({
        ...data.document,
        fileUrl: localFileUrl || data.document.fileUrl,
        mimeType: file.type || "application/pdf",
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleDocUpload(files[0]);
    }
  };

  const getEffectivePrompt = useCallback(
    (userPrompt: string): string => {
      if (!attachedDoc) return userPrompt;
      const docHeader = `[ATTACHED POLICY / DOCUMENT: ${attachedDoc.name} | Type: ${attachedDoc.type} | Size: ${attachedDoc.formattedSize}]\n--- DOCUMENT CONTENT START ---\n${attachedDoc.text}\n--- DOCUMENT CONTENT END ---\n\n`;
      if (!userPrompt.trim()) {
        return `${docHeader}[TASK]\nPlease analyse this attached policy document according to standard insurance underwriting, claims assessment, and regulatory review principles. Summarise key findings, coverage limits, exclusions, deductibles, and risk indicators.`;
      }
      return `${docHeader}[USER INQUIRY / TASK]\n${userPrompt.trim()}`;
    },
    [attachedDoc]
  );

  const handleRunAll = () => {
    const effectivePrompt = getEffectivePrompt(prompt);
    if (!effectivePrompt.trim() || isAnyRunning) return;
    setIsPromptCollapsed(true);
    models.forEach((modelId, idx) => {
      streamModel(idx, modelId, effectivePrompt);
    });
  };

  const handleStopAll = () => {
    abortRefs.current.forEach((ref) => ref?.abort());
    setStates((prev) => prev.map((s) => ({ ...s, isRunning: false })));
  };

  const handleResetResults = () => {
    handleStopAll();
    setStates(models.map(() => emptyModelState()));
    setIsPromptCollapsed(false);
    setShowAnalytics(false);
    setCollapsedCards({});
  };

  // Active ground truth item for selected use case
  const currentUseCaseConfig = USE_CASES.find((u) => u.id === activeUseCase);
  const goldItem = currentUseCaseConfig?.goldKey
    ? BENCHMARK_GOLD_REGISTRY[currentUseCaseConfig.goldKey]
    : undefined;

  return (
    <div className="h2h-layout">
      {/* ── Left Sidebar (Controls & Use Cases) ── */}
      <aside className="h2h-sidebar">
        {/* Model Slots Card */}
        <div className="h2h-sidebar-section">
          <div className="h2h-sidebar-label">
            <span>Active Models ({models.length} of 4)</span>
            {models.length < 4 && (
              <button
                type="button"
                onClick={handleAddModel}
                className="h2h-add-model-btn"
                title="Add model to comparison"
              >
                ＋ Add Model
              </button>
            )}
          </div>

          <div className="h2h-models-container">
            {models.map((modelId, idx) => (
              <div key={idx} className="arena-active-model" style={{ padding: "8px 10px", gap: "4px" }}>
                <ModelSelectWidget
                  label={`M${idx + 1}`}
                  value={modelId}
                  onRemove={models.length > 1 ? () => handleRemoveModel(idx) : undefined}
                  onChange={(newId) => handleModelChange(idx, newId)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases Card */}
        <div className="h2h-sidebar-section">
          <div className="h2h-sidebar-label">
            <span>Insurance Use Cases</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {USE_CASES.map((uc) => {
              const isSelected = activeUseCase === uc.id;
              const ucConfig = INSURANCE_USE_CASES[uc.id];
              return (
                <div
                  key={uc.id}
                  className={`h2h-usecase-item${isSelected ? " active" : ""}`}
                  onClick={() => handleUseCaseSelect(uc)}
                >
                  <div className="h2h-usecase-header">
                    <span className="h2h-usecase-label">{uc.label}</span>
                  </div>
                  {ucConfig && (
                    <div className="h2h-usecase-meta">
                      <span className="h2h-usecase-bench-name">
                        {ucConfig.recommendedBenchmark.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Policy Document Context Card */}
        <div className="h2h-sidebar-section">
          <div className="h2h-sidebar-label">
            <span>Context</span>
            {attachedDoc && (
              <span style={{ fontSize: "9px", color: "var(--emerald)", fontWeight: 700 }}>
                ATTACHED
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleDocUpload(f);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />

          {isUploadingDoc ? (
            <div className="arena-context-drop parsing">
              <div className="arena-btn-spinner" />
              <span>Parsing & running OCR...</span>
            </div>
          ) : attachedDoc ? (
            <div className="arena-context-attached-card">
              <div className="arena-context-attached-header">
                <span
                  className={`doc-badge doc-badge-${(attachedDoc.type?.toUpperCase().includes("OCR") ? "ocr" : attachedDoc.type.toLowerCase()).replace(/[^a-z0-9_-]/g, "-")}`}
                >
                  {attachedDoc.type?.toUpperCase().includes("OCR") ? "OCR" : attachedDoc.type}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedDoc(null)}
                  className="attached-remove-btn"
                  title="Detach document"
                >
                  ✕
                </button>
              </div>
              <div className="arena-context-attached-title" title={attachedDoc.name}>
                {attachedDoc.name}
              </div>
              <div className="arena-context-attached-meta">
                {attachedDoc.formattedSize} · {attachedDoc.wordCount.toLocaleString()} words · ~{attachedDoc.tokenCount.toLocaleString()} tokens
              </div>
              <div className="arena-context-attached-actions">
                <button
                  type="button"
                  className="arena-context-btn"
                  onClick={() => setShowDocPreview(true)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="arena-context-btn highlight"
                  onClick={() => setShowDocIngestModal(true)}
                >
                  Ingest
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`arena-context-drop${isDraggingFile ? " dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em" }}>ATTACH</span>
              <span>
                Attach policy doc,
                <br />
                claim form, or report
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-subtle)", marginTop: "2px" }}>
                PDF, OCR, Images, TXT, CSV
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Workspace Area ── */}
      <div className="h2h-main">
        {/* Sticky Header matching arena-header */}
        <div className="arena-header">
          <div className="arena-header-model">
            <div>
              <div className="arena-header-model-name">
                {currentUseCaseConfig?.label || "Head-to-Head Comparison"}
              </div>
              <div className="arena-header-plugin-count">
                {models.length} Models Active · {currentUseCaseConfig?.goldKey ? `Ground Truth ${currentUseCaseConfig.goldKey}` : "Comparative Analysis"}
              </div>
            </div>
          </div>

          <div className="arena-header-actions" style={{ alignItems: "center", gap: "8px" }}>
            {/* Layout Mode Toggle */}
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
                onClick={() => setLayoutMode("vertical")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: layoutMode === "vertical" ? "var(--accent)" : "transparent",
                  color: layoutMode === "vertical" ? "var(--text-inverted)" : "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Stack models vertically in full-width cards"
              >
                Stacked
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("columns")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: layoutMode === "columns" ? "var(--accent)" : "transparent",
                  color: layoutMode === "columns" ? "var(--text-inverted)" : "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Display models side-by-side in columns"
              >
                Columns
              </button>
            </div>

            {/* Analytics Scorecard Toggle */}
            <button
              type="button"
              className="arena-header-btn"
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: showAnalytics ? "var(--accent-dim)" : undefined,
                borderColor: showAnalytics ? "var(--accent-border)" : undefined,
                color: showAnalytics ? "var(--accent)" : undefined,
                fontWeight: 600,
              }}
              title="Toggle Ground Truth metrics, latency, token costs, and comparative scorecard"
            >
              <span>Scorecard</span>
              {showAnalytics && (
                <span style={{ fontSize: "9px", background: "var(--accent)", color: "var(--text-inverted)", padding: "1px 5px", borderRadius: "6px", fontWeight: 800 }}>
                  ON
                </span>
              )}
            </button>

            {/* Stop / New Comparison */}
            {isAnyRunning ? (
              <button
                type="button"
                onClick={handleStopAll}
                className="arena-header-btn"
                style={{
                  background: "rgba(244, 63, 94, 0.15)",
                  borderColor: "rgba(244, 63, 94, 0.35)",
                  color: "var(--rose)",
                  fontWeight: 700,
                }}
              >
                Stop
              </button>
            ) : hasAnyResults ? (
              <button
                type="button"
                onClick={handleResetResults}
                className="arena-header-btn"
                title="Clear answers and return to prompt workspace"
              >
                New Comparison
              </button>
            ) : null}
          </div>
        </div>

        {/* Scrollable Workspace */}
        <div className="h2h-workspace">
          {/* Recommended Academic Benchmark Grounding Card */}
          {currentUseCaseConfig && (() => {
            const cfg = INSURANCE_USE_CASES[currentUseCaseConfig.id];
            if (!cfg) return null;
            return (
              <div
                style={{
                  padding: hasAnyResults && isPromptCollapsed ? "10px 16px" : "14px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  transition: "all 0.25s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                      {cfg.title}
                    </span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          background: "var(--accent-dim)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-border)",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span>Benchmark:</span>
                        <strong style={{ color: "var(--text-main)" }}>{cfg.recommendedBenchmark.name}</strong>
                      </span>
                    </div>
                </div>

                {/* Show description & full primary metrics list when prompt is not collapsed */}
                {(!hasAnyResults || !isPromptCollapsed) && (
                  <>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                      {cfg.recommendedBenchmark.description}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", letterSpacing: "0.06em" }}>
                        Target Metrics:
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {cfg.primaryMetricsList.map((metricName, mIdx) => (
                          <span
                            key={mIdx}
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: mIdx === 0 ? "var(--accent-dim)" : "var(--bg-surface)",
                              border: mIdx === 0 ? "1px solid var(--accent-border)" : "1px solid var(--border-subtle)",
                              color: mIdx === 0 ? "var(--accent)" : "var(--text-muted)",
                              fontWeight: mIdx === 0 ? 700 : 500,
                            }}
                          >
                            {metricName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── Prompt Section: Collapsed Bar OR Full Input Card ── */}
          {hasAnyResults && isPromptCollapsed ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text-main)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={prompt}
                >
                  <strong style={{ color: "var(--accent)" }}>Active Prompt:</strong> {prompt || "Evaluating attached document"}
                </span>
                {attachedDoc && (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "var(--emerald-dim)",
                      color: "var(--emerald)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {attachedDoc.name}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="arena-header-btn"
                onClick={() => setIsPromptCollapsed(false)}
                style={{ fontSize: "12px", flexShrink: 0 }}
              >
                Edit Prompt
              </button>
            </div>
          ) : (
            /* Full Prompt Input Card */
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Evaluation Prompt & Scenario
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="arena-header-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    title="Upload an insurance policy, endorsement, scan, or claim file"
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    {isUploadingDoc ? (
                      <>
                        <span className="spinner-border" style={{ width: "12px", height: "12px" }} />
                        <span>Parsing & OCR...</span>
                      </>
                    ) : (
                      <>
                        <span>Upload Document</span>
                        <span style={{ fontSize: "10px", opacity: 0.7 }}>PDF, OCR, TXT</span>
                      </>
                    )}
                  </button>

                  {hasAnyResults && (
                    <button
                      type="button"
                      className="arena-header-btn"
                      onClick={() => setIsPromptCollapsed(true)}
                      style={{ fontSize: "12px" }}
                    >
                      Collapse
                    </button>
                  )}
                  {isAnyRunning && (
                    <button
                      type="button"
                      onClick={handleStopAll}
                      className="arena-header-btn"
                      style={{
                        background: "rgba(244, 63, 94, 0.15)",
                        borderColor: "rgba(244, 63, 94, 0.35)",
                        color: "var(--rose)",
                        fontWeight: 700,
                      }}
                    >
                      Stop Stream
                    </button>
                  )}
                </div>
              </div>

              {uploadError && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    color: "var(--rose)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Error: {uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    style={{ background: "none", border: "none", color: "var(--rose)", cursor: "pointer", fontSize: "14px" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {attachedDoc && (
                <div className="arena-msg-doc-pill" style={{ margin: "2px 0" }}>
                  <span className={`doc-badge doc-badge-${(attachedDoc.type?.toUpperCase().includes("OCR") ? "ocr" : attachedDoc.type.toLowerCase()).replace(/[^a-z0-9_-]/g, "-")}`}>
                    {attachedDoc.type?.toUpperCase().includes("OCR") ? "OCR" : attachedDoc.type}
                  </span>
                  <span className="arena-msg-doc-name" title={attachedDoc.name}>
                    {attachedDoc.name}
                  </span>
                  <span className="arena-msg-doc-meta">
                    {attachedDoc.formattedSize} · {attachedDoc.wordCount.toLocaleString()} words · ~{attachedDoc.tokenCount.toLocaleString()} tokens
                  </span>
                  <button
                    type="button"
                    className="arena-msg-doc-view-btn"
                    onClick={() => setShowDocPreview(true)}
                    title="Preview extracted document text"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="arena-msg-doc-view-btn"
                    onClick={() => setShowDocIngestModal(true)}
                    title="Ingest document to insurance data lake"
                  >
                    Ingest
                  </button>
                  <button
                    type="button"
                    className="attached-remove-btn"
                    onClick={() => setAttachedDoc(null)}
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ position: "relative" }}
              >
                {isDraggingFile && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(19, 19, 20, 0.92)",
                      border: "2px dashed var(--accent)",
                      borderRadius: "var(--radius-sm)",
                      zIndex: 10,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                      Drop Insurance Document Here
                    </span>
                    <span style={{ fontSize: "11.5px", color: "var(--text-subtle)" }}>
                      Supports PDF, Scans (OCR), Images, CSV, TXT, JSON, MD
                    </span>
                  </div>
                )}
                <textarea
                  ref={promptTextareaRef}
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    attachedDoc
                      ? `Document "${attachedDoc.name}" attached. Type evaluation task or leave blank to evaluate policy terms...`
                      : "Type insurance prompt or policy clauses to evaluate, or upload a document above..."
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    lineHeight: 1.55,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-ui)",
                  }}
                />
              </div>

              {/* Run action */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={handleRunAll}
                  disabled={(!prompt.trim() && !attachedDoc) || isAnyRunning}
                  style={{
                    padding: "7px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent)",
                    border: "none",
                    color: "var(--text-inverted)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: (prompt.trim() || attachedDoc) && !isAnyRunning ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all var(--transition-fast)",
                    opacity: (!prompt.trim() && !attachedDoc) || isAnyRunning ? 0.5 : 1,
                  }}
                >
                  <span>Run Comparison</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Pre-Flight Readiness Summary (WHEN NOT RUN YET) ── */}
          {!hasAnyResults ? (
            <div
              style={{
                padding: "32px 24px",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                    Ready to Evaluate {models.length} Models Side-by-Side
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-subtle)", marginTop: "3px" }}>
                    Add or customize models in the left sidebar. Comparative responses will stream in real time.
                  </div>
                </div>
              </div>

              {/* Selected Models Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", maxWidth: "800px" }}>
                {models.map((mId, idx) => {
                  const m = getModel(mId);
                  const name = m?.label ?? mId.split("/").pop() ?? mId;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "var(--accent-dim)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-border)",
                        }}
                      >
                        M{idx + 1}
                      </span>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                        {name}
                      </span>
                      {m?.isFree && (
                        <span style={{ fontSize: "10px", color: "var(--emerald)", fontWeight: 700 }}>
                          FREE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleRunAll}
                disabled={!prompt.trim() && !attachedDoc}
                style={{
                  marginTop: "4px",
                  padding: "10px 28px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent)",
                  border: "none",
                  color: "var(--text-inverted)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: prompt.trim() || attachedDoc ? "pointer" : "not-allowed",
                  boxShadow: "0 0 16px var(--accent-dim)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: prompt.trim() || attachedDoc ? 1 : 0.5,
                }}
              >
                <span>▶ Run Head-to-Head Comparison</span>
              </button>
            </div>
          ) : (
            /* ── Post-Run Results Section ── */
            <>
              {/* Results Action Toolbar with In-Page Analytics Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                    Comparative Responses ({models.length} Models)
                  </span>
                  {isAnyRunning ? (
                    <span style={{ fontSize: "12px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="spinner-border" style={{ width: "12px", height: "12px" }} /> Streaming...
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--emerald)", fontWeight: 600 }}>
                      Responses Complete
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {isAnyRunning ? (
                    <button
                      type="button"
                      onClick={handleStopAll}
                      className="arena-header-btn"
                      style={{
                        background: "rgba(244, 63, 94, 0.15)",
                        borderColor: "rgba(244, 63, 94, 0.35)",
                        color: "var(--rose)",
                        fontWeight: 700,
                      }}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetResults}
                      className="arena-header-btn"
                      title="Clear answers and return to prompt workspace"
                    >
                      New Comparison
                    </button>
                  )}
                </div>
              </div>

              {/* Quick-Jump & Bulk Collapse Toolbar (Vertical Stack Mode) */}
              {layoutMode === "vertical" && models.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                      Quick Jump:
                    </span>
                    {models.map((modelId, idx) => {
                      const modelInfo = getModel(modelId);
                      const name = modelInfo?.label ?? modelId.split("/").pop() ?? modelId;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(`model-card-${idx}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="arena-header-btn"
                          style={{
                            padding: "2px 8px",
                            fontSize: "11px",
                            color: "var(--accent)",
                          }}
                          title={`Scroll to Model ${idx + 1}`}
                        >
                          M{idx + 1}: {name.length > 16 ? name.slice(0, 16) + "…" : name}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<number, boolean> = {};
                        models.forEach((_, i) => { all[i] = true; });
                        setCollapsedCards(all);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-subtle)",
                        fontSize: "11px",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Collapse All
                    </button>
                    <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>·</span>
                    <button
                      type="button"
                      onClick={() => setCollapsedCards({})}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-subtle)",
                        fontSize: "11px",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Expand All
                    </button>
                  </div>
                </div>
              )}

              {/* ── Dynamic Multi-Model Container (Vertical Stack vs Side-by-Side Grid) ── */}
              <div
                style={
                  layoutMode === "vertical"
                    ? {
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        width: "100%",
                        minWidth: 0,
                      }
                    : {
                        display: "grid",
                        gridTemplateColumns:
                          models.length === 4
                            ? "repeat(2, minmax(0, 1fr))"
                            : `repeat(${models.length}, minmax(0, 1fr))`,
                        gap: "16px",
                        alignItems: "stretch",
                        width: "100%",
                        minWidth: 0,
                      }
                }
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
                    showAnalytics={showAnalytics}
                    onToggleAnalytics={() => setShowAnalytics((prev) => !prev)}
                    layoutMode={layoutMode}
                    isCollapsed={Boolean(collapsedCards[idx])}
                    onToggleCollapse={() =>
                      setCollapsedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                  />
                ))}
              </div>

              {/* ── In-Page Domain Evaluation Scorecard (Shown ONLY when Analytics is ON) ── */}
              {showAnalytics && (
                <UseCaseScorecard
                  useCaseId={activeUseCase}
                  models={models}
                  states={states}
                  goldItem={goldItem}
                />
              )}
            </>
          )}
        </div>
      </div>
      {/* ── Document Modals ── */}
      <DocumentPreviewModal
        document={attachedDoc}
        isOpen={showDocPreview}
        onClose={() => setShowDocPreview(false)}
        onSaveToLake={() => {
          setShowDocPreview(false);
          setShowDocIngestModal(true);
        }}
      />

      <DocumentIngestModal
        initialDocument={attachedDoc}
        isOpen={showDocIngestModal}
        onClose={() => setShowDocIngestModal(false)}
        onIngestSuccess={() => {
          setShowDocIngestModal(false);
        }}
      />
    </div>
  );
}

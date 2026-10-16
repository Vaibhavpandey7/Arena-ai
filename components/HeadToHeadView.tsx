"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import StructuredMarkdown from "./StructuredMarkdown";
import { INSTITUTIONAL_INSURANCE_SYSTEM_PROMPT } from "@/lib/prompts";
import ModelSelectWidget from "./ModelSelectWidget";
import GroundTruthPanel from "./GroundTruthPanel";
import { MODEL_REGISTRY, getModel } from "@/lib/model-registry";
import {
  INSURANCE_USE_CASES,
  InsuranceUseCaseId,
  evaluateUseCaseMetrics,
  UseCaseEvaluation,
} from "@/lib/use-case-metrics";
import {
  aggregateReferenceRun,
  evaluateReferenceAnswer,
  type ReferenceScoringPolicy,
  type ReferenceTaskResult,
} from "@/lib/benchmark-eval";
import { BENCHMARK_GOLD_REGISTRY } from "@/lib/benchmark-gold-data";
import { DocumentPreviewModal, ParsedDocument } from "./DocumentPreviewModal";
import { DocumentIngestModal } from "./DocumentIngestModal";
import BenchmarkSampleSelector from "./BenchmarkSampleSelector";
import ManualCsvCaseUpload from "./ManualCsvCaseUpload";
import type {
  InsuranceBenchmarkId,
} from "@/lib/insurance-benchmark-registry";
import { INSURANCE_BENCHMARKS } from "@/lib/insurance-benchmark-registry";
import {
  buildBenchmarkRunAssignments,
  canRunBenchmarkComparison,
  type BenchmarkNavigationSelection,
  type BenchmarkRunConfiguration,
} from "@/lib/benchmark-selection";
import type { ManualInsuranceCsvCase } from "@/lib/manual-insurance-csv";

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
  runStatus?: "success" | "failed" | "cancelled";
  customGold?: string;
  customEvidence?: string;
}

interface BenchmarkSampleResult {
  sampleId: string;
  fullQuestion: string;
  preview: string;
  modelStates: ModelState[];
  correctAnswer?: string;
  options: Record<string, string>;
  scoringPolicy?: ReferenceScoringPolicy;
  sourceLabel: "Benchmark Comparison" | "Manual Upload";
}

interface ComparisonCaseInput {
  id: string;
  fullQuestion: string;
  questionStem?: string;
  correctAnswer?: string;
  options?: Record<string, string>;
  scoringPolicy?: ReferenceScoringPolicy;
}

const BENCHMARK_VERSION = "cufe-inspired-csv-v1";
const MANUAL_UPLOAD_VERSION = "ad-hoc-csv-v1";
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
  idPrefix = "model-card",
  modelId,
  state,
  referenceScoring,
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
  idPrefix?: string;
  modelId: string;
  state: ModelState;
  referenceScoring?: ReferenceTaskResult;
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
      id={`${idPrefix}-${index}`}
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
                <div className="prose prose-invert max-w-none arena-msg-bubble arena-answer-canvas" style={{ background: "transparent", padding: 0, border: "none", maxWidth: "100%" }}>
                  <StructuredMarkdown content={state.answer} />
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
                  referenceScoring={referenceScoring}
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
              Heuristic Domain Evaluation Scorecard
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
          <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
            Heuristic estimates only; not verified benchmark accuracy.
          </div>
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
  initialBenchmarkSelection?: BenchmarkNavigationSelection;
  onReady?: () => void;
}

export default function HeadToHeadView({
  initialPrompt,
  initialBenchmarkSelection,
  onReady,
}: HeadToHeadProps = {}) {
  // Support up to 4 models (defaulted to 100% free models to preserve user credits)
  const [models, setModels] = useState<string[]>([
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ]);
  const [states, setStates] = useState<ModelState[]>([emptyModelState(), emptyModelState()]);
  const [activeUseCase, setActiveUseCase] = useState<InsuranceUseCaseId>("data-extraction");
  const [inputMode, setInputMode] = useState<"benchmark" | "manual">("benchmark");
  const [benchmarkId, setBenchmarkId] = useState<InsuranceBenchmarkId>("accuracy-rigor");
  const [selectedBenchmarkSampleIds, setSelectedBenchmarkSampleIds] = useState<string[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkSampleResult[]>([]);
  const [benchmarkRunCases, setBenchmarkRunCases] = useState<ComparisonCaseInput[]>([]);
  const [manualCsvCases, setManualCsvCases] = useState<ManualInsuranceCsvCase[]>([]);
  const [manualCsvFileName, setManualCsvFileName] = useState("");
  const invalidManualCsvCases = manualCsvCases.filter((item) => item.errors.length > 0);
  const [activeBenchmarkSample, setActiveBenchmarkSample] =
    useState<{ sampleId: string; preview: string } | null>(null);
  const [benchmarkRunConfiguration, setBenchmarkRunConfiguration] =
    useState<BenchmarkRunConfiguration | null>(null);
  const [benchmarkRunError, setBenchmarkRunError] = useState<string | null>(null);
  const [isBenchmarkBatchRunning, setIsBenchmarkBatchRunning] = useState(false);
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
  const [collapsedBenchmarkCards, setCollapsedBenchmarkCards] = useState<Record<string, boolean>>({});

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRefs = useRef<(AbortController | null)[]>([null, null, null, null]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const benchmarkRunCancelledRef = useRef(false);

  const hasAnyResults =
    states.some((s) => Boolean(s.answer || s.reasoning || s.isRunning)) ||
    benchmarkResults.length > 0;

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

  useEffect(() => {
    if (!initialBenchmarkSelection) return;
    setInputMode("benchmark");
    setBenchmarkId(initialBenchmarkSelection.benchmarkId);
    setSelectedBenchmarkSampleIds(initialBenchmarkSelection.sampleIds ?? []);
    setBenchmarkResults([]);
    setBenchmarkRunCases([]);
    setBenchmarkRunConfiguration(null);
    setBenchmarkRunError(null);
    setManualCsvCases([]);
    setManualCsvFileName("");
    setIsPromptCollapsed(false);
    onReady?.();
  }, [initialBenchmarkSelection, onReady]);

  const isAnyRunning = states.some((s) => s.isRunning) || isBenchmarkBatchRunning;

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

  const handleInputModeChange = (nextMode: "benchmark" | "manual") => {
    if (isAnyRunning || nextMode === inputMode) return;
    setInputMode(nextMode);
    setStates(models.map(() => emptyModelState()));
    setBenchmarkResults([]);
    setBenchmarkRunCases([]);
    setBenchmarkRunConfiguration(null);
    setBenchmarkRunError(null);
    setManualCsvCases([]);
    setManualCsvFileName("");
    setIsPromptCollapsed(false);
    setShowAnalytics(false);
  };

  // Stream a single model
  const streamModel = useCallback(
    async (index: number, modelId: string, promptText: string) => {
      abortRefs.current[index] = new AbortController();
      const startTime = Date.now();
      let modelState: ModelState = {
        ...emptyModelState(),
        isRunning: true,
        startTime,
      };
      const updateModelState = (update: (current: ModelState) => ModelState) => {
        modelState = update(modelState);
        setStates((prev) => {
          const next = [...prev];
          next[index] = modelState;
          return next;
        });
      };
      const stopModel = () => {
        updateModelState((current) => ({
          ...current,
          isRunning: false,
          runStatus: current.runStatus ??
            (current.answer.trim() ? "success" : "failed"),
          latencyMs: current.latencyMs || Date.now() - startTime,
        }));
        return modelState;
      };

      setStates((prev) => {
        const next = [...prev];
        next[index] = modelState;
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
          signal: abortRefs.current[index]?.signal,
        });

        if (!res.ok || !res.body) {
          let errorMessage = `Request failed (${res.status})`;
          try {
            const errorBody = await res.json();
            if (errorBody.error) errorMessage = errorBody.error;
          } catch {
            // Keep the HTTP status message when the error response is not JSON.
          }
          updateModelState((current) => ({
            ...current,
            answer: `[Error: ${errorMessage}]`,
            isRunning: false,
            runStatus: "failed",
          }));
          return modelState;
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
              return stopModel();
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "done" || parsed.t === "done") {
                return stopModel();
              }

              // Reasoning text
              const reasoningChunk = parsed.delta && parsed.type === "reasoning"
                ? parsed.delta
                : parsed.t === "reasoning" ? parsed.c : null;
              if (reasoningChunk) {
                updateModelState((current) => ({
                  ...current,
                  reasoning: current.reasoning + reasoningChunk,
                }));
              }

              // Answer content
              const contentChunk = parsed.delta && (parsed.type === "content" || parsed.type === "text")
                ? parsed.delta
                : (parsed.t === "text" || parsed.t === "content") ? parsed.c : null;
              if (contentChunk) {
                updateModelState((current) => ({
                  ...current,
                  answer: current.answer + contentChunk,
                }));
              }

              // Usage / metrics
              const u = parsed.usage || (parsed.t === "metrics" ? parsed.data : null);
              if (u) {
                updateModelState((current) => ({
                  ...current,
                  promptTokens: u.prompt_tokens ?? current.promptTokens,
                  completionTokens: u.completion_tokens ?? current.completionTokens,
                  latencyMs: u.latency_ms ?? current.latencyMs,
                  estCostUsd: u.total_cost_usd ?? u.cost ?? current.estCostUsd,
                  reasoningTokens: u.reasoning_tokens ?? current.reasoningTokens,
                }));
              }

              // Error handling
              if (parsed.type === "error" || parsed.error) {
                const errMsg = parsed.error || "Generation error";
                updateModelState((current) => ({
                  ...current,
                  answer: current.answer
                    ? `${current.answer}\n\n[Error: ${errMsg}]`
                    : `[Error: ${errMsg}]`,
                  isRunning: false,
                  runStatus: "failed",
                }));
              }
            } catch {
              // ignore parse errors in stream
            }
          }
        }

        return stopModel();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream failed:", err);
        }
        updateModelState((current) => ({
          ...current,
          answer: err.name === "AbortError"
            ? current.answer
            : current.answer || `[Error: ${err.message || "Stream failed"}]`,
          isRunning: false,
          runStatus: err.name === "AbortError" ? "cancelled" : "failed",
          latencyMs: current.latencyMs || Date.now() - startTime,
        }));
        return modelState;
      }
    },
    []
  );

  const handleDocUpload = async (file: File) => {
    setIsUploadingDoc(true);
    setUploadError(null);
    const localFileUrl = URL.createObjectURL(file);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(file.name);

    try {
      let clientExtractedText = "";
      let clientDetectedType = isPdf ? "PDF" : isImage ? "OCR" : "text";

      // 1. Instant client digital text extraction across all pages
      if (isPdf) {
        try {
          const { extractAllDigitalTextFromPdf } = await import("@/lib/client-pdf-renderer");
          const digitalRes = await extractAllDigitalTextFromPdf(file);
          if (digitalRes.hasDigitalText && digitalRes.text.length > 40) {
            clientExtractedText = digitalRes.text;
            clientDetectedType = "PDF";
          }
        } catch (digitalErr) {
          console.warn("HeadToHead client digital extraction pre-check:", digitalErr);
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      if (clientExtractedText) {
        formData.append("extractedText", clientExtractedText);
        formData.append("detectedType", clientDetectedType);
      }

      const res = await fetch("/api/documents/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse document");
      }

      let doc = {
        ...data.document,
        fileUrl: localFileUrl || data.document.fileUrl,
        mimeType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
      };

      // 2. Free OCR (Tesseract.js) for Scanned PDFs or Images
      if (data.needsClientOcr) {
        if (isPdf) {
          try {
            const { ocrPdfWithTesseract } = await import("@/lib/client-pdf-renderer");
            const ocrRes = await ocrPdfWithTesseract(file, 0);
            if (ocrRes.text && ocrRes.text.length > 10) {
              const saveFormData = new FormData();
              saveFormData.append("file", file);
              saveFormData.append("extractedText", ocrRes.text);
              saveFormData.append("detectedType", "OCR");
              const saveRes = await fetch("/api/documents/parse", {
                method: "POST",
                body: saveFormData,
              });
              const saveData = await saveRes.json();
              if (saveData.success && saveData.document) {
                doc = {
                  ...saveData.document,
                  fileUrl: localFileUrl || saveData.document.fileUrl,
                  mimeType: "application/pdf",
                  type: "OCR",
                };
              } else {
                doc = {
                  ...doc,
                  text: ocrRes.text,
                  wordCount: ocrRes.wordCount,
                  charCount: ocrRes.charCount,
                  type: "OCR",
                  preview: ocrRes.text.slice(0, 350) + "…",
                };
              }
            }
          } catch (ocrErr) {
            console.warn("HeadToHead Tesseract OCR failed:", ocrErr);
          }
        } else if (isImage) {
          try {
            const { ocrImageWithTesseract } = await import("@/lib/client-pdf-renderer");
            const imageText = await ocrImageWithTesseract(file);
            if (imageText && imageText.length > 5) {
              const saveFormData = new FormData();
              saveFormData.append("file", file);
              saveFormData.append("extractedText", imageText);
              saveFormData.append("detectedType", "OCR");
              const saveRes = await fetch("/api/documents/parse", {
                method: "POST",
                body: saveFormData,
              });
              const saveData = await saveRes.json();
              if (saveData.success && saveData.document) {
                doc = {
                  ...saveData.document,
                  fileUrl: localFileUrl || saveData.document.fileUrl,
                  mimeType: file.type || "image/png",
                  type: "OCR",
                };
              }
            }
          } catch (imageOcrErr) {
            console.warn("HeadToHead image OCR failed:", imageOcrErr);
          }
        }
      }

      setAttachedDoc(doc);
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
    if (inputMode !== "manual") return;
    const effectivePrompt = getEffectivePrompt(prompt);
    if (!effectivePrompt.trim() || isAnyRunning) return;
    setIsPromptCollapsed(true);
    models.forEach((modelId, idx) => {
      streamModel(idx, modelId, effectivePrompt);
    });
  };

  const executeComparisonCases = async (
    items: ComparisonCaseInput[],
    configuration: BenchmarkRunConfiguration
  ) => {
    if (!items.length || isAnyRunning || isBenchmarkBatchRunning) return;

    const runModels = [...configuration.models];
    benchmarkRunCancelledRef.current = false;
    setIsBenchmarkBatchRunning(true);
    setBenchmarkRunError(null);
    setBenchmarkResults([]);
    setBenchmarkRunCases(items);
    setBenchmarkRunConfiguration(configuration);
    setStates(runModels.map(() => emptyModelState()));
    setIsPromptCollapsed(true);
    setShowAnalytics(false);

    try {
      for (const item of items) {
        if (benchmarkRunCancelledRef.current) break;
        const preview = item.questionStem ||
          item.fullQuestion.replace(/\s+/g, " ").trim().slice(0, 240);
        setActiveBenchmarkSample({ sampleId: item.id, preview });

        const assignments = buildBenchmarkRunAssignments([item.id], runModels);
        const modelStates = await Promise.all(
          assignments.map((assignment) =>
            streamModel(
              assignment.modelIndex,
              assignment.modelId,
              item.fullQuestion
            )
          )
        );
        const statesWithGold = modelStates.map((modelState) => ({
          ...modelState,
          ...(item.correctAnswer ? { customGold: item.correctAnswer } : {}),
        }));
        setBenchmarkResults((previous) => [
          ...previous,
          {
            sampleId: item.id,
            fullQuestion: item.fullQuestion,
            preview,
            modelStates: statesWithGold,
            correctAnswer: item.correctAnswer,
            options: item.options ?? {},
            scoringPolicy: item.scoringPolicy,
            sourceLabel: configuration.source === "manual-upload"
              ? "Manual Upload"
              : "Benchmark Comparison",
          },
        ]);
      }
    } catch (error) {
      setBenchmarkRunError(
        error instanceof Error ? error.message : "Benchmark comparison failed."
      );
    } finally {
      setIsBenchmarkBatchRunning(false);
    }
  };

  const handleRunBenchmarkComparison = async () => {
    if (
      !canRunBenchmarkComparison(selectedBenchmarkSampleIds, models) ||
      isAnyRunning ||
      isBenchmarkBatchRunning
    ) return;

    try {
      const response = await fetch("/api/insurance-benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benchmarkId,
          sampleIds: [...selectedBenchmarkSampleIds],
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Unable to load selected benchmark samples.");
      }
      if (!Array.isArray(body.records) || !Array.isArray(body.evaluation)) {
        throw new Error("Benchmark response is missing inference inputs or scoring references.");
      }
      const evaluationById = new Map<string, {
        options: Record<string, string>;
        correctAnswer: string;
        scoringPolicy: ReferenceScoringPolicy;
      }>();
      for (const entry of body.evaluation as {
          id: string;
          options: Record<string, string>;
          correctAnswer: string;
          scoringPolicy: ReferenceScoringPolicy;
        }[]) {
        evaluationById.set(entry.id, entry);
      }
      const comparisonCases = (body.records as ComparisonCaseInput[]).map((record) => {
        const reference = evaluationById.get(record.id);
        if (!reference) {
          throw new Error(`Benchmark response is missing the scoring reference for "${record.id}".`);
        }
        return { ...record, ...reference };
      });
      await executeComparisonCases(comparisonCases, {
        source: "benchmark",
        benchmarkId,
        benchmarkVersion: BENCHMARK_VERSION,
        selectedSampleIds: [...selectedBenchmarkSampleIds],
        models: [...models],
        sharedPromptConfiguration: {
          inputField: "fullQuestion",
          systemPrompt: null,
          useTools: false,
        },
      });
    } catch (error) {
      setBenchmarkRunError(
        error instanceof Error ? error.message : "Benchmark comparison failed."
      );
    }
  };

  const handleRunManualCsvComparison = async () => {
    const validCases = manualCsvCases.filter((item) => item.errors.length === 0);
    if (
      invalidManualCsvCases.length > 0 ||
      !canRunBenchmarkComparison(validCases.map((item) => item.id), models) ||
      isAnyRunning ||
      isBenchmarkBatchRunning
    ) return;

    await executeComparisonCases(
      validCases.map((item) => ({
        ...item,
        options: item.options,
      })),
      {
        source: "manual-upload",
        benchmarkVersion: MANUAL_UPLOAD_VERSION,
        uploadFileName: manualCsvFileName || undefined,
        selectedSampleIds: validCases.map((item) => item.id),
        models: [...models],
        sharedPromptConfiguration: {
          inputField: "fullQuestion",
          systemPrompt: null,
          useTools: false,
        },
      }
    );
  };

  const handleStopAll = () => {
    benchmarkRunCancelledRef.current = true;
    abortRefs.current.forEach((ref) => ref?.abort());
    setStates((prev) => prev.map((s) => ({ ...s, isRunning: false })));
  };

  const handleResetResults = () => {
    handleStopAll();
    setStates(models.map(() => emptyModelState()));
    setIsPromptCollapsed(false);
    setShowAnalytics(false);
    setCollapsedCards({});
    setBenchmarkResults([]);
    setBenchmarkRunCases([]);
    setActiveBenchmarkSample(null);
    setBenchmarkRunConfiguration(null);
    setBenchmarkRunError(null);
  };

  const handleManualCsvCasesChange = (cases: ManualInsuranceCsvCase[]) => {
    setManualCsvCases(cases);
    setBenchmarkRunError(null);
    if (benchmarkRunConfiguration?.source === "manual-upload") {
      setBenchmarkResults([]);
      setBenchmarkRunCases([]);
      setBenchmarkRunConfiguration(null);
    }
  };

  // Active ground truth item for selected use case
  const currentUseCaseConfig = USE_CASES.find((u) => u.id === activeUseCase);
  const goldItem = currentUseCaseConfig?.goldKey
    ? BENCHMARK_GOLD_REGISTRY[currentUseCaseConfig.goldKey]
    : undefined;
  const benchmarkModelSummaries = benchmarkRunConfiguration
    ? benchmarkRunConfiguration.models.map((modelId, modelIndex) => {
        const sampleEvaluations = benchmarkResults.map((result) => {
          const state = result.modelStates[modelIndex];
          return {
            sampleId: result.sampleId,
            fullQuestion: result.fullQuestion,
            reference: result.correctAnswer,
            options: result.options,
            policy: result.scoringPolicy,
            response: state?.answer,
            status: state?.runStatus ??
              (state?.answer ? "success" as const : "cancelled" as const),
            metric: state?.runStatus === "success" || (!state?.runStatus && state?.answer)
              ? evaluateReferenceAnswer(
                  state.answer,
                  result.correctAnswer,
                  result.options,
                  result.scoringPolicy
                )
              : undefined,
            latencyMs: state?.latencyMs ?? 0,
          };
        });
        return {
          modelId,
          aggregate: aggregateReferenceRun(
            sampleEvaluations,
            benchmarkRunConfiguration.selectedSampleIds.length,
            isBenchmarkBatchRunning
              ? Math.max(
                  0,
                  benchmarkRunConfiguration.selectedSampleIds.length -
                    benchmarkResults.length
                )
              : 0
          ),
          sampleEvaluations,
          promptTokens: benchmarkResults.reduce(
            (sum, result) => sum + (result.modelStates[modelIndex]?.promptTokens ?? 0),
            0
          ),
          completionTokens: benchmarkResults.reduce(
            (sum, result) => sum + (result.modelStates[modelIndex]?.completionTokens ?? 0),
            0
          ),
          latencyMs: benchmarkResults.reduce(
            (sum, result) => sum + (result.modelStates[modelIndex]?.latencyMs ?? 0),
            0
          ),
          costUsd: benchmarkResults.reduce(
            (sum, result) => sum + (result.modelStates[modelIndex]?.estCostUsd ?? 0),
            0
          ),
          hasCostData: benchmarkResults.some(
            (result) => (result.modelStates[modelIndex]?.estCostUsd ?? 0) > 0
          ) || Boolean(getModel(modelId)?.isFree),
          averageResponseMs: benchmarkResults.reduce(
            (sum, result) => sum + (result.modelStates[modelIndex]?.latencyMs ?? 0),
            0
          ) / Math.max(1, benchmarkResults.filter(
            (result) => result.modelStates[modelIndex]?.runStatus === "success"
          ).length),
          failedRate: benchmarkResults.filter(
            (result) => result.modelStates[modelIndex]?.runStatus === "failed"
          ).length / Math.max(1, benchmarkRunConfiguration.selectedSampleIds.length),
        };
      })
    : [];
  const benchmarkMetricRows = Array.from(
    new Map(
      benchmarkModelSummaries.flatMap((summary) =>
        summary.aggregate.groups.map((group) => {
          const key = [
            group.taskType,
            group.unit ?? "",
            group.absoluteTolerance ?? "",
            group.relativeTolerance ?? "",
          ].join(":");
          return [key, group] as const;
        })
      )
    ).entries()
  );
  const disagreementSamples = benchmarkResults.filter((result) => {
    const objectiveResults = result.modelStates
      .filter((state) => state.runStatus === "success")
      .map((state) =>
        evaluateReferenceAnswer(
          state.answer,
          result.correctAnswer,
          result.options,
          result.scoringPolicy
        )
      )
      .filter((metric) => metric.correct !== undefined);
    return objectiveResults.some((metric) => metric.correct) &&
      objectiveResults.some((metric) => !metric.correct);
  });
  const repeatedIncorrectResponses = (() => {
    const counts = new Map<string, {
      response: string;
      count: number;
      sampleIds: string[];
    }>();
    for (const result of benchmarkResults) {
      result.modelStates.forEach((state) => {
        if (state.runStatus !== "success") return;
        const metric = evaluateReferenceAnswer(
          state.answer,
          result.correctAnswer,
          result.options,
          result.scoringPolicy
        );
        if (metric.correct !== false) return;
        const response = state.answer.trim().replace(/\s+/g, " ");
        const key = response.toLocaleLowerCase();
        if (!key) return;
        const existing = counts.get(key) ?? { response, count: 0, sampleIds: [] };
        existing.count++;
        existing.sampleIds.push(result.sampleId);
        counts.set(key, existing);
      });
    }
    return Array.from(counts.values())
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  })();
  const fastestObservedModel = benchmarkModelSummaries
    .filter((summary) => summary.aggregate.completedCount > 0)
    .sort((a, b) => a.averageResponseMs - b.averageResponseMs)[0];
  const lowestCostObservedModel = benchmarkModelSummaries
    .filter((summary) => summary.hasCostData)
    .sort((a, b) => a.costUsd - b.costUsd)[0];

  return (
    <div className="h2h-layout">
      {/* ── Left Sidebar (Controls & Use Cases) ── */}
      <aside className="h2h-sidebar">
        {/* Model Slots Card */}
        <div className="h2h-sidebar-section">
          <div className="h2h-sidebar-label">
            <span>Active Models ({models.length} of 4)</span>
            {models.length < 4 && !isAnyRunning && (
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
                  disabled={isAnyRunning}
                  onRemove={models.length > 1 && !isAnyRunning ? () => handleRemoveModel(idx) : undefined}
                  onChange={(newId) => handleModelChange(idx, newId)}
                />
              </div>
            ))}
          </div>
        </div>

        {inputMode === "manual" && (
        <>
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

        </>
        )}
      </aside>

      {/* ── Main Workspace Area ── */}
      <div className="h2h-main">
        {/* Sticky Header matching arena-header */}
        <div className="arena-header">
          <div className="arena-header-model">
            <div>
              <div className="arena-header-model-name">
                {inputMode === "benchmark"
                  ? "Benchmark Comparison"
                  : currentUseCaseConfig?.label || "Head-to-Head Comparison"}
              </div>
              <div className="arena-header-plugin-count">
                {models.length} Models Active · {inputMode === "benchmark"
                  ? `${selectedBenchmarkSampleIds.length} benchmark samples selected`
                  : currentUseCaseConfig?.goldKey ? `Ground Truth ${currentUseCaseConfig.goldKey}` : "Comparative Analysis"}
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
            {inputMode === "manual" && <button
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
            </button>}

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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="arena-header-btn"
              aria-pressed={inputMode === "benchmark"}
              onClick={() => handleInputModeChange("benchmark")}
              disabled={isAnyRunning}
              style={{ color: inputMode === "benchmark" ? "var(--accent)" : undefined }}
            >
              Benchmark Comparison
            </button>
            <button
              type="button"
              className="arena-header-btn"
              aria-pressed={inputMode === "manual"}
              onClick={() => handleInputModeChange("manual")}
              disabled={isAnyRunning}
              style={{ color: inputMode === "manual" ? "var(--accent)" : undefined }}
            >
              Manual Upload
            </button>
          </div>

          {/* Recommended Academic Benchmark Grounding Card */}
          {inputMode === "manual" && currentUseCaseConfig && (() => {
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

          {inputMode === "benchmark" ? (
            <>
            {benchmarkRunError && (
              <div role="alert" style={{ color: "var(--rose)", fontSize: "12px" }}>
                {benchmarkRunError}
              </div>
            )}
            <BenchmarkSampleSelector
              benchmarkId={benchmarkId}
              selectedSampleIds={selectedBenchmarkSampleIds}
              models={models}
              isRunning={isAnyRunning}
              canRun={canRunBenchmarkComparison(selectedBenchmarkSampleIds, models)}
              onBenchmarkChange={setBenchmarkId}
              onSelectionChange={setSelectedBenchmarkSampleIds}
              onRun={() => void handleRunBenchmarkComparison()}
            />
            </>
          ) : (
            <ManualCsvCaseUpload
              cases={manualCsvCases}
              onCasesChange={handleManualCsvCasesChange}
              onFileNameChange={setManualCsvFileName}
              onRun={() => void handleRunManualCsvComparison()}
              runError={benchmarkRunError}
              canRun={
                manualCsvCases.length > 0 &&
                invalidManualCsvCases.length === 0 &&
                canRunBenchmarkComparison(manualCsvCases.map((item) => item.id), models)
              }
              isRunning={isAnyRunning}
            />
          )}
          {Boolean(false) && (
          /* ── Prompt Section: Collapsed Bar OR Full Input Card ── */
          hasAnyResults && isPromptCollapsed ? (
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
          ))}

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

              {inputMode === "manual" && <button
                type="button"
                onClick={handleRunAll}
                disabled={(!prompt.trim() && !attachedDoc) || isAnyRunning}
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
              </button>}
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

              {benchmarkRunConfiguration && (
                <details
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-subtle)",
                    fontSize: "11px",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    {benchmarkRunConfiguration.source === "manual-upload"
                      ? "Manual Upload run configuration"
                      : "Reproducible benchmark run configuration"}
                  </summary>
                  <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {JSON.stringify(benchmarkRunConfiguration, null, 2)}
                  </pre>
                </details>
              )}

              {benchmarkRunConfiguration && benchmarkModelSummaries.length > 0 && (
                <section
                  aria-label="Reference-aware evaluation summary"
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <strong style={{ fontSize: "12px" }}>
                    {benchmarkRunConfiguration.source === "manual-upload"
                        ? "Manual Upload · ad hoc evaluation"
                        : "Benchmark Comparison · reference-aware evaluation"}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                    Accuracy denominators include successfully scored samples only. API failures are reported separately and are not counted as incorrect.
                  </span>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "7px" }}>Model (ID)</th>
                          <th style={{ textAlign: "left", padding: "7px" }}>Run counts</th>
                          <th style={{ textAlign: "left", padding: "7px" }}>Task metrics (scored samples)</th>
                          <th style={{ textAlign: "left", padding: "7px" }}>Response time / usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkModelSummaries.map((summary) => (
                          <tr key={summary.modelId} style={{ borderTop: "1px solid var(--border-subtle)", verticalAlign: "top" }}>
                            <td style={{ padding: "8px", minWidth: "155px" }}>
                              <strong>{getModel(summary.modelId)?.label ?? summary.modelId}</strong>
                              <div style={{ overflowWrap: "anywhere", color: "var(--text-subtle)", marginTop: "3px" }}>
                                {summary.modelId}
                              </div>
                            </td>
                            <td style={{ padding: "8px", minWidth: "140px", lineHeight: 1.7 }}>
                              Selected {summary.aggregate.selectedCount}<br />
                              Completed {summary.aggregate.completedCount}<br />
                              Scored {summary.aggregate.evaluatedCount} · Unscored {summary.aggregate.unscoredCount}<br />
                              Failed {summary.aggregate.failedCount} · Skipped {summary.aggregate.skippedCount}
                              {summary.aggregate.pendingCount > 0 && <><br />Pending {summary.aggregate.pendingCount}</>}
                              <br />
                              Failure rate {(summary.failedRate * 100).toFixed(1)}% of selected
                            </td>
                            <td style={{ padding: "8px", minWidth: "220px" }}>
                              {summary.aggregate.groups.length === 0 ? (
                                <span style={{ color: "var(--text-subtle)" }}>Metric unavailable: no successfully scored samples.</span>
                              ) : summary.aggregate.groups.map((group) => (
                                <div key={`${group.taskType}-${group.unit ?? ""}-${group.absoluteTolerance ?? ""}-${group.relativeTolerance ?? ""}`} style={{ marginBottom: "8px" }}>
                                  <strong>{group.metricName}</strong>
                                  <div>
                                    {group.accuracy !== undefined
                                      ? `${(group.accuracy * 100).toFixed(1)}% (${group.correctCount}/${group.denominator} correct; denominator ${group.denominator})`
                                      : group.meanTokenF1 !== undefined
                                        ? `Lexical P/R/F1 ${((group.meanTokenPrecision ?? 0) * 100).toFixed(1)}% / ${((group.meanTokenRecall ?? 0) * 100).toFixed(1)}% / ${(group.meanTokenF1 * 100).toFixed(1)}% (n=${group.evaluatedCount}; not semantic accuracy)`
                                        : "Metric unavailable"}
                                    {group.meanAbsoluteError !== undefined &&
                                      ` · MAE ${group.meanAbsoluteError.toFixed(4)}${group.unit ? ` ${group.unit}` : ""}`}
                                    {group.absoluteTolerance !== undefined &&
                                      ` · ±${group.absoluteTolerance}${group.unit ? ` ${group.unit}` : ""}`}
                                    {group.relativeTolerance !== undefined &&
                                      ` · relative ${(group.relativeTolerance * 100).toFixed(2)}%`}
                                  </div>
                                  <details style={{ marginTop: "3px" }}>
                                    <summary style={{ cursor: "pointer", color: "var(--text-subtle)" }}>
                                      Contributing samples ({group.sampleIds.length})
                                    </summary>
                                    <div style={{ overflowWrap: "anywhere" }}>{group.sampleIds.join(", ")}</div>
                                  </details>
                                </div>
                              ))}
                            </td>
                            <td style={{ padding: "8px", minWidth: "170px", lineHeight: 1.7 }}>
                              Average response {(summary.averageResponseMs / 1000).toFixed(2)}s<br />
                              Cumulative latency {(summary.latencyMs / 1000).toFixed(2)}s<br />
                              {summary.promptTokens > 0
                                ? `${summary.promptTokens.toLocaleString()} input tokens`
                                : "Input tokens unavailable"}
                              <br />
                              {summary.completionTokens > 0
                                ? `${summary.completionTokens.toLocaleString()} output tokens`
                                : "Output tokens unavailable"}
                              <br />
                              {summary.hasCostData
                                ? `$${summary.costUsd.toFixed(4)} estimated cost`
                                : "Cost unavailable"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <section aria-label="Benchmark group assessment" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                    <strong style={{ fontSize: "12px" }}>Benchmark-group assessment</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-subtle)", margin: "5px 0" }}>
                      Group results use only this run’s selected samples and successfully scored responses. Each task metric shows its own denominator and contributing sample IDs above; groups not selected are not scored.
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead><tr>
                          <th style={{ textAlign: "left", padding: "6px" }}>Benchmark group</th>
                          <th style={{ textAlign: "left", padding: "6px" }}>Included samples</th>
                          <th style={{ textAlign: "left", padding: "6px" }}>Assessment</th>
                        </tr></thead>
                        <tbody>
                          {INSURANCE_BENCHMARKS.map((group) => {
                            const isSelected = benchmarkRunConfiguration.source === "benchmark" &&
                              benchmarkRunConfiguration.benchmarkId === group.id;
                            const currentGroups = isSelected
                              ? benchmarkModelSummaries.flatMap((summary) =>
                                  summary.aggregate.groups.map((metric) => ({
                                    modelId: summary.modelId,
                                    metric,
                                  }))
                                )
                              : [];
                            return (
                              <tr key={group.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "6px" }}>{group.name}</td>
                                <td style={{ padding: "6px" }}>
                                  {isSelected
                                    ? `${benchmarkRunConfiguration.selectedSampleIds.length} selected`
                                    : "Not included in this run"}
                                </td>
                                <td style={{ padding: "6px" }}>
                                  {!isSelected
                                    ? "Not evaluated"
                                    : currentGroups.length === 0
                                      ? "Selected samples produced no available metrics."
                                      : currentGroups.map(({ modelId, metric }) => (
                                          <div key={`${modelId}-${metric.taskType}-${metric.unit ?? ""}-${metric.absoluteTolerance ?? ""}-${metric.relativeTolerance ?? ""}`}>
                                            {getModel(modelId)?.label ?? modelId}:{" "}
                                            {metric.accuracy !== undefined
                                              ? `${(metric.accuracy * 100).toFixed(1)}% ${metric.metricName} (${metric.correctCount}/${metric.denominator})`
                                              : metric.meanTokenF1 !== undefined
                                                ? `${metric.metricName}; F1 ${(metric.meanTokenF1 * 100).toFixed(1)}% diagnostic`
                                                : "Metric unavailable"}
                                          </div>
                                        ))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {benchmarkRunConfiguration.source === "benchmark" && (
                      <details style={{ marginTop: "6px", fontSize: "11px" }}>
                        <summary style={{ cursor: "pointer" }}>
                          Selected samples for this group ({benchmarkRunConfiguration.selectedSampleIds.length})
                        </summary>
                        <div style={{ overflowWrap: "anywhere", marginTop: "4px" }}>
                          {benchmarkRunConfiguration.selectedSampleIds.join(", ")}
                        </div>
                      </details>
                    )}
                    {benchmarkRunConfiguration.source === "manual-upload" && (
                      <p style={{ fontSize: "11px", color: "var(--amber)", marginBottom: 0 }}>
                        Manual Upload results are ad hoc and are not included in the five published benchmark groups.
                      </p>
                    )}
                  </section>

                  <section aria-label="Accuracy comparison charts" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                    <strong style={{ fontSize: "12px" }}>Comparable accuracy by task</strong>
                    {benchmarkMetricRows.filter(([, group]) => group.accuracy !== undefined).length === 0 ? (
                      <p style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                        No comparable accuracy metrics are available for charts. Unavailable metrics are not assigned placeholder scores.
                      </p>
                    ) : benchmarkMetricRows.filter(([, group]) => group.accuracy !== undefined).map(([key, group]) => (
                      <div key={key} style={{ marginTop: "9px" }}>
                        <div style={{ fontSize: "11px", marginBottom: "4px" }}>
                          {group.metricName} · {group.taskType.replace("-", " ")} · denominator varies by model
                        </div>
                        {benchmarkModelSummaries.map((summary) => {
                          const metric = summary.aggregate.groups.find((item) =>
                            [item.taskType, item.unit ?? "", item.absoluteTolerance ?? "", item.relativeTolerance ?? ""].join(":") === key
                          );
                          return (
                            <div key={summary.modelId} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 1fr) 3fr auto", gap: "8px", alignItems: "center", fontSize: "10px", margin: "4px 0" }}>
                              <span>{getModel(summary.modelId)?.label ?? summary.modelId}</span>
                              {metric?.accuracy !== undefined ? (
                                <div role="img" aria-label={`${summary.modelId}: ${(metric.accuracy * 100).toFixed(1)} percent accuracy`}>
                                  <div style={{ width: `${metric.accuracy * 100}%`, minWidth: metric.accuracy > 0 ? "2px" : 0, height: "8px", background: "var(--accent)", borderRadius: "4px" }} />
                                </div>
                              ) : (
                                <span>Metric unavailable</span>
                              )}
                              <span>{metric?.accuracy !== undefined
                                ? `${(metric.accuracy * 100).toFixed(1)}% (${metric.correctCount}/${metric.denominator})`
                                : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </section>

                  <section aria-label="Evidence-based model assessment" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                    <strong style={{ fontSize: "12px" }}>Overall model assessment</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-subtle)", margin: "5px 0" }}>
                      No universal winner is declared. Accuracy results are compared only within the same task type and scoring policy; no single cross-task rank is calculated.
                    </p>
                    <ul style={{ fontSize: "11px", color: "var(--text-subtle)", paddingLeft: "18px", lineHeight: 1.7 }}>
                      {fastestObservedModel && (
                        <li>
                          Lowest observed average response time: {getModel(fastestObservedModel.modelId)?.label ?? fastestObservedModel.modelId} at {(fastestObservedModel.averageResponseMs / 1000).toFixed(2)}s across successful responses.
                        </li>
                      )}
                      {lowestCostObservedModel && (
                        <li>
                          Lowest observed total estimated cost: {getModel(lowestCostObservedModel.modelId)?.label ?? lowestCostObservedModel.modelId} at ${lowestCostObservedModel.costUsd.toFixed(4)} for this run. The value depends on usage and provider-reported estimates.
                        </li>
                      )}
                      {benchmarkMetricRows.filter(([, group]) => group.accuracy !== undefined).map(([key, group]) => {
                        const leaders = benchmarkModelSummaries
                          .map((summary) => ({
                            summary,
                            metric: summary.aggregate.groups.find((item) =>
                              [item.taskType, item.unit ?? "", item.absoluteTolerance ?? "", item.relativeTolerance ?? ""].join(":") === key
                            ),
                          }))
                          .filter((entry) => entry.metric?.accuracy !== undefined)
                          .sort((a, b) => (b.metric?.accuracy ?? 0) - (a.metric?.accuracy ?? 0));
                        const best = leaders[0];
                        return best ? (
                          <li key={`leader-${key}`}>
                            Best observed {group.metricName} for {group.taskType.replace("-", " ")}: {getModel(best.summary.modelId)?.label ?? best.summary.modelId} at {((best.metric?.accuracy ?? 0) * 100).toFixed(1)}% ({best.metric?.correctCount}/{best.metric?.denominator}); this is a task-specific result, not an overall ranking.
                          </li>
                        ) : null;
                      })}
                      {benchmarkModelSummaries.map((summary) => (
                        <li key={`tradeoff-${summary.modelId}`}>
                          {getModel(summary.modelId)?.label ?? summary.modelId}: average response time {(summary.averageResponseMs / 1000).toFixed(2)}s; estimated cost {summary.hasCostData ? `$${summary.costUsd.toFixed(4)}` : "unavailable"}; failure rate {(summary.failedRate * 100).toFixed(1)}% ({summary.aggregate.failedCount}/{summary.aggregate.selectedCount} selected).
                        </li>
                      ))}
                      <li>
                        Objective-scoring disagreements occurred on {disagreementSamples.length} of {benchmarkResults.length} completed samples.
                        {disagreementSamples.length > 0 && ` Examples: ${disagreementSamples.slice(0, 5).map((result) => result.sampleId).join(", ")}.`}
                      </li>
                      <li>
                        Repeated incorrect response patterns: {repeatedIncorrectResponses.length === 0
                          ? "none observed among the scored objective responses."
                          : repeatedIncorrectResponses.map((pattern) =>
                              `"${pattern.response.slice(0, 120)}${pattern.response.length > 120 ? "…" : ""}" (${pattern.count} responses; samples ${pattern.sampleIds.join(", ")})`
                            ).join("; ")}
                      </li>
                    </ul>
                    {disagreementSamples.length > 0 && (
                      <details style={{ fontSize: "11px" }}>
                        <summary style={{ cursor: "pointer" }}>Inspect model disagreement examples</summary>
                        {disagreementSamples.slice(0, 5).map((result) => (
                          <div key={result.sampleId} style={{ borderTop: "1px solid var(--border-subtle)", padding: "6px 0" }}>
                            <strong>{result.sampleId}</strong> · reference: {result.correctAnswer}
                            <div>{result.modelStates.map((state, index) => {
                              const metric = evaluateReferenceAnswer(state.answer, result.correctAnswer, result.options, result.scoringPolicy);
                              return metric.correct !== undefined ? (
                                <span key={index} style={{ marginRight: "10px" }}>
                                  {getModel(benchmarkRunConfiguration.models[index])?.label ?? benchmarkRunConfiguration.models[index]}: {metric.correct ? "correct" : "incorrect"}
                                </span>
                              ) : null;
                            })}</div>
                          </div>
                        ))}
                      </details>
                    )}
                    {benchmarkRunConfiguration.source === "manual-upload" && (
                      <p style={{ fontSize: "11px", color: "var(--amber)" }}>
                        This assessment describes a Manual Upload run only and is not a published benchmark result.
                      </p>
                    )}
                  </section>
                </section>
              )}

              {benchmarkRunConfiguration ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {benchmarkResults.map((result) => (
                    <section
                      key={result.sampleId}
                      style={{
                        padding: "14px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-default)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            marginBottom: "6px",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            color: result.sourceLabel === "Manual Upload" ? "var(--amber)" : "var(--accent)",
                            background: "var(--bg-surface)",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          {result.sourceLabel}
                        </span>
                        <strong>{result.sampleId}</strong>
                        <div style={{ color: "var(--text-subtle)", marginTop: "4px", fontSize: "12px" }}>
                          {result.preview}
                        </div>
                        <details style={{ marginTop: "6px", fontSize: "11px" }}>
                          <summary style={{ cursor: "pointer", color: "var(--text-subtle)" }}>
                            Expand full question
                          </summary>
                          <div style={{ whiteSpace: "pre-wrap", marginTop: "5px", color: "var(--text-main)" }}>
                            {result.fullQuestion}
                          </div>
                        </details>
                        {result.correctAnswer && (
                          <details style={{ marginTop: "7px", fontSize: "11px" }}>
                            <summary style={{ cursor: "pointer", color: "var(--text-subtle)" }}>
                              View reference answer (excluded from model input)
                            </summary>
                            <div style={{ whiteSpace: "pre-wrap", marginTop: "5px", color: "var(--text-main)" }}>
                              {result.correctAnswer}
                            </div>
                          </details>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {result.modelStates.map((modelState, index) => (
                          <div key={`${result.sampleId}-${index}-${benchmarkRunConfiguration.models[index]}`}>
                            <div style={{ fontSize: "11px", margin: "0 0 5px", color: "var(--text-subtle)" }}>
                              {modelState.runStatus === "failed"
                                ? "Failed"
                                : modelState.runStatus === "cancelled"
                                  ? "Skipped / cancelled"
                                  : modelState.runStatus === "success"
                                    ? "Completed"
                                    : "Completed"}
                              {modelState.runStatus === "success" && (
                                <>
                                  {" · "}
                                  {(() => {
                                    const metric = evaluateReferenceAnswer(
                                      modelState.answer,
                                      result.correctAnswer,
                                      result.options,
                                      result.scoringPolicy
                                    );
                                    return metric.correct === undefined
                                      ? metric.available
                                        ? "Scored (lexical diagnostic only)"
                                        : `Unscored: ${metric.reason ?? "metric unavailable"}`
                                      : metric.correct
                                        ? "Correct"
                                        : "Incorrect";
                                  })()}
                                </>
                              )}
                            </div>
                            <ModelColumn
                              idPrefix={`benchmark-${result.sampleId}`}
                              index={index}
                              modelId={benchmarkRunConfiguration.models[index]}
                              state={modelState}
                              referenceScoring={modelState.runStatus === "success"
                                ? evaluateReferenceAnswer(
                                    modelState.answer,
                                    result.correctAnswer,
                                    result.options,
                                    result.scoringPolicy
                                  )
                                : undefined}
                              useCaseId={activeUseCase}
                              goldItem={result.correctAnswer
                                ? { goldResponse: result.correctAnswer, evidence: "" }
                                : undefined}
                              canRemove={false}
                              showAnalytics={
                                modelState.runStatus === "success" &&
                                Boolean(result.correctAnswer)
                              }
                              layoutMode={layoutMode}
                              isCollapsed={Boolean(collapsedBenchmarkCards[`${result.sampleId}-${index}`])}
                              onToggleCollapse={() =>
                                setCollapsedBenchmarkCards((previous) => ({
                                  ...previous,
                                  [`${result.sampleId}-${index}`]:
                                    !previous[`${result.sampleId}-${index}`],
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  {benchmarkRunCases
                    .filter((item) =>
                      !benchmarkResults.some((result) => result.sampleId === item.id) &&
                      !(isAnyRunning && activeBenchmarkSample?.sampleId === item.id)
                    )
                    .map((item) => (
                      <section
                        key={`unrun-${item.id}`}
                        style={{
                          padding: "14px",
                          borderRadius: "var(--radius-md)",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        <strong>{item.id}</strong>
                        <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
                          {item.questionStem || item.fullQuestion.replace(/\s+/g, " ").trim().slice(0, 240)}
                        </div>
                        <details style={{ marginTop: "6px", fontSize: "11px" }}>
                          <summary style={{ cursor: "pointer" }}>Expand full question</summary>
                          <div style={{ whiteSpace: "pre-wrap", marginTop: "5px" }}>{item.fullQuestion}</div>
                        </details>
                        {item.correctAnswer && (
                          <details style={{ marginTop: "6px", fontSize: "11px" }}>
                            <summary style={{ cursor: "pointer" }}>View reference answer (excluded from model input)</summary>
                            <div style={{ whiteSpace: "pre-wrap", marginTop: "5px" }}>{item.correctAnswer}</div>
                          </details>
                        )}
                        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-subtle)" }}>
                          {benchmarkRunConfiguration.models.map((modelId) => (
                            <div key={modelId}>
                              {getModel(modelId)?.label ?? modelId}:{" "}
                              {isBenchmarkBatchRunning
                                ? "Pending (queued)"
                                : benchmarkRunCancelledRef.current
                                  ? "Skipped (run stopped before inference)"
                                  : "Skipped (not executed)"}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}

                  {isAnyRunning && activeBenchmarkSample &&
                    !benchmarkResults.some((result) => result.sampleId === activeBenchmarkSample.sampleId) && (
                      <section style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <span style={{ display: "inline-block", marginRight: "8px", color: benchmarkRunConfiguration.source === "manual-upload" ? "var(--amber)" : "var(--accent)", fontSize: "10px", fontWeight: 700 }}>
                            {benchmarkRunConfiguration.source === "manual-upload" ? "Manual Upload" : "Benchmark Comparison"}
                          </span>
                          <strong>Running {activeBenchmarkSample.sampleId}</strong>
                          <details style={{ fontSize: "11px" }}>
                            <summary style={{ cursor: "pointer" }}>Expand full question</summary>
                            <div style={{ whiteSpace: "pre-wrap", marginTop: "5px" }}>
                              {benchmarkRunCases.find((item) => item.id === activeBenchmarkSample.sampleId)?.fullQuestion}
                            </div>
                          </details>
                          {benchmarkRunCases.find((item) => item.id === activeBenchmarkSample.sampleId)?.correctAnswer && (
                            <details style={{ fontSize: "11px" }}>
                              <summary style={{ cursor: "pointer" }}>
                                View reference answer (excluded from model input)
                              </summary>
                              <div style={{ whiteSpace: "pre-wrap", marginTop: "5px" }}>
                                {benchmarkRunCases.find((item) => item.id === activeBenchmarkSample.sampleId)?.correctAnswer}
                              </div>
                            </details>
                          )}
                        </div>
                        {benchmarkRunConfiguration.models.map((modelId, index) => (
                          <ModelColumn
                            key={`running-${activeBenchmarkSample.sampleId}-${modelId}`}
                            idPrefix={`running-${activeBenchmarkSample.sampleId}`}
                            index={index}
                            modelId={modelId}
                            state={states[index] || emptyModelState()}
                            useCaseId={activeUseCase}
                            goldItem={benchmarkRunConfiguration.source === "manual-upload"
                              ? { goldResponse: manualCsvCases.find((item) => item.id === activeBenchmarkSample.sampleId)?.correctAnswer ?? "", evidence: "" }
                              : undefined}
                            canRemove={false}
                            showAnalytics={
                              states[index]?.runStatus === "success" &&
                              benchmarkRunConfiguration.source === "manual-upload"
                            }
                            layoutMode={layoutMode}
                          />
                        ))}
                      </section>
                    )}
                </div>
              ) : (
              /* ── Dynamic Multi-Model Container (Vertical Stack vs Side-by-Side Grid) ── */
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
              )}

              {/* ── In-Page Domain Evaluation Scorecard (Shown ONLY when Analytics is ON) ── */}
              {inputMode === "manual" && showAnalytics && (
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

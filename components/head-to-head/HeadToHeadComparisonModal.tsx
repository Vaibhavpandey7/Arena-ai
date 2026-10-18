"use client";

import React, { useEffect, useMemo } from "react";
import StructuredMarkdown from "../StructuredMarkdown";
import {
  calculateTokensPerSec,
  calculateWordCount,
  evaluateReferenceAnswer,
  type ReferenceScoringPolicy,
  type ReferenceTaskResult,
} from "@/lib/benchmark-eval";
import type { SingleModelState } from "./SingleSampleEvaluation";

interface Props {
  models: string[];
  states: SingleModelState[];
  goldAnswer?: string;
  options?: Record<string, string>;
  scoringPolicy?: ReferenceScoringPolicy;
  onClose: () => void;
}

export default function HeadToHeadComparisonModal({
  models,
  states,
  goldAnswer,
  options,
  scoringPolicy = { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
  onClose,
}: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Model comparison rows
  const modelMetrics = useMemo(() => {
    return models.map((modelId, idx) => {
      const state = states[idx] || {
        answer: "",
        reasoning: "",
        isRunning: false,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
        estCostUsd: 0,
        startTime: null,
        elapsed: 0,
      };

      const evalResult: ReferenceTaskResult | null =
        state.answer && goldAnswer
          ? evaluateReferenceAnswer(state.answer, goldAnswer, options, scoringPolicy)
          : null;

      const tps = calculateTokensPerSec(state.latencyMs, state.completionTokens);
      const wordCount = calculateWordCount(state.answer);

      return {
        idx,
        modelId,
        letter: String.fromCharCode(65 + idx),
        shortName: modelId.split("/").pop() || modelId,
        state,
        evalResult,
        tps: tps || 0,
        wordCount,
        latencySec: state.latencyMs > 0 ? state.latencyMs / 1000 : 0,
      };
    });
  }, [models, states, goldAnswer, options, scoringPolicy]);

  // Find Champions / Best in class
  const speedChampion = useMemo(() => {
    const valid = modelMetrics.filter((m) => m.latencySec > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => a.latencySec - b.latencySec)[0];
  }, [modelMetrics]);

  const accuracyChampion = useMemo(() => {
    const correctModels = modelMetrics.filter((m) => m.evalResult?.correct === true);
    if (correctModels.length > 0) return correctModels[0];
    const withF1 = modelMetrics.filter((m) => m.evalResult?.tokenF1 !== undefined);
    if (withF1.length > 0) {
      return [...withF1].sort((a, b) => (b.evalResult?.tokenF1 || 0) - (a.evalResult?.tokenF1 || 0))[0];
    }
    return null;
  }, [modelMetrics]);

  const efficiencyChampion = useMemo(() => {
    const valid = modelMetrics.filter((m) => m.state.completionTokens > 0);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => a.state.completionTokens - b.state.completionTokens)[0];
  }, [modelMetrics]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      "Model Letter",
      "Model ID",
      "Latency (s)",
      "Tokens/Sec",
      "Prompt Tokens",
      "Completion Tokens",
      "Total Tokens",
      "Word Count",
      "Est Cost (USD)",
      "Ground Truth Match",
      "Scoring Method",
      "Lexical F1 (%)",
      "Divergence Reason",
    ];

    const rows = modelMetrics.map((m) => [
      `Model ${m.letter}`,
      `"${m.modelId}"`,
      m.latencySec.toFixed(2),
      m.tps.toFixed(1),
      m.state.promptTokens,
      m.state.completionTokens,
      m.state.promptTokens + m.state.completionTokens,
      m.wordCount,
      m.state.estCostUsd.toFixed(5),
      m.evalResult?.correct === true ? "PASS" : m.evalResult?.correct === false ? "FAIL" : "UNSCORED",
      m.evalResult?.metricName || "N/A",
      m.evalResult?.tokenF1 !== undefined ? (m.evalResult.tokenF1 * 100).toFixed(1) : "N/A",
      `"${(m.evalResult?.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `h2h_model_comparison_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary Handler
  const handleCopySummary = () => {
    const lines = [
      "=== HEAD-TO-HEAD EVALUATION SCORECARD ===",
      `Compared Models: ${models.map((m, i) => `Model ${String.fromCharCode(65 + i)}: ${m}`).join(", ")}`,
      "",
      "--- PERFORMANCE COMPARISON ---",
      ...modelMetrics.map((m) => {
        const evalStr = m.evalResult
          ? `Match: ${m.evalResult.correct ? "PASS" : "FAIL"} (${m.evalResult.metricName})`
          : "Match: N/A";
        return `Model ${m.letter} (${m.shortName}): Latency ${m.latencySec.toFixed(2)}s | Speed ${m.tps.toFixed(1)} t/s | Tokens ${m.state.completionTokens} out / ${m.state.promptTokens} in | Words ${m.wordCount} | Cost $${m.state.estCostUsd.toFixed(5)} | ${evalStr}`;
      }),
    ];

    if (speedChampion) {
      lines.push(`Speed Champion: Model ${speedChampion.letter} (${speedChampion.latencySec.toFixed(2)}s)`);
    }
    if (accuracyChampion) {
      lines.push(`Accuracy Champion: Model ${accuracyChampion.letter} (${accuracyChampion.shortName})`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "1150px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border-default)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                Comparative Evaluation
              </span>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                Head-to-Head Comparison Scorecard
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-subtle)" }}>
              Multi-dimensional evaluation comparing response time, token throughput, and ground truth accuracy.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleCopySummary}
              className="arena-header-btn"
              title="Copy text summary to clipboard"
            >
              Copy Summary
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="arena-header-btn"
              title="Export complete scorecard as CSV"
              style={{ background: "var(--accent)", color: "var(--text-inverted)" }}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontSize: "18px",
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Champions Podium Strip */}
        <div
          style={{
            padding: "12px 22px",
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {/* Speed Champion */}
          <div
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Speed Champion
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "3px" }}>
              {speedChampion ? `Model ${speedChampion.letter} (${speedChampion.shortName})` : "N/A"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
              {speedChampion ? `${speedChampion.latencySec.toFixed(2)}s · ${speedChampion.tps.toFixed(1)} tokens/sec` : "No latency data"}
            </div>
          </div>

          {/* Accuracy Champion */}
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Ground Truth Champion
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "3px" }}>
              {accuracyChampion ? `Model ${accuracyChampion.letter} (${accuracyChampion.shortName})` : "Pending evaluation"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
              {accuracyChampion?.evalResult?.correct === true
                ? "Exact Match / Numeric Match PASS"
                : accuracyChampion?.evalResult?.tokenF1 !== undefined
                ? `Lexical F1: ${(accuracyChampion.evalResult.tokenF1 * 100).toFixed(1)}%`
                : "No reference answer available"}
            </div>
          </div>

          {/* Token Economy Champion */}
          <div
            style={{
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Token Economy Champion
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "3px" }}>
              {efficiencyChampion ? `Model ${efficiencyChampion.letter} (${efficiencyChampion.shortName})` : "N/A"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
              {efficiencyChampion ? `${efficiencyChampion.state.completionTokens} tokens · ${efficiencyChampion.wordCount} words` : "No tokens recorded"}
            </div>
          </div>
        </div>

        {/* Scrollable Comparison Matrix */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12.5px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-default)", background: "var(--bg-canvas-subtle)" }}>
                <th style={{ padding: "12px 14px", width: "24%", color: "var(--text-subtle)", fontWeight: 700 }}>
                  EVALUATION METRIC
                </th>
                {modelMetrics.map((m) => (
                  <th key={m.idx} style={{ padding: "12px 14px", color: "var(--text-main)", fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                        Model {m.letter}
                      </span>
                      <span>{m.shortName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Category 1: Time & Speed */}
              <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <td colSpan={modelMetrics.length + 1} style={{ padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.05em", textTransform: "uppercase", borderTop: "1px solid var(--border-subtle)" }}>
                  Speed & Latency Metrics
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Total Response Latency</td>
                {modelMetrics.map((m) => {
                  const isFastest = speedChampion?.idx === m.idx && m.latencySec > 0;
                  return (
                    <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)" }}>
                      <span style={{ fontWeight: 700, color: isFastest ? "var(--emerald)" : "var(--text-main)" }}>
                        {m.latencySec.toFixed(2)}s
                      </span>
                      {isFastest && (
                        <span style={{ marginLeft: "6px", fontSize: "10.5px", background: "rgba(52, 168, 83, 0.15)", color: "var(--emerald)", padding: "1px 6px", borderRadius: "4px" }}>
                          Fastest
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Throughput (Tokens / Sec)</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                    {m.tps > 0 ? `${m.tps.toFixed(1)} t/s` : "—"}
                  </td>
                ))}
              </tr>

              {/* Category 2: Ground Truth Alignment */}
              <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <td colSpan={modelMetrics.length + 1} style={{ padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#34d399", letterSpacing: "0.05em", textTransform: "uppercase", borderTop: "1px solid var(--border-subtle)" }}>
                  Ground Truth Alignment & Accuracy
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Match Status</td>
                {modelMetrics.map((m) => {
                  const isCorrect = m.evalResult?.correct === true;
                  const isIncorrect = m.evalResult?.correct === false;
                  return (
                    <td key={m.idx} style={{ padding: "10px 14px" }}>
                      {m.evalResult ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isCorrect ? "rgba(52, 168, 83, 0.15)" : isIncorrect ? "rgba(217, 101, 112, 0.15)" : "rgba(255, 255, 255, 0.08)",
                            color: isCorrect ? "var(--emerald)" : isIncorrect ? "var(--rose)" : "var(--text-muted)",
                            border: `1px solid ${isCorrect ? "rgba(52, 168, 83, 0.4)" : isIncorrect ? "rgba(217, 101, 112, 0.4)" : "var(--border-subtle)"}`,
                          }}
                        >
                          {isCorrect ? "PASS (Exact / Numeric)" : isIncorrect ? "FAIL (Divergent)" : m.evalResult.metricName}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>No reference answer</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Scoring Method</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", color: "var(--text-subtle)", fontSize: "12px" }}>
                    {m.evalResult?.metricName || "N/A"}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Lexical F1 / Overlap</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)" }}>
                    {m.evalResult?.tokenF1 !== undefined ? (
                      <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        {(m.evalResult.tokenF1 * 100).toFixed(1)}%{" "}
                        <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                          (P: {((m.evalResult.tokenPrecision ?? 0) * 100).toFixed(0)}%, R: {((m.evalResult.tokenRecall ?? 0) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
              {modelMetrics.some((m) => m.evalResult?.reason) && (
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Divergence Details</td>
                  {modelMetrics.map((m) => (
                    <td key={m.idx} style={{ padding: "10px 14px", fontSize: "11.5px", color: "var(--rose)", lineHeight: 1.4 }}>
                      {m.evalResult?.reason || "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Category 3: Token Usage & Cost */}
              <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <td colSpan={modelMetrics.length + 1} style={{ padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#c084fc", letterSpacing: "0.05em", textTransform: "uppercase", borderTop: "1px solid var(--border-subtle)" }}>
                  Token Economy & Cost
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Output Tokens (Completion)</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                    {m.state.completionTokens}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Input Tokens (Prompt)</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-subtle)" }}>
                    {m.state.promptTokens}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Word Count</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                    {m.wordCount} words
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontWeight: 600 }}>Estimated Cost (USD)</td>
                {modelMetrics.map((m) => (
                  <td key={m.idx} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)" }}>
                    {m.state.estCostUsd > 0 ? (
                      <span style={{ color: "var(--text-main)" }}>${m.state.estCostUsd.toFixed(5)}</span>
                    ) : (
                      <span style={{ color: "var(--emerald)", fontWeight: 600 }}>$0.00 (Free)</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import StructuredMarkdown from "../StructuredMarkdown";
import { evaluateReferenceAnswer, type ReferenceScoringPolicy } from "@/lib/benchmark-eval";

interface InspectedModelResult {
  modelId: string;
  answer?: string;
  runStatus?: "success" | "failed" | "cancelled";
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  estCostUsd?: number;
  errorMessage?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sampleId: string;
  category: string;
  fullQuestion: string;
  options?: Record<string, string>;
  correctAnswer?: string;
  scoringPolicy?: ReferenceScoringPolicy;
  modelResults: InspectedModelResult[];
}

export default function SingleSampleInspectionModal({
  isOpen,
  onClose,
  sampleId,
  category,
  fullQuestion,
  options = {},
  correctAnswer,
  scoringPolicy,
  modelResults,
}: Props) {
  const [judgeAuditResults, setJudgeAuditResults] = useState<Record<string, any>>({});
  const [isJudging, setIsJudging] = useState<Record<string, boolean>>({});

  const handleRunJudge = async (modelId: string, modelAnswer: string) => {
    setIsJudging((prev) => ({ ...prev, [modelId]: true }));
    try {
      const res = await fetch("/api/benchmark/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: fullQuestion,
          correctAnswer,
          options,
          modelAnswer,
          modelId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Judge failed");
      setJudgeAuditResults((prev) => ({ ...prev, [modelId]: data }));
    } catch (err: any) {
      setJudgeAuditResults((prev) => ({
        ...prev,
        [modelId]: { error: err.message || "Judge failed" },
      }));
    } finally {
      setIsJudging((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sample-inspection-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-elevated)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              {sampleId}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              {category}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-subtle)",
              }}
            >
              Detailed Batch Question Inspection
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-subtle)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Question Panel */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-canvas)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-subtle)",
              marginBottom: "6px",
            }}
          >
            Prompt / Question Input
          </div>
          <div
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
            }}
          >
            {fullQuestion}
          </div>

          {Object.keys(options).length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "8px",
              }}
            >
              {Object.entries(options).map(([letter, text]) => (
                <div key={letter} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--accent)" }}>{letter}:</strong> {text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side-by-Side Model Responses */}
        <div
          style={{
            padding: "20px",
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, modelResults.length)}, 1fr)`,
            gap: "16px",
            overflowX: "auto",
          }}
        >
          {modelResults.map((m, idx) => {
            const evalResult =
              m.answer && correctAnswer
                ? evaluateReferenceAnswer(m.answer, correctAnswer, options, scoringPolicy)
                : null;

            const isCorrect = evalResult?.correct === true;
            const isIncorrect = evalResult?.correct === false;

            return (
              <div
                key={m.modelId || idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-surface-elevated)",
                  overflow: "hidden",
                }}
              >
                {/* Model Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text-main)",
                      }}
                    >
                      {m.modelId.split("/").pop() || m.modelId}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--text-subtle)",
                        fontFamily: "var(--font-mono)",
                        marginTop: "2px",
                      }}
                    >
                      {m.latencyMs ? `${(m.latencyMs / 1000).toFixed(2)}s` : "—"} ·{" "}
                      {m.completionTokens ? `${m.completionTokens} tokens` : "—"}
                    </div>
                  </div>

                  {evalResult && (
                    <span
                      style={{
                        padding: "2px 8px",
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
                </div>

                {/* Model Answer Body */}
                <div
                  style={{
                    padding: "14px",
                    flex: 1,
                    fontSize: "12.5px",
                    lineHeight: 1.6,
                    color: "var(--text-main)",
                    overflowY: "auto",
                    maxHeight: "320px",
                  }}
                >
                  {m.runStatus === "failed" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--rose)", fontWeight: 700, fontSize: "12px" }}>
                        <span>⚠️ Inference Failed Upstream</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-main)", lineHeight: 1.5 }}>
                        {m.errorMessage || "Model inference failed or returned an empty response from OpenRouter."}
                      </div>
                      {/credit|payment|afford|402/i.test(m.errorMessage || "") && (
                        <div style={{ fontSize: "11px", color: "var(--amber)", marginTop: "4px" }}>
                          💡 <strong>Remedy:</strong> This OpenRouter account has no purchased credits. Visit <a href="https://openrouter.ai/settings/credits" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>openrouter.ai/settings/credits</a> to top up, or switch to Demo Mode.
                        </div>
                      )}
                      {/rate limit|429|daily|free-models-per-day/i.test(m.errorMessage || "") && (
                        <div style={{ fontSize: "11px", color: "var(--amber)", marginTop: "4px" }}>
                          💡 <strong>Remedy:</strong> Daily free tier limit (50 requests/day) reached. Quota resets at 00:00 UTC, or unlocks 1,000 requests/day with $10 in credits.
                        </div>
                      )}
                    </div>
                  ) : m.answer ? (
                    <StructuredMarkdown content={m.answer} />
                  ) : (
                    <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>
                      No response recorded.
                    </span>
                  )}
                </div>

                {/* Scoring Details Footer for Model */}
                {evalResult && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderTop: "1px solid var(--border-subtle)",
                      background: "var(--bg-canvas)",
                      fontSize: "11px",
                      color: "var(--text-subtle)",
                    }}
                  >
                    <strong>Method:</strong> {evalResult.metricName}
                    {evalResult.reason && (
                      <div style={{ marginTop: "2px", color: "var(--rose)" }}>
                        {evalResult.reason}
                      </div>
                    )}
                    {evalResult.absoluteError !== undefined && (
                      <div style={{ marginTop: "2px" }}>
                        Abs Error: {evalResult.absoluteError.toFixed(4)}{" "}
                        {evalResult.unit ? `(${evalResult.unit})` : ""}
                      </div>
                    )}
                    {evalResult.tokenF1 !== undefined && (
                      <div style={{ marginTop: "2px" }}>
                        Token F1: {(evalResult.tokenF1 * 100).toFixed(1)}% (Precision:{" "}
                        {((evalResult.tokenPrecision ?? 0) * 100).toFixed(1)}%, Recall:{" "}
                        {((evalResult.tokenRecall ?? 0) * 100).toFixed(1)}%)
                      </div>
                    )}

                    {/* LLM-as-a-Judge Trigger */}
                    {m.answer && (
                      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border-subtle)" }}>
                        <button
                          type="button"
                          onClick={() => handleRunJudge(m.modelId, m.answer!)}
                          disabled={isJudging[m.modelId]}
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: "rgba(56, 189, 248, 0.12)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                            cursor: isJudging[m.modelId] ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {isJudging[m.modelId] ? "⏳ Auditing with LLM Judge…" : "⚖️ Audit with LLM Judge"}
                        </button>

                        {judgeAuditResults[m.modelId] && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            {judgeAuditResults[m.modelId].error ? (
                              <div style={{ color: "var(--rose)", fontSize: "10px" }}>
                                {judgeAuditResults[m.modelId].error}
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: judgeAuditResults[m.modelId].isCorrect ? "var(--emerald)" : "var(--rose)",
                                    }}
                                  >
                                    {judgeAuditResults[m.modelId].isCorrect ? "✓ Ground Truth Aligned" : "✗ Reasoning Flaw Detected"}
                                  </span>
                                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                                    Score: {judgeAuditResults[m.modelId].reasoningScore}/5
                                  </span>
                                </div>
                                <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "2px" }}>
                                  {judgeAuditResults[m.modelId].rationale}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reference Answer Panel */}
        {correctAnswer && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-default)",
              background: "var(--bg-canvas)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-subtle)",
                marginBottom: "6px",
              }}
            >
              Ground Truth Reference Answer
            </div>
            <div
              style={{
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                color: "var(--emerald)",
                background: "var(--bg-surface)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                whiteSpace: "pre-wrap",
              }}
            >
              {correctAnswer}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-default)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--bg-surface-elevated)",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="arena-header-btn"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

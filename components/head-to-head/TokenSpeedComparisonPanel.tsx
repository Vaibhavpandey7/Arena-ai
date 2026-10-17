"use client";

import React, { useMemo } from "react";
import { computeSpeedMetrics, type SpeedMetricSummary } from "@/lib/insurance-radar-taxonomy";
import { evaluateReferenceAnswer } from "@/lib/benchmark-eval";

interface TokenSpeedComparisonPanelProps {
  modelIds: string[];
  items: Array<{
    correctAnswer?: string;
    options?: Record<string, string>;
    scoringPolicy?: any;
    modelStates: Array<{
      modelId: string;
      answer: string;
      runStatus: string;
      latencyMs: number;
      promptTokens?: number;
      completionTokens?: number;
      estCostUsd?: number;
    }>;
  }>;
}

const MODEL_PALETTE = [
  { stroke: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.35)", name: "Model A" },
  { stroke: "#a855f7", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.35)", name: "Model B" },
  { stroke: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.35)", name: "Model C" },
  { stroke: "#f43f5e", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.35)", name: "Model D" },
];

export default function TokenSpeedComparisonPanel({ modelIds, items }: TokenSpeedComparisonPanelProps) {
  const speedMetrics: SpeedMetricSummary[] = useMemo(() => {
    return computeSpeedMetrics(modelIds, items, evaluateReferenceAnswer);
  }, [modelIds, items]);

  const maxTps = useMemo(() => {
    return Math.max(1, ...speedMetrics.map((s) => s.tokensPerSec));
  }, [speedMetrics]);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "20px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
              Token Speed & Operational Efficiency
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.12)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              Throughput & Economy
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Real-time generation speed (Tokens/Sec), latency distribution, token usage, and cost-efficiency benchmark.
          </p>
        </div>
      </div>

      {/* Grid of Model Speed Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
          gap: "14px",
        }}
      >
        {speedMetrics.map((stat, idx) => {
          const color = MODEL_PALETTE[idx % MODEL_PALETTE.length];
          const tpsPercent = Math.min(100, Math.round((stat.tokensPerSec / maxTps) * 100));

          return (
            <div
              key={stat.modelId}
              style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: `1px solid ${color.border}`,
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Badges strip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: color.stroke,
                      boxShadow: `0 0 8px ${color.stroke}`,
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                    {stat.modelId.split("/").pop()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  {stat.isFastest && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#fbbf24",
                        background: "rgba(251, 191, 36, 0.15)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                      }}
                    >
                      ⚡ Fastest
                    </span>
                  )}
                  {stat.isParetoOptimal && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#34d399",
                        background: "rgba(52, 211, 153, 0.15)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                      }}
                    >
                      🏆 Optimal
                    </span>
                  )}
                </div>
              </div>

              {/* Main TPS Stat */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
                    Generation Speed
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "22px", fontWeight: 800, color: color.stroke }}>
                      {stat.tokensPerSec}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}>
                      tokens/sec
                    </span>
                  </div>
                </div>

                {/* TPS Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "3px",
                    overflow: "hidden",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{
                      width: `${tpsPercent}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${color.stroke} 0%, #38bdf8 100%)`,
                      borderRadius: "3px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Granular Latency & Tokens Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Median Latency</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginTop: "2px" }}>
                    {(stat.medianLatencyMs / 1000).toFixed(2)}s
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    P95: {(stat.p95LatencyMs / 1000).toFixed(2)}s
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Avg Length</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginTop: "2px" }}>
                    {stat.avgTokensPerResponse} <span style={{ fontSize: "10px", fontWeight: 400, color: "#94a3b8" }}>t/resp</span>
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Total: {stat.totalTokens.toLocaleString()}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Cost / 1k Queries</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginTop: "2px" }}>
                    ${stat.costPer1kQuestionsUsd.toFixed(3)}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Run: ${stat.totalCostUsd.toFixed(4)}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Efficiency Ratio</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: color.stroke, marginTop: "2px" }}>
                    {stat.speedAccuracyIndex}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Speed × Accuracy
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

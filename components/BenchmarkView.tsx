"use client";
import { useState, useEffect } from "react";
import {
  BENCHMARK_DATASETS,
  BenchmarkDatasetId,
} from "@/lib/benchmark-datasets";

const DATASET_TABS: BenchmarkDatasetId[] = ["INS-MMBench", "CUFE", "InsuranceQA", "INS-ActBench"];

type Tab = "home" | "head-to-head" | "chat-arena" | "benchmark";

interface Props {
  onNavigate?: (tab: Tab, prompt?: string) => void;
}

export default function BenchmarkView({ onNavigate }: Props) {
  const [activeDataset, setActiveDataset] = useState<BenchmarkDatasetId>("INS-MMBench");
  const [animated, setAnimated] = useState(false);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);

  const currentDataset = BENCHMARK_DATASETS[activeDataset] || BENCHMARK_DATASETS["INS-MMBench"];

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="studio-content" style={{ overflowY: "auto" }}>
      <div className="benchmark-view">
        {/* Top Control Bar: Dataset Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Dataset selection tabs */}
          <div className="benchmark-filter-tabs" style={{ margin: 0 }}>
            {DATASET_TABS.map((t) => (
              <button
                key={t}
                className={`benchmark-filter-tab${activeDataset === t ? " active" : ""}`}
                onClick={() => {
                  setActiveDataset(t);
                  setSelectedDomainIdx(0);
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--cyan)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }} />
            <span>Official Academic Benchmark Ground Truth & Syllabi</span>
          </div>
        </div>

        {/* Academic Benchmark Paper Citation Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(11, 22, 40, 0.95), rgba(6, 11, 20, 0.95))",
            border: "1px solid rgba(0, 212, 255, 0.22)",
            marginBottom: "20px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.02em" }}>
                  {currentDataset.name}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "rgba(0, 212, 255, 0.12)",
                    border: "1px solid rgba(0, 212, 255, 0.3)",
                    color: "var(--cyan)",
                    fontWeight: 700,
                  }}
                >
                  Verified Academic Benchmark
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "var(--emerald)",
                    fontWeight: 700,
                  }}
                >
                  {currentDataset.venue}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "4px", fontWeight: 500 }}>
                📄 <strong style={{ color: "var(--text)" }}>{currentDataset.paperTitle}</strong> — {currentDataset.authors}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a
                href={currentDataset.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.75rem",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: "rgba(14, 165, 233, 0.12)",
                  border: "1px solid rgba(14, 165, 233, 0.35)",
                  color: "var(--cyan)",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                <span>📥 Paper PDF</span>
                <span>↗</span>
              </a>

              <a
                href={currentDataset.arxivUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.75rem",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "var(--text-dim)",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🔗 {currentDataset.arxivId}</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.74rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", marginTop: "6px" }}>
            <span><strong>Dataset Scope:</strong> {currentDataset.scaleDescription}</span>
            <span>•</span>
            <span><strong>Primary Metric:</strong> <span style={{ color: "var(--emerald)", fontWeight: 700 }}>{currentDataset.primaryMetric}</span></span>
            <span>•</span>
            <span style={{ color: "rgba(203, 213, 225, 0.9)" }}><strong>Key Finding:</strong> {currentDataset.keyFinding}</span>
          </div>
        </div>

        {/* Score cards */}
        <div className="benchmark-score-cards">
          {currentDataset.leaderboard.map((item, i) => (
            <div
              key={item.model}
              className={`benchmark-score-card${i === 0 ? " rank-1" : ""}`}
            >
              <div className="benchmark-card-model">
                {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `#${i + 1} `}
                {item.model}
              </div>
              <div className="benchmark-card-score">
                {Math.floor(item.score)}
                <span className="score-decimal">
                  .{String(item.score.toFixed(2)).split(".")[1]}
                </span>
                <span style={{ fontSize: "0.75rem", marginLeft: "4px", color: "var(--text-muted)", fontWeight: 600 }}>
                  {currentDataset.scoreUnit}
                </span>
              </div>
              <div className={`benchmark-card-delta ${item.deltaDir}`}>
                {item.deltaDir === "up" ? "▲" : "▼"} {item.delta}
              </div>
              <div className="benchmark-card-label">{item.label}</div>
              {item.breakdown && (
                <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "6px", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "5px" }}>
                  {item.breakdown}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="benchmark-charts-grid">
          {/* Detailed Model Comparison Metric chart */}
          <div className="benchmark-chart-card">
            <div className="benchmark-chart-title">{currentDataset.comparison.title}</div>
            <div className="benchmark-chart-subtitle">
              {currentDataset.comparison.subtitle}
            </div>

            {/* Metric legend */}
            {currentDataset.comparison.val2Label ? (
              <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 5, background: "var(--cyan)", borderRadius: 2 }} />
                  <span>{currentDataset.comparison.val1Label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 5, background: "rgba(0, 212, 255, 0.45)", borderRadius: 2 }} />
                  <span>{currentDataset.comparison.val2Label}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 5, background: "var(--cyan)", borderRadius: 2 }} />
                  <span>{currentDataset.comparison.val1Label}</span>
                </div>
              </div>
            )}

            <div className="benchmark-bar-list">
              {currentDataset.comparison.rows.map((row) => (
                <div key={row.model} className="benchmark-bar-item">
                  <div className="benchmark-bar-header">
                    <span className="benchmark-bar-label">{row.model}</span>
                    <span className="benchmark-bar-value">
                      {row.val2Formatted
                        ? `${row.val1Formatted} · ${currentDataset.comparison.val2Label}: ${row.val2Formatted}`
                        : row.val1Formatted}
                    </span>
                  </div>
                  <div className="benchmark-bar-track">
                    <div
                      className="benchmark-bar-fill"
                      style={{
                        width: animated ? `${Math.min(100, row.val1)}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                  {row.val2 !== undefined && (
                    <div className="benchmark-bar-track" style={{ marginTop: 3 }}>
                      <div
                        className="benchmark-bar-fill"
                        style={{
                          width: animated ? `${Math.min(100, row.val2)}%` : "0%",
                          background: `${row.color}88`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pillar-by-Pillar Model Accuracy (side-by-side with Overall Accuracy) */}
          <div className="benchmark-chart-card">
            <div className="benchmark-chart-title">{currentDataset.domainWiseAccuracy.title}</div>
            <div className="benchmark-chart-subtitle">
              {currentDataset.domainWiseAccuracy.subtitle}
            </div>

            {/* Domain Selector Tabs */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                minWidth: 0,
                paddingBottom: "8px",
                marginBottom: "14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                scrollbarWidth: "thin",
              }}
            >
              {currentDataset.domainWiseAccuracy.domains.map((dom, dIdx) => (
                <button
                  key={dom.domain}
                  onClick={() => setSelectedDomainIdx(dIdx)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: selectedDomainIdx === dIdx ? 700 : 500,
                    borderRadius: "6px",
                    background: selectedDomainIdx === dIdx ? "rgba(0, 212, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    border: selectedDomainIdx === dIdx ? "1px solid rgba(0, 212, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: selectedDomainIdx === dIdx ? "var(--cyan)" : "var(--text-muted)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {dom.domain}
                </button>
              ))}
            </div>

            {/* Active Domain Details */}
            {(() => {
              const activeDom =
                currentDataset.domainWiseAccuracy.domains[selectedDomainIdx] ||
                currentDataset.domainWiseAccuracy.domains[0];
              if (!activeDom) return null;

              return (
                <div style={{ minWidth: 0 }}>
                  {/* Domain header banner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      minWidth: 0,
                      padding: "8px 12px",
                      background: "rgba(0, 0, 0, 0.25)",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                        {activeDom.domain}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginLeft: "8px" }}>
                        ({activeDom.discipline})
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          fontWeight: 700,
                        }}
                      >
                        🏆 Leader: {activeDom.leaderModel} ({activeDom.leaderScore})
                      </span>
                      {activeDom.baselineScore && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "var(--emerald)",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                            fontWeight: 600,
                          }}
                        >
                          👤 {activeDom.baselineModel}: {activeDom.baselineScore}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Model comparative bars in this domain */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {activeDom.models.map((m) => (
                      <div key={m.model} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem" }}>
                          <span style={{ color: m.isLeader ? "var(--cyan)" : "var(--text-muted)", fontWeight: m.isLeader ? 700 : 500, display: "flex", alignItems: "center", gap: "6px" }}>
                            {m.isLeader && <span>★</span>}
                            {m.model}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: m.isLeader ? "var(--emerald)" : "var(--text)" }}>
                            {m.scoreFormatted}
                          </span>
                        </div>
                        <div style={{ height: "6px", background: "var(--bg-surface-elevated)", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "3px",
                              width: animated ? `${Math.min(100, m.score)}%` : "0%",
                              background: m.color,
                              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Paper-Unique Signature Insight Graph */}
        {(() => {
          const insight = currentDataset.uniquePaperInsight;
          if (!insight) return null;

          return (
            <div className="benchmark-chart-card" style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "4px" }}>
                <div>
                  <div className="benchmark-chart-title">{insight.title}</div>
                  <div className="benchmark-chart-subtitle">{insight.subtitle}</div>
                </div>
                <div style={{
                  fontSize: "0.72rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(14, 165, 233, 0.1)",
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                  color: "var(--cyan)",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <span>📜</span>
                  <span>{insight.paperRef}</span>
                </div>
              </div>

              {/* Key Takeaway Banner */}
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                fontSize: "0.78rem",
                color: "var(--text-dim)",
                lineHeight: 1.5,
                marginTop: "6px",
                marginBottom: "20px",
              }}>
                <span style={{ color: "var(--cyan)", fontSize: "1rem" }}>💡</span>
                <div>
                  <strong style={{ color: "var(--text)" }}>Research Finding: </strong>
                  {insight.keyTakeaway}
                </div>
              </div>

              {/* Rendering based on insight.type */}
              {insight.type === "scenario_workflows" && insight.scenarioRows && (
                <div>
                  {/* Scenario Workflows Legend */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>GPT-4o</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Gemini 1.5 Flash</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#0ea5e9" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Qwen-VL-Max</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Human Adjuster Baseline</span>
                    </div>
                  </div>

                  {/* List of 5 Workflows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {insight.scenarioRows.map((s) => (
                      <div key={s.scenario} style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                          <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{s.scenario}</span>
                            <span style={{ fontSize: "0.74rem", color: "var(--text-subtle)", marginLeft: "8px" }}>• {s.category}</span>
                          </div>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: s.difficulty === "Critical" ? "rgba(239, 68, 68, 0.15)" : s.difficulty === "High" ? "rgba(245, 158, 11, 0.15)" : "rgba(14, 165, 233, 0.15)",
                            color: s.difficulty === "Critical" ? "#f87171" : s.difficulty === "High" ? "#fbbf24" : "var(--cyan)",
                            border: `1px solid ${s.difficulty === "Critical" ? "rgba(239, 68, 68, 0.3)" : s.difficulty === "High" ? "rgba(245, 158, 11, 0.3)" : "rgba(14, 165, 233, 0.3)"}`,
                            fontWeight: 600,
                          }}>
                            {s.difficulty} Risk
                          </span>
                        </div>

                        {/* 4 Models side by side tracks */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                          {[
                            { name: "GPT-4o", score: s.gpt4o, color: "#f59e0b" },
                            { name: "Gemini Flash", score: s.geminiFlash, color: "#10b981" },
                            { name: "Qwen-VL-Max", score: s.qwenVlMax, color: "#0ea5e9" },
                            { name: "Human Baseline", score: s.humanBaseline, color: "#22c55e" },
                          ].map((m) => (
                            <div key={m.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                                <span style={{ color: "var(--text-dim)" }}>{m.name}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>{m.score}%</span>
                              </div>
                              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: "3px",
                                    width: animated ? `${Math.min(100, m.score)}%` : "0%",
                                    background: m.color,
                                    transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.type === "reasoning_architecture" && insight.reasoningRows && (
                <div>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 12, height: 6, borderRadius: 2, background: "var(--cyan)" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Thinking Mode (Chain-of-Thought)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 12, height: 6, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
                      <span style={{ color: "var(--text-dim)" }}>Non-Thinking Standard Mode</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 12, height: 6, borderRadius: 2, background: "var(--emerald)" }} />
                      <span style={{ color: "var(--emerald)", fontWeight: 600 }}>Vertical Domain Model (Finix-S1)</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {insight.reasoningRows.map((r) => (
                      <div key={r.model} style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: r.isSpecialized ? "var(--emerald)" : "var(--text)" }}>
                            {r.isSpecialized && <span>★ </span>}
                            {r.model}
                          </span>
                          {r.gainFormatted && (
                            <span style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.12)",
                              color: "var(--emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.25)",
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                            }}>
                              ⚡ {r.gainFormatted}
                            </span>
                          )}
                          {r.specialtyBadge && (
                            <span style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(14, 165, 233, 0.12)",
                              color: "var(--cyan)",
                              border: "1px solid rgba(14, 165, 233, 0.25)",
                              fontWeight: 700,
                            }}>
                              🏆 {r.specialtyBadge}
                            </span>
                          )}
                        </div>

                        {/* Bars for Thinking & Non-Thinking */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                              <span style={{ color: "var(--text-muted)" }}>Thinking / CoT Score</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
                                {r.thinkingScore} pts
                              </span>
                            </div>
                            <div style={{ height: "7px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: "3px",
                                  width: animated ? `${Math.min(100, r.thinkingScore)}%` : "0%",
                                  background: r.color,
                                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              />
                            </div>
                          </div>

                          {r.nonThinkingScore !== undefined && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                                <span style={{ color: "var(--text-subtle)" }}>Non-Thinking Standard Score</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dim)" }}>
                                  {r.nonThinkingScore} pts
                                </span>
                              </div>
                              <div style={{ height: "5px", background: "rgba(255,255,255,0.04)", borderRadius: "3px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: "3px",
                                    width: animated ? `${Math.min(100, r.nonThinkingScore)}%` : "0%",
                                    background: "rgba(255,255,255,0.22)",
                                    transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.type === "deep_architecture" && insight.architectureRows && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {insight.architectureRows.map((a) => (
                      <div
                        key={a.architecture}
                        style={{
                          background: a.isBenchmarkBaseline ? "rgba(16, 185, 129, 0.05)" : a.isSOTA ? "rgba(236, 72, 153, 0.05)" : "rgba(255,255,255,0.02)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: a.isBenchmarkBaseline ? "1px solid rgba(16, 185, 129, 0.25)" : a.isSOTA ? "1px solid rgba(236, 72, 153, 0.25)" : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>{a.architecture}</span>
                            <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>{a.era}</span>
                            <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(14, 165, 233, 0.1)", color: "var(--cyan)" }}>Metric: {a.metric}</span>
                            {a.isBenchmarkBaseline && (
                              <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", color: "var(--emerald)", fontWeight: 700 }}>
                                ★ ACL 2015 Best
                              </span>
                            )}
                            {a.isSOTA && (
                              <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(236, 72, 153, 0.15)", color: "#f472b6", fontWeight: 700 }}>
                                🏆 Modern SOTA
                              </span>
                            )}
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.88rem", color: a.isBenchmarkBaseline ? "var(--emerald)" : a.isSOTA ? "#f472b6" : "var(--text)" }}>
                            {a.top1Accuracy}% P@1
                          </span>
                        </div>

                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden", margin: "6px 0" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "3px",
                              width: animated ? `${Math.min(100, a.top1Accuracy)}%` : "0%",
                              background: a.color,
                              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          />
                        </div>

                        <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                          {a.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.type === "human_boundary" && insight.humanBoundaryRows && (
                <div>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--cyan)" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Actuarial Knowledge (INS-Act-Know)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Case Reasoning (INS-Act-Case)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "#8b5cf6" }} />
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Tool Practice (Spreadsheet/R)</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {insight.humanBoundaryRows.map((h) => (
                      <div
                        key={h.model}
                        style={{
                          background: h.isHuman ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.02)",
                          padding: "12px 14px",
                          borderRadius: "8px",
                          border: h.isHuman ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: h.isHuman ? "var(--emerald)" : "var(--text)" }}>
                              {h.isHuman && <span>👤 </span>}
                              {h.model}
                            </span>
                            <span style={{
                              fontSize: "0.7rem",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: h.isHuman ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.06)",
                              color: h.isHuman ? "var(--emerald)" : "var(--text-dim)",
                              fontWeight: 600,
                            }}>
                              {h.statusBadge}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            {h.deltaVsHuman}
                          </span>
                        </div>

                        {/* 3 Subsets grouped bars */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                              <span style={{ color: "var(--text-dim)" }}>Knowledge</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--cyan)" }}>{h.knowledgeScore}%</span>
                            </div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: "3px",
                                  width: animated ? `${Math.min(100, h.knowledgeScore)}%` : "0%",
                                  background: "var(--cyan)",
                                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                              <span style={{ color: "var(--text-dim)" }}>Case Reasoning</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#f59e0b" }}>{h.caseReasoningScore}%</span>
                            </div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: "3px",
                                  width: animated ? `${Math.min(100, h.caseReasoningScore)}%` : "0%",
                                  background: "#f59e0b",
                                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "2px" }}>
                              <span style={{ color: "var(--text-dim)" }}>Tool Practice</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8b5cf6" }}>{h.toolPracticeScore}%</span>
                            </div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  borderRadius: "3px",
                                  width: animated ? `${Math.min(100, h.toolPracticeScore)}%` : "0%",
                                  background: "#8b5cf6",
                                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}


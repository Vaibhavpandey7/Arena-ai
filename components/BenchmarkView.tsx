"use client";
import { useState, useEffect } from "react";
import {
  BENCHMARK_DATASETS,
  BenchmarkDatasetId,
  MetaTaskKey,
  CufePillarKey,
  ActBenchTaskKey,
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

  // INS-MMBench Table 3 State
  const [table3DomainFilter, setTable3DomainFilter] = useState<"all" | "Auto" | "Property" | "Health" | "Agriculture">("all");
  const [selectedMetaTaskKey, setSelectedMetaTaskKey] = useState<MetaTaskKey>("vie");
  const [table3ViewMode, setTable3ViewMode] = useState<"matrix" | "inspector">("matrix");

  // CUFE 5D Matrix State
  const [cufePillarFilter, setCufePillarFilter] = useState<"all" | CufePillarKey>("all");
  const [selectedCufePillarKey, setSelectedCufePillarKey] = useState<CufePillarKey>("theory");
  const [cufeViewMode, setCufeViewMode] = useState<"matrix" | "inspector">("matrix");

  // InsuranceQA IBM Architecture Matrix State
  const [ibmCategoryFilter, setIbmCategoryFilter] = useState<"all" | "Baseline IR" | "Siamese CNN" | "Deep / Multilayer" | "Skip-Bigram CNN" | "Metric Learning">("all");
  const [selectedIbmIdx, setSelectedIbmIdx] = useState<number>(10);
  const [ibmViewMode, setIbmViewMode] = useState<"matrix" | "inspector">("matrix");

  // INS-ActBench Table 3 State
  const [actBenchSubsetFilter, setActBenchSubsetFilter] = useState<"all" | "Knowledge" | "Case" | "Practice">("all");
  const [selectedActBenchKey, setSelectedActBenchKey] = useState<ActBenchTaskKey>("ps");
  const [actBenchViewMode, setActBenchViewMode] = useState<"matrix" | "inspector">("matrix");

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
                {t === "CUFE" ? "CUFEInse" : t}
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
                <strong style={{ color: "var(--text)" }}>{currentDataset.paperTitle}</strong> — {currentDataset.authors}
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
                <span>Paper PDF</span>
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
                <span>{currentDataset.arxivId}</span>
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
                {i === 0 ? "1. " : i === 1 ? "2. " : i === 2 ? "3. " : `#${i + 1} `}
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
                        Leader: {activeDom.leaderModel} ({activeDom.leaderScore})
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
                          Human: {activeDom.baselineModel}: {activeDom.baselineScore}
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
                            {m.isLeader && <span style={{ fontSize: "0.65rem", color: "var(--emerald)", fontWeight: 700 }}>[TOP]</span>}
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
                <span style={{ color: "var(--cyan)", fontSize: "0.75rem", fontWeight: 700 }}>NOTE:</span>
                <div>
                  <strong style={{ color: "var(--text)" }}>Research Finding: </strong>
                  {insight.keyTakeaway}
                </div>
              </div>

              {/* Rendering based on insight.type */}
              {insight.type === "table3_matrix" && insight.table3Data && (() => {
                const table3 = insight.table3Data;
                const filteredTasks = table3DomainFilter === "all"
                  ? table3.tasks
                  : table3.tasks.filter((t) => t.domainShort === table3DomainFilter);

                const activeTask = table3.tasks.find((t) => t.key === selectedMetaTaskKey) || table3.tasks[0];

                // Column leaders for each task
                const taskLeaders: Record<MetaTaskKey, { maxScore: number; model: string }> = {} as any;
                table3.tasks.forEach((t) => {
                  let max = -1;
                  let leaderM = "";
                  table3.rows.forEach((r) => {
                    if (r.scores[t.key] > max) {
                      max = r.scores[t.key];
                      leaderM = r.model;
                    }
                  });
                  taskLeaders[t.key] = { maxScore: max, model: leaderM };
                });

                const getCellColor = (score: number, isLeader: boolean) => {
                  if (isLeader) {
                    return {
                      bg: "rgba(16, 185, 129, 0.18)",
                      border: "1px solid rgba(16, 185, 129, 0.45)",
                      text: "var(--emerald)",
                      weight: 700,
                    };
                  }
                  if (score >= 80) {
                    return {
                      bg: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.16)",
                      text: "#34d399",
                      weight: 600,
                    };
                  }
                  if (score >= 65) {
                    return {
                      bg: "rgba(14, 165, 233, 0.08)",
                      border: "1px solid rgba(14, 165, 233, 0.16)",
                      text: "#38bdf8",
                      weight: 600,
                    };
                  }
                  if (score >= 50) {
                    return {
                      bg: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.16)",
                      text: "#fbbf24",
                      weight: 500,
                    };
                  }
                  return {
                    bg: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.16)",
                    text: "#f87171",
                    weight: 500,
                  };
                };

                // Domain grouping metadata
                const DOMAIN_GROUPS: Array<{
                  short: "Auto" | "Property" | "Health" | "Agriculture";
                  name: string;
                  color: string;
                }> = [
                  { short: "Auto", name: "Auto Insurance", color: "#f59e0b" },
                  { short: "Property", name: "Property Insurance", color: "#8b5cf6" },
                  { short: "Health", name: "Health Insurance", color: "#0ea5e9" },
                  { short: "Agriculture", name: "Agricultural Insurance", color: "#10b981" },
                ];

                const displayedGroups = table3DomainFilter === "all"
                  ? DOMAIN_GROUPS
                  : DOMAIN_GROUPS.filter((g) => g.short === table3DomainFilter);

                // Models sorted by score for active task
                const activeTaskRankedRows = [...table3.rows].sort(
                  (a, b) => b.scores[activeTask.key] - a.scores[activeTask.key]
                );

                const humanRow = table3.rows.find((r) => r.category === "Human Expert");
                const humanScoreForActive = humanRow ? humanRow.scores[activeTask.key] : activeTask.humanScore;
                const topAiScore = Math.max(
                  ...table3.rows.filter((r) => r.category !== "Human Expert").map((r) => r.scores[activeTask.key])
                );
                const aiDeltaVsHuman = topAiScore - humanScoreForActive;

                return (
                  <div>
                    {/* Controls Toolbar: Domain Filter Pills + View Mode Switcher */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}>
                      {/* Domain Filter Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginRight: "4px", fontWeight: 600 }}>
                          Domain:
                        </span>
                        {(
                          [
                            { id: "all", label: "All (12 Tasks)" },
                            { id: "Auto", label: "Auto (4)" },
                            { id: "Property", label: "Property (3)" },
                            { id: "Health", label: "Health (2)" },
                            { id: "Agriculture", label: "Agriculture (3)" },
                          ] as const
                        ).map((d) => {
                          const isActive = table3DomainFilter === d.id;
                          return (
                            <button
                              key={d.id}
                              onClick={() => setTable3DomainFilter(d.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.74rem",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: isActive ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.03)",
                                border: isActive ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                                color: isActive ? "var(--cyan)" : "var(--text-muted)",
                              }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* View Mode Toggle & Legend */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {/* View Switcher */}
                        <div style={{
                          display: "inline-flex",
                          padding: "2px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}>
                          <button
                            onClick={() => setTable3ViewMode("matrix")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: table3ViewMode === "matrix" ? 700 : 500,
                              cursor: "pointer",
                              background: table3ViewMode === "matrix" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: table3ViewMode === "matrix" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            ⊞ Matrix Heatmap
                          </button>
                          <button
                            onClick={() => setTable3ViewMode("inspector")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: table3ViewMode === "inspector" ? 700 : 500,
                              cursor: "pointer",
                              background: table3ViewMode === "inspector" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: table3ViewMode === "inspector" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            Meta-Task Inspector ({filteredTasks.length})
                          </button>
                        </div>

                        {/* Legend */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ color: "var(--emerald)", fontWeight: 700 }}>SOTA Top</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(16, 185, 129, 0.5)" }} /> ≥80%
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(14, 165, 233, 0.5)" }} /> 65–80%
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(245, 158, 11, 0.5)" }} /> 50–65%
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(239, 68, 68, 0.5)" }} /> &lt;50%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* VIEW MODE 1: MATRIX HEATMAP TABLE */}
                    {table3ViewMode === "matrix" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                          overflowX: "auto",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(15, 23, 42, 0.6)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}>
                          <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}>
                            <thead>
                              {/* 1st Header Row: Domain Super-Headers */}
                              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <th style={{
                                  padding: "8px 12px",
                                  textAlign: "left",
                                  fontWeight: 700,
                                  color: "var(--text-muted)",
                                  minWidth: "160px",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Model / Architecture
                                </th>
                                {displayedGroups.map((g) => {
                                  const groupTasks = filteredTasks.filter((t) => t.domainShort === g.short);
                                  if (groupTasks.length === 0) return null;
                                  return (
                                    <th
                                      key={g.short}
                                      colSpan={groupTasks.length}
                                      style={{
                                        padding: "6px 8px",
                                        fontWeight: 700,
                                        color: g.color,
                                        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                        borderBottom: `2px solid ${g.color}`,
                                        letterSpacing: "0.03em",
                                        fontSize: "0.72rem",
                                      }}
                                    >
                                      {g.name}
                                    </th>
                                  );
                                })}
                                <th style={{
                                  padding: "8px 10px",
                                  fontWeight: 700,
                                  color: "var(--cyan)",
                                  minWidth: "75px",
                                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Average
                                </th>
                              </tr>

                              {/* 2nd Header Row: Meta-Task Codes (Interactive) */}
                              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                                <th style={{
                                  padding: "6px 12px",
                                  textAlign: "left",
                                  fontSize: "0.7rem",
                                  color: "var(--text-subtle)",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  <span style={{ fontSize: "0.68rem" }}>Category</span>
                                </th>
                                {filteredTasks.map((t) => {
                                  const isSelected = selectedMetaTaskKey === t.key;
                                  return (
                                    <th
                                      key={t.key}
                                      onClick={() => setSelectedMetaTaskKey(t.key)}
                                      title={`${t.name} (${t.domain})\nClick to inspect full details below`}
                                      style={{
                                        padding: "7px 6px",
                                        minWidth: "62px",
                                        cursor: "pointer",
                                        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                                        background: isSelected ? "rgba(14, 165, 233, 0.15)" : "transparent",
                                        color: isSelected ? "var(--cyan)" : "var(--text)",
                                        fontWeight: isSelected ? 800 : 600,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                        <span style={{ letterSpacing: "0.05em" }}>{t.code}</span>
                                        {isSelected && (
                                          <span style={{ fontSize: "0.58rem", color: "var(--cyan)", lineHeight: 1 }}>▲ Active</span>
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                                <th style={{
                                  padding: "6px 10px",
                                  fontSize: "0.7rem",
                                  color: "var(--text-subtle)",
                                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Overall
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {table3.rows.map((r, rowIdx) => {
                                const isHuman = r.category === "Human Expert";
                                return (
                                  <tr
                                    key={r.model}
                                    style={{
                                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                      background: isHuman
                                        ? "rgba(16, 185, 129, 0.05)"
                                        : rowIdx % 2 === 0
                                        ? "rgba(255, 255, 255, 0.01)"
                                        : "transparent",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    {/* Model Column */}
                                    <td style={{
                                      padding: "7px 12px",
                                      textAlign: "left",
                                      fontWeight: 600,
                                      borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                      whiteSpace: "nowrap",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        {isHuman ? (
                                          <span style={{ color: "var(--emerald)", fontSize: "0.75rem", fontWeight: 700 }}>HUMAN</span>
                                        ) : (
                                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color }} />
                                        )}
                                        <span style={{ color: isHuman ? "var(--emerald)" : "var(--text)" }}>
                                          {r.model}
                                        </span>
                                        <span style={{
                                          fontSize: "0.62rem",
                                          padding: "1px 5px",
                                          borderRadius: "3px",
                                          background: isHuman
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : r.category === "Open-Source"
                                            ? "rgba(139, 92, 246, 0.15)"
                                            : "rgba(245, 158, 11, 0.15)",
                                          color: isHuman
                                            ? "var(--emerald)"
                                            : r.category === "Open-Source"
                                            ? "#a78bfa"
                                            : "#fbbf24",
                                          fontWeight: 600,
                                        }}>
                                          {r.category === "Human Expert" ? "Human" : r.category === "Open-Source" ? "OS" : "Prop"}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Task Score Cells */}
                                    {filteredTasks.map((t) => {
                                      const score = r.scores[t.key];
                                      const isLeader = taskLeaders[t.key]?.model === r.model;
                                      const cellStyle = getCellColor(score, isLeader);
                                      const isSelectedCol = selectedMetaTaskKey === t.key;

                                      return (
                                        <td
                                          key={t.key}
                                          onClick={() => setSelectedMetaTaskKey(t.key)}
                                          title={`${r.model} on ${t.name}: ${score.toFixed(2)}%`}
                                          style={{
                                            padding: "6px 4px",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.72rem",
                                            fontWeight: cellStyle.weight,
                                            color: cellStyle.text,
                                            background: isSelectedCol
                                              ? `rgba(14, 165, 233, 0.12)`
                                              : cellStyle.bg,
                                            borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                            borderLeft: isSelectedCol ? "1px solid rgba(14, 165, 233, 0.3)" : "none",
                                            cursor: "pointer",
                                            transition: "background 0.15s ease",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                                            {isLeader && <span style={{ fontSize: "0.65rem", color: "var(--emerald)", fontWeight: 700 }}>SOTA</span>}
                                            <span>{score.toFixed(1)}</span>
                                          </div>
                                        </td>
                                      );
                                    })}

                                    {/* Average Column */}
                                    <td style={{
                                      padding: "7px 10px",
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 700,
                                      fontSize: "0.76rem",
                                      color: isHuman ? "var(--emerald)" : "var(--cyan)",
                                      borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                      background: "rgba(255, 255, 255, 0.02)",
                                    }}>
                                      {r.average.toFixed(2)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Interactive Hint */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.72rem",
                          color: "var(--text-subtle)",
                          padding: "0 4px",
                        }}>
                          <span><em>Click any column header or cell in Table 3 to inspect comprehensive matrix details below.</em></span>
                          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>Active Inspector: {activeTask.code} ({activeTask.name})</span>
                        </div>

                        {/* ACTIVE META-TASK DETAILED INSPECTOR CARD */}
                        <div style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid rgba(14, 165, 233, 0.25)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                        }}>
                          {/* Task Quick Selector Chips */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginBottom: "14px",
                            paddingBottom: "10px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                          }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Matrix Selector:
                            </span>
                            {table3.tasks.map((t) => {
                              const isSel = t.key === selectedMetaTaskKey;
                              return (
                                <button
                                  key={t.key}
                                  onClick={() => setSelectedMetaTaskKey(t.key)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.7rem",
                                    fontWeight: isSel ? 700 : 500,
                                    cursor: "pointer",
                                    background: isSel ? "var(--cyan)" : "rgba(255, 255, 255, 0.04)",
                                    color: isSel ? "#000" : "var(--text-muted)",
                                    border: isSel ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.07)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {t.code}
                                </button>
                              );
                            })}
                          </div>

                          {/* Active Task Profile Header */}
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "14px",
                          }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(14, 165, 233, 0.15)",
                                  color: "var(--cyan)",
                                  border: "1px solid rgba(14, 165, 233, 0.3)",
                                  fontFamily: "var(--font-mono)",
                                }}>
                                  {activeTask.code}
                                </span>
                                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                  {activeTask.name}
                                </span>
                                <span style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "var(--text-dim)",
                                  fontWeight: 600,
                                }}>
                                  {activeTask.domain}
                                </span>
                              </div>
                            </div>

                            {/* 3 Pill Badges: Leader, Runner-up, Human Baseline */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              {/* SOTA Leader */}
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>SOTA Leader:</span>
                                <strong style={{ color: "var(--emerald)" }}>{activeTask.leaderModel} ({activeTask.leaderScore.toFixed(1)}%)</strong>
                              </div>

                              {/* Runner Up */}
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(14, 165, 233, 0.1)",
                                border: "1px solid rgba(14, 165, 233, 0.25)",
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Runner-Up:</span>
                                <strong style={{ color: "var(--cyan)" }}>{activeTask.secondModel} ({activeTask.secondScore.toFixed(1)}%)</strong>
                              </div>

                              {/* Human Baseline Delta */}
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: aiDeltaVsHuman >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                border: `1px solid ${aiDeltaVsHuman >= 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Human:</span>
                                <strong style={{ color: "var(--text)" }}>{humanScoreForActive.toFixed(1)}%</strong>
                                <span style={{
                                  marginLeft: "6px",
                                  color: aiDeltaVsHuman >= 0 ? "var(--emerald)" : "#fbbf24",
                                  fontWeight: 700,
                                }}>
                                  ({aiDeltaVsHuman >= 0 ? `AI +${aiDeltaVsHuman.toFixed(1)}%` : `Human +${Math.abs(aiDeltaVsHuman).toFixed(1)}%`})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Evaluation Definition & Operational Impact */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "10px",
                            marginBottom: "16px",
                            fontSize: "0.75rem",
                          }}>
                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "var(--cyan)", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Evaluation Task Definition
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activeTask.description}
                              </div>
                            </div>

                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "var(--emerald)", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Insurance Operational Impact
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activeTask.operationalImpact}
                              </div>
                            </div>
                          </div>

                          {/* Complete Model Comparative Leaderboard for this Meta-Task */}
                          <div>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "10px",
                              fontSize: "0.72rem",
                              color: "var(--text-subtle)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              fontWeight: 700,
                            }}>
                              <span>Full Model Evaluation Ranking for {activeTask.code}</span>
                              <span>Table 3 Verified Accuracy</span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
                              {activeTaskRankedRows.map((r, rankIdx) => {
                                const score = r.scores[activeTask.key];
                                const isHuman = r.category === "Human Expert";
                                const isTop = rankIdx === 0;

                                return (
                                  <div
                                    key={r.model}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: "6px",
                                      background: isTop
                                        ? "rgba(16, 185, 129, 0.08)"
                                        : isHuman
                                        ? "rgba(255, 255, 255, 0.04)"
                                        : "rgba(255, 255, 255, 0.015)",
                                      border: isTop
                                        ? "1px solid rgba(16, 185, 129, 0.3)"
                                        : isHuman
                                        ? "1px solid rgba(255, 255, 255, 0.1)"
                                        : "1px solid rgba(255, 255, 255, 0.04)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{
                                          fontSize: "0.64rem",
                                          fontFamily: "var(--font-mono)",
                                          fontWeight: 700,
                                          color: isTop ? "var(--emerald)" : "var(--text-subtle)",
                                          width: "16px",
                                        }}>
                                          #{rankIdx + 1}
                                        </span>
                                        <span style={{
                                          fontWeight: isTop || isHuman ? 700 : 500,
                                          color: isHuman ? "var(--emerald)" : isTop ? "var(--text)" : "var(--text-dim)",
                                        }}>
                                          {r.model}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: 700,
                                        color: isTop ? "var(--emerald)" : "var(--text)",
                                      }}>
                                        {score.toFixed(1)}%
                                      </span>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ height: "4px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "2px", overflow: "hidden" }}>
                                      <div
                                        style={{
                                          height: "100%",
                                          borderRadius: "2px",
                                          width: animated ? `${Math.min(100, score)}%` : "0%",
                                          background: isHuman ? "var(--emerald)" : isTop ? "#10b981" : r.color,
                                          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW MODE 2: META-TASK DEEP INSPECTOR CARDS (Grid of all filtered tasks) */}
                    {table3ViewMode === "inspector" && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "14px",
                      }}>
                        {filteredTasks.map((t) => {
                          const taskRankedRows = [...table3.rows].sort(
                            (a, b) => b.scores[t.key] - a.scores[t.key]
                          );
                          const humanR = table3.rows.find((r) => r.category === "Human Expert");
                          const hScore = humanR ? humanR.scores[t.key] : t.humanScore;
                          const aiMax = Math.max(
                            ...table3.rows.filter((r) => r.category !== "Human Expert").map((r) => r.scores[t.key])
                          );
                          const delta = aiMax - hScore;

                          return (
                            <div
                              key={t.key}
                              style={{
                                padding: "14px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                              }}
                            >
                              {/* Card Header */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 800,
                                      fontSize: "0.78rem",
                                      color: "var(--cyan)",
                                      background: "rgba(14, 165, 233, 0.12)",
                                      padding: "1px 6px",
                                      borderRadius: "3px",
                                    }}>
                                      {t.code}
                                    </span>
                                    <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text)" }}>
                                      {t.name}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: t.color, fontWeight: 600 }}>
                                    {t.domain}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedMetaTaskKey(t.key);
                                    setTable3ViewMode("matrix");
                                  }}
                                  style={{
                                    fontSize: "0.66rem",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "var(--cyan)",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  View in Table ↗
                                </button>
                              </div>

                              {/* Description & Operational Role */}
                              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
                                {t.description}
                              </div>
                              <div style={{
                                fontSize: "0.7rem",
                                color: "var(--text-subtle)",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                background: "rgba(255, 255, 255, 0.02)",
                                borderLeft: `2px solid ${t.color}`,
                              }}>
                                <strong style={{ color: "var(--text-muted)" }}>Impact: </strong>
                                {t.operationalImpact}
                              </div>

                              {/* Leader vs Human Stat Row */}
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "6px",
                                fontSize: "0.7rem",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.025)",
                              }}>
                                <div>
                                  <div style={{ color: "var(--text-subtle)", fontSize: "0.64rem" }}>SOTA Leader</div>
                                  <div style={{ fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                                    {t.leaderModel}: {t.leaderScore.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: "var(--text-subtle)", fontSize: "0.64rem" }}>Human Baseline</div>
                                  <div style={{ fontWeight: 700, color: delta >= 0 ? "var(--text)" : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                                    {hScore.toFixed(1)}% ({delta >= 0 ? `+${delta.toFixed(1)}%` : `-${Math.abs(delta).toFixed(1)}%`})
                                  </div>
                                </div>
                              </div>

                              {/* Top 4 Model Bars for this Task */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "2px" }}>
                                {taskRankedRows.slice(0, 4).map((r, i) => {
                                  const sc = r.scores[t.key];
                                  const isH = r.category === "Human Expert";
                                  return (
                                    <div key={r.model} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
                                        <span style={{ color: isH ? "var(--emerald)" : "var(--text-dim)", fontWeight: i === 0 ? 700 : 500 }}>
                                          {i === 0 ? "[SOTA] " : ""}{r.model}
                                        </span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
                                          {sc.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                          style={{
                                            height: "100%",
                                            borderRadius: "2px",
                                            width: animated ? `${Math.min(100, sc)}%` : "0%",
                                            background: isH ? "var(--emerald)" : r.color,
                                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CUFE Official 5-Dimensional Competency Matrix */}
              {insight.type === "cufe_5d_matrix" && insight.cufeData && (() => {
                const cufe = insight.cufeData;
                const filteredPillars = cufePillarFilter === "all"
                  ? cufe.pillars
                  : cufe.pillars.filter((p) => p.key === cufePillarFilter);

                const activePillar = cufe.pillars.find((p) => p.key === selectedCufePillarKey) || cufe.pillars[0];

                // Column leaders for each pillar
                const pillarLeaders: Record<CufePillarKey, { maxScore: number; model: string }> = {} as any;
                cufe.pillars.forEach((p) => {
                  let max = -1;
                  let leaderM = "";
                  cufe.rows.forEach((r) => {
                    if (r.scores[p.key] > max) {
                      max = r.scores[p.key];
                      leaderM = r.model;
                    }
                  });
                  pillarLeaders[p.key] = { maxScore: max, model: leaderM };
                });

                const getCellColor = (score: number, isLeader: boolean) => {
                  if (isLeader) {
                    return {
                      bg: "rgba(16, 185, 129, 0.18)",
                      border: "1px solid rgba(16, 185, 129, 0.45)",
                      text: "var(--emerald)",
                      weight: 700,
                    };
                  }
                  if (score >= 90) {
                    return {
                      bg: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.16)",
                      text: "#34d399",
                      weight: 600,
                    };
                  }
                  if (score >= 80) {
                    return {
                      bg: "rgba(14, 165, 233, 0.08)",
                      border: "1px solid rgba(14, 165, 233, 0.16)",
                      text: "#38bdf8",
                      weight: 600,
                    };
                  }
                  if (score >= 70) {
                    return {
                      bg: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.16)",
                      text: "#fbbf24",
                      weight: 500,
                    };
                  }
                  return {
                    bg: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.16)",
                    text: "#f87171",
                    weight: 500,
                  };
                };

                const activePillarRankedRows = [...cufe.rows].sort(
                  (a, b) => b.scores[activePillar.key] - a.scores[activePillar.key]
                );

                return (
                  <div>
                    {/* Controls Bar */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}>
                      {/* Filter Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginRight: "4px", fontWeight: 600 }}>
                          Pillar:
                        </span>
                        {(
                          [
                            { id: "all", label: "All (5 Pillars)" },
                            { id: "theory", label: "Theory (14)" },
                            { id: "industry", label: "Industry (18)" },
                            { id: "compliance", label: "Compliance (5)" },
                            { id: "agent", label: "Agentic (8)" },
                            { id: "rigor", label: "Rigor (9)" },
                          ] as const
                        ).map((p) => {
                          const isActive = cufePillarFilter === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setCufePillarFilter(p.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.74rem",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: isActive ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.03)",
                                border: isActive ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                                color: isActive ? "var(--cyan)" : "var(--text-muted)",
                              }}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* View Switcher & Legend */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{
                          display: "inline-flex",
                          padding: "2px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}>
                          <button
                            onClick={() => setCufeViewMode("matrix")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: cufeViewMode === "matrix" ? 700 : 500,
                              cursor: "pointer",
                              background: cufeViewMode === "matrix" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: cufeViewMode === "matrix" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            ⊞ Competency Heatmap
                          </button>
                          <button
                            onClick={() => setCufeViewMode("inspector")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: cufeViewMode === "inspector" ? 700 : 500,
                              cursor: "pointer",
                              background: cufeViewMode === "inspector" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: cufeViewMode === "inspector" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            Pillar Deep Inspector ({filteredPillars.length})
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ color: "var(--emerald)", fontWeight: 700 }}>Pillar SOTA</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(16, 185, 129, 0.5)" }} /> ≥90
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(14, 165, 233, 0.5)" }} /> 80–90
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(245, 158, 11, 0.5)" }} /> 70–80
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(239, 68, 68, 0.5)" }} /> &lt;70
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mode 1: Competency Heatmap Table */}
                    {cufeViewMode === "matrix" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                          overflowX: "auto",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(15, 23, 42, 0.6)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}>
                          <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}>
                            <thead>
                              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                                <th style={{
                                  padding: "8px 12px",
                                  textAlign: "left",
                                  fontWeight: 700,
                                  color: "var(--text-muted)",
                                  minWidth: "170px",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Evaluated Model / Tier
                                </th>
                                {filteredPillars.map((p) => {
                                  const isSelected = selectedCufePillarKey === p.key;
                                  return (
                                    <th
                                      key={p.key}
                                      onClick={() => setSelectedCufePillarKey(p.key)}
                                      title={`${p.name} (${p.code})\n${p.subIndicatorCount} Sub-Indicators\nClick to inspect breakdown below`}
                                      style={{
                                        padding: "8px 8px",
                                        minWidth: "100px",
                                        cursor: "pointer",
                                        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                                        background: isSelected ? "rgba(14, 165, 233, 0.15)" : "transparent",
                                        color: isSelected ? "var(--cyan)" : "var(--text)",
                                        fontWeight: isSelected ? 800 : 600,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                        <span style={{ letterSpacing: "0.03em" }}>{p.code}</span>
                                        <span style={{ fontSize: "0.66rem", color: isSelected ? "var(--cyan)" : p.color, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                                          {p.nameZh}
                                        </span>
                                        <span style={{ fontSize: "0.6rem", color: "var(--text-subtle)" }}>
                                          ({p.subIndicatorCount} ind.)
                                        </span>
                                        {isSelected && (
                                          <span style={{ fontSize: "0.58rem", color: "var(--cyan)", lineHeight: 1 }}>▲ Active</span>
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                                <th style={{
                                  padding: "8px 10px",
                                  fontWeight: 700,
                                  color: "var(--cyan)",
                                  minWidth: "95px",
                                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Composite Score
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {cufe.rows.map((r, rowIdx) => {
                                const isFinix = r.model.includes("Finix-S1");
                                return (
                                  <tr
                                    key={r.model}
                                    style={{
                                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                      background: isFinix
                                        ? "rgba(16, 185, 129, 0.05)"
                                        : rowIdx % 2 === 0
                                        ? "rgba(255, 255, 255, 0.01)"
                                        : "transparent",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    <td style={{
                                      padding: "7px 12px",
                                      textAlign: "left",
                                      fontWeight: 600,
                                      borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                      whiteSpace: "nowrap",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color }} />
                                        <span style={{ color: isFinix ? "var(--emerald)" : "var(--text)" }}>
                                          {r.model}
                                        </span>
                                        <span style={{
                                          fontSize: "0.62rem",
                                          padding: "1px 5px",
                                          borderRadius: "3px",
                                          background: r.tier === "Tier 1"
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : r.tier === "Tier 2"
                                            ? "rgba(14, 165, 233, 0.15)"
                                            : "rgba(245, 158, 11, 0.15)",
                                          color: r.tier === "Tier 1"
                                            ? "var(--emerald)"
                                            : r.tier === "Tier 2"
                                            ? "var(--cyan)"
                                            : "#fbbf24",
                                          fontWeight: 600,
                                        }}>
                                          {r.tier}
                                        </span>
                                      </div>
                                    </td>

                                    {filteredPillars.map((p) => {
                                      const score = r.scores[p.key];
                                      const isLeader = pillarLeaders[p.key]?.model === r.model;
                                      const cellStyle = getCellColor(score, isLeader);
                                      const isSelectedCol = selectedCufePillarKey === p.key;

                                      return (
                                        <td
                                          key={p.key}
                                          onClick={() => setSelectedCufePillarKey(p.key)}
                                          title={`${r.model} on ${p.name}: ${score.toFixed(2)} pts`}
                                          style={{
                                            padding: "6px 6px",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.72rem",
                                            fontWeight: cellStyle.weight,
                                            color: cellStyle.text,
                                            background: isSelectedCol
                                              ? "rgba(14, 165, 233, 0.12)"
                                              : cellStyle.bg,
                                            borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                            borderLeft: isSelectedCol ? "1px solid rgba(14, 165, 233, 0.3)" : "none",
                                            cursor: "pointer",
                                            transition: "background 0.15s ease",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                                            {isLeader && <span style={{ fontSize: "0.65rem", color: "var(--emerald)", fontWeight: 700 }}>SOTA</span>}
                                            <span>{score.toFixed(2)}</span>
                                          </div>
                                        </td>
                                      );
                                    })}

                                    <td style={{
                                      padding: "7px 10px",
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 700,
                                      fontSize: "0.76rem",
                                      color: isFinix ? "var(--emerald)" : "var(--cyan)",
                                      borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                      background: "rgba(255, 255, 255, 0.02)",
                                    }}>
                                      {r.totalScore.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Interactive Hint */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.72rem",
                          color: "var(--text-subtle)",
                          padding: "0 4px",
                        }}>
                          <span><em>Click any pillar header or cell in the table to inspect all sub-indicators and detailed analysis below.</em></span>
                          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>Active Inspector: {activePillar.name} ({activePillar.code})</span>
                        </div>

                        {/* Active Pillar Inspector Card */}
                        <div style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid rgba(14, 165, 233, 0.25)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                        }}>
                          {/* Pillar Quick Chips */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginBottom: "14px",
                            paddingBottom: "10px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                          }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Pillar Selector:
                            </span>
                            {cufe.pillars.map((p) => {
                              const isSel = p.key === selectedCufePillarKey;
                              return (
                                <button
                                  key={p.key}
                                  onClick={() => setSelectedCufePillarKey(p.key)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.7rem",
                                    fontWeight: isSel ? 700 : 500,
                                    cursor: "pointer",
                                    background: isSel ? "var(--cyan)" : "rgba(255, 255, 255, 0.04)",
                                    color: isSel ? "#000" : "var(--text-muted)",
                                    border: isSel ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.07)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {p.code} · {p.nameZh}
                                </button>
                              );
                            })}
                          </div>

                          {/* Profile Header */}
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "14px",
                          }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(14, 165, 233, 0.15)",
                                  color: "var(--cyan)",
                                  border: "1px solid rgba(14, 165, 233, 0.3)",
                                  fontFamily: "var(--font-mono)",
                                }}>
                                  {activePillar.code}
                                </span>
                                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                  {activePillar.name}
                                </span>
                                <span style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "var(--text-dim)",
                                  fontWeight: 600,
                                }}>
                                  {activePillar.subIndicatorCount} Sub-Indicators
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>SOTA Leader:</span>
                                <strong style={{ color: "var(--emerald)" }}>{activePillar.leaderModel} ({activePillar.leaderScore.toFixed(2)} pts)</strong>
                              </div>
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(14, 165, 233, 0.1)",
                                border: "1px solid rgba(14, 165, 233, 0.25)",
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Runner-Up:</span>
                                <strong style={{ color: "var(--cyan)" }}>{activePillar.secondModel} ({activePillar.secondScore.toFixed(2)} pts)</strong>
                              </div>
                            </div>
                          </div>

                          {/* Description & Industry Bottleneck */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "10px",
                            marginBottom: "14px",
                            fontSize: "0.75rem",
                          }}>
                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "var(--cyan)", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Evaluation Scope & Definition
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activePillar.description}
                              </div>
                            </div>

                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "#f87171", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Industry Bottleneck & Finding
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activePillar.industryBottleneck}
                              </div>
                            </div>
                          </div>

                          {/* Ranked Models Leaderboard for this Pillar */}
                          <div>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "10px",
                              fontSize: "0.72rem",
                              color: "var(--text-subtle)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              fontWeight: 700,
                            }}>
                              <span>Full Model Evaluation Ranking for {activePillar.name}</span>
                              <span>CUFE Official Standardized Score (0–100 pts)</span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
                              {activePillarRankedRows.map((r, rankIdx) => {
                                const score = r.scores[activePillar.key];
                                const isTop = rankIdx === 0;

                                return (
                                  <div
                                    key={r.model}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: "6px",
                                      background: isTop
                                        ? "rgba(16, 185, 129, 0.08)"
                                        : "rgba(255, 255, 255, 0.015)",
                                      border: isTop
                                        ? "1px solid rgba(16, 185, 129, 0.3)"
                                        : "1px solid rgba(255, 255, 255, 0.04)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{
                                          fontSize: "0.64rem",
                                          fontFamily: "var(--font-mono)",
                                          fontWeight: 700,
                                          color: isTop ? "var(--emerald)" : "var(--text-subtle)",
                                          width: "16px",
                                        }}>
                                          #{rankIdx + 1}
                                        </span>
                                        <span style={{
                                          fontWeight: isTop ? 700 : 500,
                                          color: isTop ? "var(--text)" : "var(--text-dim)",
                                        }}>
                                          {r.model}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: 700,
                                        color: isTop ? "var(--emerald)" : "var(--text)",
                                      }}>
                                        {score.toFixed(2)} pts
                                      </span>
                                    </div>

                                    <div style={{ height: "4px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "2px", overflow: "hidden" }}>
                                      <div
                                        style={{
                                          height: "100%",
                                          borderRadius: "2px",
                                          width: animated ? `${Math.min(100, score)}%` : "0%",
                                          background: isTop ? "#10b981" : r.color,
                                          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Pillar Deep Inspector Grid */}
                    {cufeViewMode === "inspector" && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "14px",
                      }}>
                        {filteredPillars.map((p) => {
                          const pRankedRows = [...cufe.rows].sort(
                            (a, b) => b.scores[p.key] - a.scores[p.key]
                          );
                          return (
                            <div
                              key={p.key}
                              style={{
                                padding: "14px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 800,
                                      fontSize: "0.78rem",
                                      color: "var(--cyan)",
                                      background: "rgba(14, 165, 233, 0.12)",
                                      padding: "1px 6px",
                                      borderRadius: "3px",
                                    }}>
                                      {p.code}
                                    </span>
                                    <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text)" }}>
                                      {p.name}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: p.color, fontWeight: 600 }}>
                                    {p.nameZh} · {p.subIndicatorCount} Sub-Indicators
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedCufePillarKey(p.key);
                                    setCufeViewMode("matrix");
                                  }}
                                  style={{
                                    fontSize: "0.66rem",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "var(--cyan)",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  View in Table ↗
                                </button>
                              </div>

                              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
                                {p.description}
                              </div>

                              <div style={{
                                fontSize: "0.7rem",
                                color: "var(--text-subtle)",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                background: "rgba(255, 255, 255, 0.02)",
                                borderLeft: `2px solid ${p.color}`,
                              }}>
                                <strong style={{ color: "#f87171" }}>Bottleneck: </strong>
                                {p.industryBottleneck}
                              </div>

                              {/* Leader Pill */}
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.7rem",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.025)",
                              }}>
                                <div>
                                  <span style={{ color: "var(--text-subtle)" }}>SOTA Leader: </span>
                                  <strong style={{ color: "var(--emerald)" }}>{p.leaderModel}</strong>
                                </div>
                                <div style={{ fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                                  {p.leaderScore.toFixed(2)} pts
                                </div>
                              </div>

                              {/* Top 4 Models */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {pRankedRows.slice(0, 4).map((r, i) => {
                                  const sc = r.scores[p.key];
                                  return (
                                    <div key={r.model} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
                                        <span style={{ color: i === 0 ? "var(--emerald)" : "var(--text-dim)", fontWeight: i === 0 ? 700 : 500 }}>
                                          {i === 0 ? "[SOTA] " : ""}{r.model}
                                        </span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
                                          {sc.toFixed(2)} pts
                                        </span>
                                      </div>
                                      <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                          style={{
                                            height: "100%",
                                            borderRadius: "2px",
                                            width: animated ? `${Math.min(100, sc)}%` : "0%",
                                            background: i === 0 ? "#10b981" : r.color,
                                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* InsuranceQA Table 2 & Table 3 Architecture & Metric Learning Matrix */}
              {insight.type === "ibm_architecture_matrix" && insight.ibmData && (() => {
                const ibm = insight.ibmData;
                const filteredRows = ibmCategoryFilter === "all"
                  ? ibm.rows
                  : ibm.rows.filter((r) => r.category === ibmCategoryFilter);

                const activeArch = ibm.rows.find((r) => r.idx === selectedIbmIdx) || ibm.rows[9];

                return (
                  <div>
                    {/* Controls Bar */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginRight: "4px", fontWeight: 600 }}>
                          Category:
                        </span>
                        {(
                          [
                            { id: "all", label: "All (16 Architectures)" },
                            { id: "Baseline IR", label: "Baseline IR (2)" },
                            { id: "Siamese CNN", label: "Siamese CNN (6)" },
                            { id: "Deep / Multilayer", label: "Multilayer (4)" },
                            { id: "Skip-Bigram CNN", label: "Skip-Bigram (3)" },
                            { id: "Metric Learning", label: "Metric Learning (1)" },
                          ] as const
                        ).map((c) => {
                          const isActive = ibmCategoryFilter === c.id;
                          return (
                            <button
                              key={c.id}
                              onClick={() => setIbmCategoryFilter(c.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.74rem",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: isActive ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.03)",
                                border: isActive ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                                color: isActive ? "var(--cyan)" : "var(--text-muted)",
                              }}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{
                          display: "inline-flex",
                          padding: "2px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}>
                          <button
                            onClick={() => setIbmViewMode("matrix")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: ibmViewMode === "matrix" ? 700 : 500,
                              cursor: "pointer",
                              background: ibmViewMode === "matrix" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: ibmViewMode === "matrix" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            ⊞ Table 2 & 3 Matrix
                          </button>
                          <button
                            onClick={() => setIbmViewMode("inspector")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: ibmViewMode === "inspector" ? 700 : 500,
                              cursor: "pointer",
                              background: ibmViewMode === "inspector" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: ibmViewMode === "inspector" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            Architecture Inspector ({filteredRows.length})
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                          <span style={{ color: "var(--emerald)", fontWeight: 700 }}>Table 3 SOTA (63.4%)</span>
                          <span>•</span>
                          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>500 Candidates / Question</span>
                        </div>
                      </div>
                    </div>

                    {/* Mode 1: Table 2 Matrix Table */}
                    {ibmViewMode === "matrix" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                          overflowX: "auto",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(15, 23, 42, 0.6)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}>
                          <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}>
                            <thead>
                              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", width: "40px" }}>#</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", minWidth: "220px" }}>Neural Architecture & Category</th>
                                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", minWidth: "180px" }}>Structural Formulation</th>
                                <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--cyan)", minWidth: "75px" }}>Dev (%)</th>
                                <th style={{ padding: "8px 10px", fontWeight: 700, color: "var(--emerald)", minWidth: "80px" }}>Test-1 (%)</th>
                                <th style={{ padding: "8px 10px", fontWeight: 700, color: "#a855f7", minWidth: "80px" }}>Test-2 (%)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRows.map((r, rowIdx) => {
                                const isSelected = selectedIbmIdx === r.idx;
                                const isSota = r.isBestPaperBaseline || r.isBestTable2;

                                return (
                                  <tr
                                    key={r.idx}
                                    onClick={() => setSelectedIbmIdx(r.idx)}
                                    style={{
                                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                      background: isSelected
                                        ? "rgba(14, 165, 233, 0.12)"
                                        : isSota
                                        ? "rgba(16, 185, 129, 0.05)"
                                        : rowIdx % 2 === 0
                                        ? "rgba(255, 255, 255, 0.01)"
                                        : "transparent",
                                      cursor: "pointer",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    <td style={{ padding: "7px 10px", textAlign: "left", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", fontSize: "0.7rem" }}>
                                      {r.idx}
                                    </td>
                                    <td style={{ padding: "7px 12px", textAlign: "left", fontWeight: 600 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                        {isSota && <span style={{ color: "var(--emerald)", fontWeight: 700 }}>SOTA</span>}
                                        <span style={{ color: isSelected ? "var(--cyan)" : isSota ? "var(--emerald)" : "var(--text)" }}>
                                          {r.architecture}
                                        </span>
                                        <span style={{
                                          fontSize: "0.62rem",
                                          padding: "1px 5px",
                                          borderRadius: "3px",
                                          background: "rgba(255, 255, 255, 0.06)",
                                          color: "var(--text-dim)",
                                        }}>
                                          {r.category}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "7px 10px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-subtle)" }}>
                                      {r.formulation}
                                    </td>
                                    <td style={{ padding: "7px 10px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--cyan)" }}>
                                      {r.devAcc.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: "7px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: r.test1Acc >= 62 ? "var(--emerald)" : "var(--text)" }}>
                                      {r.test1Acc.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: "7px 10px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#a855f7" }}>
                                      {r.test2Acc.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Interactive Hint */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.72rem",
                          color: "var(--text-subtle)",
                          padding: "0 4px",
                        }}>
                          <span><em>Click any architecture in the table to inspect detailed formulation, convolutional kernels, and similarity metric benchmarks below.</em></span>
                          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>Active Inspector: {activeArch.architecture}</span>
                        </div>

                        {/* Active Architecture Inspector Card */}
                        <div style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid rgba(14, 165, 233, 0.25)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <span style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(14, 165, 233, 0.15)",
                                  color: "var(--cyan)",
                                  border: "1px solid rgba(14, 165, 233, 0.3)",
                                  fontFamily: "var(--font-mono)",
                                }}>
                                  #{activeArch.idx}
                                </span>
                                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                  {activeArch.architecture}
                                </span>
                                <span style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "var(--text-dim)",
                                  fontWeight: 600,
                                }}>
                                  {activeArch.category}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                                {activeArch.details}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.25)", fontSize: "0.72rem" }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Dev:</span>
                                <strong style={{ color: "var(--cyan)" }}>{activeArch.devAcc.toFixed(1)}%</strong>
                              </div>
                              <div style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", fontSize: "0.72rem" }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Test-1:</span>
                                <strong style={{ color: "var(--emerald)" }}>{activeArch.test1Acc.toFixed(1)}%</strong>
                              </div>
                              <div style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.25)", fontSize: "0.72rem" }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Test-2:</span>
                                <strong style={{ color: "#c084fc" }}>{activeArch.test2Acc.toFixed(1)}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Mathematical Formulation */}
                          <div style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: "rgba(0, 0, 0, 0.3)",
                            border: "1px solid rgba(255, 255, 255, 0.07)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.72rem",
                            color: "var(--cyan)",
                            marginBottom: "16px",
                          }}>
                            <span style={{ color: "var(--text-subtle)", marginRight: "6px" }}>Pipeline:</span>
                            {activeArch.formulation}
                          </div>

                          {/* Table 3 Metric Learning Drawer */}
                          <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text)" }}>
                                Table 3: Similarity Metric Benchmarks on Architecture II (500 Candidate Answers)
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>
                                IBM Watson Proposed GESD / AESD Metrics
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                              {ibm.metrics.map((m) => (
                                <div
                                  key={m.metric}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: "6px",
                                    background: m.metric.includes("Proposed") ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.02)",
                                    border: m.metric.includes("Proposed") ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "2px" }}>
                                    <span style={{ fontWeight: 700, color: m.metric.includes("Proposed") ? "var(--emerald)" : "var(--text)" }}>
                                      {m.metric}
                                    </span>
                                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
                                      {m.test1Acc.toFixed(1)}% P@1
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.64rem", color: "var(--text-subtle)", marginBottom: "4px" }}>
                                    {m.type}
                                  </div>
                                  <div style={{ fontSize: "0.64rem", color: m.metric.includes("Proposed") ? "var(--emerald)" : "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                                    {m.gainVsCosine}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Architecture Deep Inspector Grid */}
                    {ibmViewMode === "inspector" && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "14px",
                      }}>
                        {filteredRows.map((r) => (
                          <div
                            key={r.idx}
                            style={{
                              padding: "14px",
                              borderRadius: "8px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: r.isBestPaperBaseline ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                  <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 800,
                                    fontSize: "0.78rem",
                                    color: "var(--cyan)",
                                    background: "rgba(14, 165, 233, 0.12)",
                                    padding: "1px 6px",
                                    borderRadius: "3px",
                                  }}>
                                    #{r.idx}
                                  </span>
                                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text)" }}>
                                    {r.shortName}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.68rem", color: r.color, fontWeight: 600 }}>
                                  {r.category}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedIbmIdx(r.idx);
                                  setIbmViewMode("matrix");
                                }}
                                style={{
                                  fontSize: "0.66rem",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  color: "var(--cyan)",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                View in Table ↗
                              </button>
                            </div>

                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
                              {r.details}
                            </div>

                            <div style={{
                              padding: "6px 8px",
                              borderRadius: "4px",
                              background: "rgba(0,0,0,0.25)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.66rem",
                              color: "var(--cyan)",
                            }}>
                              {r.formulation}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "0.7rem", marginTop: "4px" }}>
                              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.02)", textAlign: "center" }}>
                                <div style={{ color: "var(--text-subtle)", fontSize: "0.62rem" }}>Dev</div>
                                <div style={{ fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{r.devAcc.toFixed(1)}%</div>
                              </div>
                              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.02)", textAlign: "center" }}>
                                <div style={{ color: "var(--text-subtle)", fontSize: "0.62rem" }}>Test-1</div>
                                <div style={{ fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>{r.test1Acc.toFixed(1)}%</div>
                              </div>
                              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.02)", textAlign: "center" }}>
                                <div style={{ color: "var(--text-subtle)", fontSize: "0.62rem" }}>Test-2</div>
                                <div style={{ fontWeight: 700, color: "#c084fc", fontFamily: "var(--font-mono)" }}>{r.test2Acc.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* INS-ActBench Table 3 Actuarial Capability Matrix */}
              {insight.type === "actbench_table3_matrix" && insight.actBenchData && (() => {
                const actbench = insight.actBenchData;
                const filteredTasks = actBenchSubsetFilter === "all"
                  ? actbench.tasks
                  : actbench.tasks.filter((t) => t.subsetShort === actBenchSubsetFilter);

                const activeTask = actbench.tasks.find((t) => t.key === selectedActBenchKey) || actbench.tasks[0];

                // Column leaders for each actuarial task
                const taskLeaders: Record<ActBenchTaskKey, { maxScore: number; model: string }> = {} as any;
                actbench.tasks.forEach((t) => {
                  let max = -1;
                  let leaderM = "";
                  actbench.rows.forEach((r) => {
                    if (r.scores[t.key] > max) {
                      max = r.scores[t.key];
                      leaderM = r.model;
                    }
                  });
                  taskLeaders[t.key] = { maxScore: max, model: leaderM };
                });

                const getCellColor = (score: number, isLeader: boolean) => {
                  if (isLeader) {
                    return {
                      bg: "rgba(16, 185, 129, 0.18)",
                      border: "1px solid rgba(16, 185, 129, 0.45)",
                      text: "var(--emerald)",
                      weight: 700,
                    };
                  }
                  if (score >= 80) {
                    return {
                      bg: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.16)",
                      text: "#34d399",
                      weight: 600,
                    };
                  }
                  if (score >= 65) {
                    return {
                      bg: "rgba(14, 165, 233, 0.08)",
                      border: "1px solid rgba(14, 165, 233, 0.16)",
                      text: "#38bdf8",
                      weight: 600,
                    };
                  }
                  if (score >= 50) {
                    return {
                      bg: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.16)",
                      text: "#fbbf24",
                      weight: 500,
                    };
                  }
                  return {
                    bg: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.16)",
                    text: "#f87171",
                    weight: 500,
                  };
                };

                const SUBSET_GROUPS: Array<{
                  short: "Knowledge" | "Case" | "Practice";
                  name: string;
                  color: string;
                }> = [
                  { short: "Knowledge", name: "INS-Act-Know (Standardized Exams)", color: "#f59e0b" },
                  { short: "Case", name: "INS-Act-Case (Case Analysis)", color: "#ec4899" },
                  { short: "Practice", name: "INS-Act-Practice (Tool Practice)", color: "#0ea5e9" },
                ];

                const displayedGroups = actBenchSubsetFilter === "all"
                  ? SUBSET_GROUPS
                  : SUBSET_GROUPS.filter((g) => g.short === actBenchSubsetFilter);

                const activeTaskRankedRows = [...actbench.rows].sort(
                  (a, b) => b.scores[activeTask.key] - a.scores[activeTask.key]
                );

                const humanRow = actbench.rows.find((r) => r.category === "Human Expert");
                const humanScoreForActive = humanRow ? humanRow.scores[activeTask.key] : activeTask.humanScore;
                const topAiScore = Math.max(
                  ...actbench.rows.filter((r) => r.category !== "Human Expert").map((r) => r.scores[activeTask.key])
                );
                const aiDeltaVsHuman = topAiScore - humanScoreForActive;

                return (
                  <div>
                    {/* Controls Bar */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginRight: "4px", fontWeight: 600 }}>
                          Subset:
                        </span>
                        {(
                          [
                            { id: "all", label: "All Subsets (10 Tasks)" },
                            { id: "Knowledge", label: "Knowledge (6 Exams)" },
                            { id: "Case", label: "Case Analysis (1)" },
                            { id: "Practice", label: "Tool Practice (3)" },
                          ] as const
                        ).map((s) => {
                          const isActive = actBenchSubsetFilter === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setActBenchSubsetFilter(s.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.74rem",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: isActive ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.03)",
                                border: isActive ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                                color: isActive ? "var(--cyan)" : "var(--text-muted)",
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{
                          display: "inline-flex",
                          padding: "2px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}>
                          <button
                            onClick={() => setActBenchViewMode("matrix")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: actBenchViewMode === "matrix" ? 700 : 500,
                              cursor: "pointer",
                              background: actBenchViewMode === "matrix" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: actBenchViewMode === "matrix" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            ⊞ Table 3 Heatmap
                          </button>
                          <button
                            onClick={() => setActBenchViewMode("inspector")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: actBenchViewMode === "inspector" ? 700 : 500,
                              cursor: "pointer",
                              background: actBenchViewMode === "inspector" ? "rgba(14, 165, 233, 0.25)" : "transparent",
                              color: actBenchViewMode === "inspector" ? "#fff" : "var(--text-dim)",
                              border: "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            Actuarial Inspector ({filteredTasks.length})
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ color: "var(--emerald)", fontWeight: 700 }}>SOTA Top</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <span style={{ color: "var(--emerald)", fontSize: "0.75rem", fontWeight: 700 }}>HUMAN</span> Human Baseline (83.0%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mode 1: Table 3 Heatmap */}
                    {actBenchViewMode === "matrix" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                          overflowX: "auto",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          background: "rgba(15, 23, 42, 0.6)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}>
                          <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}>
                            <thead>
                              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                <th style={{
                                  padding: "8px 12px",
                                  textAlign: "left",
                                  fontWeight: 700,
                                  color: "var(--text-muted)",
                                  minWidth: "160px",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Evaluated Model / Baseline
                                </th>
                                {displayedGroups.map((g) => {
                                  const groupTasks = filteredTasks.filter((t) => t.subsetShort === g.short);
                                  if (groupTasks.length === 0) return null;
                                  return (
                                    <th
                                      key={g.short}
                                      colSpan={groupTasks.length}
                                      style={{
                                        padding: "6px 8px",
                                        fontWeight: 700,
                                        color: g.color,
                                        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                        borderBottom: `2px solid ${g.color}`,
                                        letterSpacing: "0.03em",
                                        fontSize: "0.72rem",
                                      }}
                                    >
                                      {g.name}
                                    </th>
                                  );
                                })}
                                <th style={{
                                  padding: "8px 10px",
                                  fontWeight: 700,
                                  color: "var(--emerald)",
                                  minWidth: "85px",
                                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Final Total
                                </th>
                              </tr>

                              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                                <th style={{
                                  padding: "6px 12px",
                                  textAlign: "left",
                                  fontSize: "0.7rem",
                                  color: "var(--text-subtle)",
                                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Category
                                </th>
                                {filteredTasks.map((t) => {
                                  const isSelected = selectedActBenchKey === t.key;
                                  return (
                                    <th
                                      key={t.key}
                                      onClick={() => setSelectedActBenchKey(t.key)}
                                      title={`${t.name} (${t.associationMapping})\nClick to inspect full details below`}
                                      style={{
                                        padding: "7px 6px",
                                        minWidth: "62px",
                                        cursor: "pointer",
                                        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                                        background: isSelected ? "rgba(14, 165, 233, 0.15)" : "transparent",
                                        color: isSelected ? "var(--cyan)" : "var(--text)",
                                        fontWeight: isSelected ? 800 : 600,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                        <span style={{ letterSpacing: "0.05em" }}>{t.code}</span>
                                        {isSelected && (
                                          <span style={{ fontSize: "0.58rem", color: "var(--cyan)", lineHeight: 1 }}>▲ Active</span>
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                                <th style={{
                                  padding: "6px 10px",
                                  fontSize: "0.7rem",
                                  color: "var(--text-subtle)",
                                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                }}>
                                  Overall Mean
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {actbench.rows.map((r, rowIdx) => {
                                const isHuman = r.category === "Human Expert";
                                return (
                                  <tr
                                    key={r.model}
                                    style={{
                                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                                      background: isHuman
                                        ? "rgba(16, 185, 129, 0.06)"
                                        : rowIdx % 2 === 0
                                        ? "rgba(255, 255, 255, 0.01)"
                                        : "transparent",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    <td style={{
                                      padding: "7px 12px",
                                      textAlign: "left",
                                      fontWeight: 600,
                                      borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                                      whiteSpace: "nowrap",
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        {isHuman ? (
                                          <span style={{ color: "var(--emerald)", fontSize: "0.75rem", fontWeight: 700 }}>HUMAN</span>
                                        ) : (
                                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.color }} />
                                        )}
                                        <span style={{ color: isHuman ? "var(--emerald)" : "var(--text)" }}>
                                          {r.model}
                                        </span>
                                        <span style={{
                                          fontSize: "0.62rem",
                                          padding: "1px 5px",
                                          borderRadius: "3px",
                                          background: isHuman
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : r.category === "Open-Source"
                                            ? "rgba(139, 92, 246, 0.15)"
                                            : "rgba(245, 158, 11, 0.15)",
                                          color: isHuman
                                            ? "var(--emerald)"
                                            : r.category === "Open-Source"
                                            ? "#a78bfa"
                                            : "#fbbf24",
                                          fontWeight: 600,
                                        }}>
                                          {isHuman ? "Human" : r.category === "Open-Source" ? "OS" : "Prop"}
                                        </span>
                                      </div>
                                    </td>

                                    {filteredTasks.map((t) => {
                                      const score = r.scores[t.key];
                                      const isLeader = taskLeaders[t.key]?.model === r.model;
                                      const cellStyle = getCellColor(score, isLeader);
                                      const isSelectedCol = selectedActBenchKey === t.key;

                                      return (
                                        <td
                                          key={t.key}
                                          onClick={() => setSelectedActBenchKey(t.key)}
                                          title={`${r.model} on ${t.name}: ${score.toFixed(1)}%`}
                                          style={{
                                            padding: "6px 4px",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.72rem",
                                            fontWeight: cellStyle.weight,
                                            color: cellStyle.text,
                                            background: isSelectedCol
                                              ? "rgba(14, 165, 233, 0.12)"
                                              : cellStyle.bg,
                                            borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                                            borderLeft: isSelectedCol ? "1px solid rgba(14, 165, 233, 0.3)" : "none",
                                            cursor: "pointer",
                                            transition: "background 0.15s ease",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                                            {isLeader && <span style={{ fontSize: "0.65rem", color: "var(--emerald)", fontWeight: 700 }}>SOTA</span>}
                                            <span>{score.toFixed(1)}</span>
                                          </div>
                                        </td>
                                      );
                                    })}

                                    <td style={{
                                      padding: "7px 10px",
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 700,
                                      fontSize: "0.76rem",
                                      color: isHuman ? "var(--emerald)" : "var(--cyan)",
                                      borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                                      background: "rgba(255, 255, 255, 0.02)",
                                    }}>
                                      {r.finalTotal.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Interactive Hint */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.72rem",
                          color: "var(--text-subtle)",
                          padding: "0 4px",
                        }}>
                          <span><em>Click any task column or cell to inspect syllabus mapping, operational impact, and model ranking below.</em></span>
                          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>Active Inspector: {activeTask.code} ({activeTask.name})</span>
                        </div>

                        {/* Active Actuarial Inspector Card */}
                        <div style={{
                          padding: "16px 18px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.025)",
                          border: "1px solid rgba(14, 165, 233, 0.25)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                        }}>
                          {/* Task Quick Selector Chips */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginBottom: "14px",
                            paddingBottom: "10px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                          }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Task Selector:
                            </span>
                            {actbench.tasks.map((t) => {
                              const isSel = t.key === selectedActBenchKey;
                              return (
                                <button
                                  key={t.key}
                                  onClick={() => setSelectedActBenchKey(t.key)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.7rem",
                                    fontWeight: isSel ? 700 : 500,
                                    cursor: "pointer",
                                    background: isSel ? "var(--cyan)" : "rgba(255, 255, 255, 0.04)",
                                    color: isSel ? "#000" : "var(--text-muted)",
                                    border: isSel ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.07)",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {t.code}
                                </button>
                              );
                            })}
                          </div>

                          {/* Profile Header */}
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "14px",
                          }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(14, 165, 233, 0.15)",
                                  color: "var(--cyan)",
                                  border: "1px solid rgba(14, 165, 233, 0.3)",
                                  fontFamily: "var(--font-mono)",
                                }}>
                                  {activeTask.code}
                                </span>
                                <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                  {activeTask.name}
                                </span>
                                <span style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: "rgba(255, 255, 255, 0.06)",
                                  color: "var(--text-dim)",
                                  fontWeight: 600,
                                }}>
                                  {activeTask.subset}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--cyan)", marginTop: "4px" }}>
                                Syllabus Mapping: {activeTask.associationMapping}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>SOTA Leader:</span>
                                <strong style={{ color: "var(--emerald)" }}>{activeTask.leaderModel} ({activeTask.leaderScore.toFixed(1)}%)</strong>
                              </div>

                              <div style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: aiDeltaVsHuman >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                border: `1px solid ${aiDeltaVsHuman >= 0 ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                                fontSize: "0.72rem",
                              }}>
                                <span style={{ color: "var(--text-subtle)", marginRight: "4px" }}>Human:</span>
                                <strong style={{ color: "var(--text)" }}>{humanScoreForActive.toFixed(1)}%</strong>
                                <span style={{
                                  marginLeft: "6px",
                                  color: aiDeltaVsHuman >= 0 ? "var(--emerald)" : "#fbbf24",
                                  fontWeight: 700,
                                }}>
                                  ({aiDeltaVsHuman >= 0 ? `AI +${aiDeltaVsHuman.toFixed(1)}%` : `Human +${Math.abs(aiDeltaVsHuman).toFixed(1)}%`})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Description & Operational Role */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "10px",
                            marginBottom: "16px",
                            fontSize: "0.75rem",
                          }}>
                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "var(--cyan)", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Actuarial Exam Scope & Mathematical Content
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activeTask.description}
                              </div>
                            </div>

                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              lineHeight: 1.5,
                            }}>
                              <div style={{ color: "var(--emerald)", fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Insurer Operational Role & Capital Impact
                              </div>
                              <div style={{ color: "var(--text-dim)" }}>
                                {activeTask.operationalImpact}
                              </div>
                            </div>
                          </div>

                          {/* Full Model Ranking */}
                          <div>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "10px",
                              fontSize: "0.72rem",
                              color: "var(--text-subtle)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              fontWeight: 700,
                            }}>
                              <span>Full Evaluation Ranking for {activeTask.code}</span>
                              <span>Table 3 Verified Accuracy</span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
                              {activeTaskRankedRows.map((r, rankIdx) => {
                                const score = r.scores[activeTask.key];
                                const isHuman = r.category === "Human Expert";
                                const isTop = rankIdx === 0;

                                return (
                                  <div
                                    key={r.model}
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: "6px",
                                      background: isTop
                                        ? "rgba(16, 185, 129, 0.08)"
                                        : isHuman
                                        ? "rgba(255, 255, 255, 0.04)"
                                        : "rgba(255, 255, 255, 0.015)",
                                      border: isTop
                                        ? "1px solid rgba(16, 185, 129, 0.3)"
                                        : isHuman
                                        ? "1px solid rgba(255, 255, 255, 0.1)"
                                        : "1px solid rgba(255, 255, 255, 0.04)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{
                                          fontSize: "0.64rem",
                                          fontFamily: "var(--font-mono)",
                                          fontWeight: 700,
                                          color: isTop ? "var(--emerald)" : "var(--text-subtle)",
                                          width: "16px",
                                        }}>
                                          #{rankIdx + 1}
                                        </span>
                                        <span style={{
                                          fontWeight: isTop || isHuman ? 700 : 500,
                                          color: isHuman ? "var(--emerald)" : isTop ? "var(--text)" : "var(--text-dim)",
                                        }}>
                                          {r.model}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: 700,
                                        color: isTop ? "var(--emerald)" : "var(--text)",
                                      }}>
                                        {score.toFixed(1)}%
                                      </span>
                                    </div>

                                    <div style={{ height: "4px", background: "rgba(255, 255, 255, 0.06)", borderRadius: "2px", overflow: "hidden" }}>
                                      <div
                                        style={{
                                          height: "100%",
                                          borderRadius: "2px",
                                          width: animated ? `${Math.min(100, score)}%` : "0%",
                                          background: isHuman ? "var(--emerald)" : isTop ? "#10b981" : r.color,
                                          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Actuarial Deep Inspector Grid */}
                    {actBenchViewMode === "inspector" && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "14px",
                      }}>
                        {filteredTasks.map((t) => {
                          const taskRankedRows = [...actbench.rows].sort(
                            (a, b) => b.scores[t.key] - a.scores[t.key]
                          );
                          const humanR = actbench.rows.find((r) => r.category === "Human Expert");
                          const hScore = humanR ? humanR.scores[t.key] : t.humanScore;
                          const aiMax = Math.max(
                            ...actbench.rows.filter((r) => r.category !== "Human Expert").map((r) => r.scores[t.key])
                          );
                          const delta = aiMax - hScore;

                          return (
                            <div
                              key={t.key}
                              style={{
                                padding: "14px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                    <span style={{
                                      fontFamily: "var(--font-mono)",
                                      fontWeight: 800,
                                      fontSize: "0.78rem",
                                      color: "var(--cyan)",
                                      background: "rgba(14, 165, 233, 0.12)",
                                      padding: "1px 6px",
                                      borderRadius: "3px",
                                    }}>
                                      {t.code}
                                    </span>
                                    <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text)" }}>
                                      {t.name}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: t.color, fontWeight: 600 }}>
                                    {t.subset} · {t.associationMapping}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedActBenchKey(t.key);
                                    setActBenchViewMode("matrix");
                                  }}
                                  style={{
                                    fontSize: "0.66rem",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "var(--cyan)",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  View in Table ↗
                                </button>
                              </div>

                              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
                                {t.description}
                              </div>

                              <div style={{
                                fontSize: "0.7rem",
                                color: "var(--text-subtle)",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                background: "rgba(255, 255, 255, 0.02)",
                                borderLeft: `2px solid ${t.color}`,
                              }}>
                                <strong style={{ color: "var(--text-muted)" }}>Impact: </strong>
                                {t.operationalImpact}
                              </div>

                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "6px",
                                fontSize: "0.7rem",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.025)",
                              }}>
                                <div>
                                  <div style={{ color: "var(--text-subtle)", fontSize: "0.64rem" }}>SOTA Leader</div>
                                  <div style={{ fontWeight: 700, color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                                    {t.leaderModel}: {t.leaderScore.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: "var(--text-subtle)", fontSize: "0.64rem" }}>Human Baseline</div>
                                  <div style={{ fontWeight: 700, color: delta >= 0 ? "var(--text)" : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                                    {hScore.toFixed(1)}% ({delta >= 0 ? `+${delta.toFixed(1)}%` : `-${Math.abs(delta).toFixed(1)}%`})
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {taskRankedRows.slice(0, 4).map((r, i) => {
                                  const sc = r.scores[t.key];
                                  const isH = r.category === "Human Expert";
                                  return (
                                    <div key={r.model} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
                                        <span style={{ color: isH ? "var(--emerald)" : "var(--text-dim)", fontWeight: i === 0 ? 700 : 500 }}>
                                          {i === 0 ? "[SOTA] " : ""}{r.model}
                                        </span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>
                                          {sc.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                                        <div
                                          style={{
                                            height: "100%",
                                            borderRadius: "2px",
                                            width: animated ? `${Math.min(100, sc)}%` : "0%",
                                            background: isH ? "var(--emerald)" : r.color,
                                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

      </div>
    </div>
  );
}


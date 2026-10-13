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
                color: "var(--cyan)",
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

        {/* Sector / Dimension Average Accuracy (positioned below top charts) */}
        <div className="benchmark-chart-card" style={{ marginBottom: "24px" }}>
          <div className="benchmark-chart-title">{currentDataset.domainBreakdown.title}</div>
          <div className="benchmark-chart-subtitle">
            {currentDataset.domainBreakdown.subtitle}
          </div>
          <div className="benchmark-bar-list">
            {currentDataset.domainBreakdown.rows.map((row) => (
              <div key={row.domain} className="benchmark-bar-item">
                <div className="benchmark-bar-header">
                  <span className="benchmark-bar-label">{row.domain}</span>
                  <span className="benchmark-bar-value">
                    {row.score}{currentDataset.scoreUnit}
                  </span>
                </div>
                <div className="benchmark-bar-track">
                  <div
                    className="benchmark-bar-fill"
                    style={{
                      width: animated ? `${Math.min(100, row.score)}%` : "0%",
                      background: row.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


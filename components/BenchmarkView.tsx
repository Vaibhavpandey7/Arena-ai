"use client";
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { BENCHMARK_GOLD_REGISTRY, BenchmarkGoldItem } from "@/lib/benchmark-gold-data";
import {
  BENCHMARK_DATASETS,
  BenchmarkDatasetId,
} from "@/lib/benchmark-datasets";

/* ── All 13 Benchmark Questions from Gold Registry ─────────────────────────── */
const ALL_BENCHMARK_ITEMS: BenchmarkGoldItem[] = Object.values(BENCHMARK_GOLD_REGISTRY);

function RadarChart({
  dims,
  models,
}: {
  dims: string[];
  models: { label: string; color: string; values: number[] }[];
}) {
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const r = 125;
  const n = dims.length;

  function polarToCartesian(radiusFactor: number, index: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + r * radiusFactor * Math.cos(angle),
      y: cy + r * radiusFactor * Math.sin(angle),
    };
  }

  function pointsForModel(values: number[]) {
    return values
      .map((val, i) => {
        const clamped = Math.max(0, Math.min(1, val));
        const { x, y } = polarToCartesian(clamped, i);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const gridRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ width: "100%", maxWidth: "390px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible", display: "block" }}
      >
        {/* Concentric grid polygons */}
        {gridRings.map((ring) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const { x, y } = polarToCartesian(ring, i);
            return `${x},${y}`;
          }).join(" ");
          return (
            <polygon
              key={ring}
              points={pts}
              fill={ring === 1.0 ? "rgba(0, 212, 255, 0.02)" : "none"}
              stroke="rgba(255, 255, 255, 0.10)"
              strokeWidth={ring === 1.0 ? "1.5" : "1"}
              strokeDasharray={ring < 1.0 ? "3 3" : undefined}
            />
          );
        })}

        {/* Ring scale percentage marks along the vertical axis */}
        {gridRings.map((ring) => {
          const pt = polarToCartesian(ring, 0);
          return (
            <text
              key={`scale-${ring}`}
              x={pt.x + 4}
              y={pt.y - 2}
              fontSize="8.5"
              fontFamily="var(--font-mono)"
              fontWeight="600"
              fill="rgba(148, 163, 184, 0.6)"
            >
              {Math.round(ring * 100)}%
            </text>
          );
        })}

        {/* Axis radial lines */}
        {Array.from({ length: n }, (_, i) => {
          const outer = polarToCartesian(1, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* Model Polygons and vertex dots */}
        {models.map((m) => {
          return (
            <g key={m.label}>
              <polygon
                points={pointsForModel(m.values)}
                fill={`${m.color}26`}
                stroke={m.color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Vertex nodes */}
              {m.values.map((val, idx) => {
                const clamped = Math.max(0, Math.min(1, val));
                const pt = polarToCartesian(clamped, idx);
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill={m.color}
                    stroke="#0b1628"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          );
        })}

        {/* Dimension labels with quadrant-aware anchors */}
        {dims.map((dim, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const { x, y } = polarToCartesian(1.22, i);
          const cos = Math.cos(angle);
          const textAnchor = Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end";

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize="9.5"
              fontWeight="600"
              fill="rgba(226, 232, 240, 0.9)"
            >
              {dim.split("\n").map((line, j) => (
                <tspan key={j} x={x} dy={j === 0 ? 0 : 11}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

const FILTER_TABS = ["All", "Actuarial", "Solvency II", "Claims", "Underwriting", "Fraud", "Multimodal"];
const DATASET_TABS: BenchmarkDatasetId[] = ["INS-MMBench", "CUFE", "InsuranceQA", "INS-ActBench"];

type Tab = "home" | "head-to-head" | "chat-arena" | "benchmark";

interface Props {
  onNavigate?: (tab: Tab, prompt?: string) => void;
}

export default function BenchmarkView({ onNavigate }: Props) {
  const [activeDataset, setActiveDataset] = useState<BenchmarkDatasetId>("INS-MMBench");
  const [activeFilter, setActiveFilter] = useState("All");
  const [animated, setAnimated] = useState(false);
  const [selectedDomainIdx, setSelectedDomainIdx] = useState(0);
  const [expandedGroundTruth, setExpandedGroundTruth] = useState<Record<string, boolean>>({});

  const currentDataset = BENCHMARK_DATASETS[activeDataset] || BENCHMARK_DATASETS["INS-MMBench"];

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return ALL_BENCHMARK_ITEMS;
    const map: Record<string, string[]> = {
      Actuarial: ["actuarial"],
      "Solvency II": ["solvency"],
      Claims: ["claims"],
      Underwriting: ["underwriting"],
      Fraud: ["fraud"],
      Multimodal: ["multimodal"],
    };
    return ALL_BENCHMARK_ITEMS.filter((q) => (map[activeFilter] ?? []).includes(q.category));
  }, [activeFilter]);

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

            {/* Dual bar legend */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.74rem", color: "var(--text-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: 12, height: 5, background: "var(--cyan)", borderRadius: 2 }} />
                <span>{currentDataset.comparison.val1Label} (Primary)</span>
              </div>
              {currentDataset.comparison.val2Label && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 12, height: 5, background: "rgba(0, 212, 255, 0.45)", borderRadius: 2 }} />
                  <span>{currentDataset.comparison.val2Label} (Secondary)</span>
                </div>
              )}
            </div>

            <div className="benchmark-bar-list">
              {currentDataset.comparison.rows.map((row) => (
                <div key={row.model} className="benchmark-bar-item">
                  <div className="benchmark-bar-header">
                    <span className="benchmark-bar-label">{row.model}</span>
                    <span className="benchmark-bar-value">
                      {currentDataset.comparison.val1Label}: {row.val1Formatted}
                      {row.val2Formatted && ` · ${currentDataset.comparison.val2Label}: ${row.val2Formatted}`}
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

          {/* Domain Capability Radar (Enlarged) */}
          <div className="benchmark-chart-card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="benchmark-chart-title" style={{ width: "100%" }}>
              {currentDataset.radar.title}
            </div>
            <div className="benchmark-chart-subtitle" style={{ width: "100%", marginBottom: "12px" }}>
              {currentDataset.radar.subtitle}
            </div>
            
            <RadarChart dims={currentDataset.radar.dims} models={currentDataset.radar.models} />
            
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
              {currentDataset.radar.models.map((m) => {
                const avgScore = (m.values.reduce((a, b) => a + b, 0) / m.values.length) * 100;
                return (
                  <div
                    key={m.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      padding: "3px 8px",
                      background: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: m.color,
                        boxShadow: `0 0 6px ${m.color}`,
                      }}
                    />
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{m.label}</span>
                    <span style={{ color: "var(--emerald)", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                      ({avgScore.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Domain Performance breakdown */}
          <div className="benchmark-chart-card">
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

          {/* Domain-Wise Multi-Model Accuracy */}
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
                paddingBottom: "8px",
                marginBottom: "14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
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
                <div>
                  {/* Domain header banner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
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

        {/* Benchmark Question Repository */}
        <div className="benchmark-questions-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div className="benchmark-questions-title" style={{ margin: 0 }}>
              Benchmark Insurance Question & Scenario Repository ({ALL_BENCHMARK_ITEMS.length} Questions)
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--cyan)", fontWeight: 600 }}>
              ✓ All questions verified with Expert Ground Truth & Solvency II / EIOPA evidence
            </span>
          </div>

          {/* Filter tabs */}
          <div className="benchmark-q-filter-tabs">
            {FILTER_TABS.map((t) => (
              <button
                key={t}
                className={`benchmark-q-tab${activeFilter === t ? " active" : ""}`}
                onClick={() => setActiveFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Question cards */}
          <div className="benchmark-q-list">
            {filtered.map((q) => {
              const isGtOpen = Boolean(expandedGroundTruth[q.id]);

              return (
                <div key={q.id} className="benchmark-q-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div className="benchmark-q-body" style={{ flex: 1 }}>
                      <div className="benchmark-q-meta">
                        <span className={`benchmark-q-badge ${q.category}`}>{q.category}</span>
                        <span className={`benchmark-q-badge difficulty-${q.difficulty}`}>{q.difficulty}</span>
                        <span style={{ fontSize: 10, color: "var(--text-subtle)", padding: "2px 0" }}>{q.id}</span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "var(--emerald)",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                          }}
                        >
                          ✓ Expert GT Linked
                        </span>
                      </div>
                      <div className="benchmark-q-text">{q.text}</div>
                      <div className="benchmark-q-modality">{q.modality}</div>
                    </div>

                    <div className="benchmark-q-actions" style={{ flexShrink: 0 }}>
                      <button
                        className="benchmark-q-btn primary"
                        onClick={() => setExpandedGroundTruth((prev) => ({ ...prev, [q.id]: !isGtOpen }))}
                      >
                        {isGtOpen ? "▲ Hide Ground Truth" : "📖 Ground Truth & Citations"}
                      </button>
                      <button
                        className="benchmark-q-btn secondary"
                        onClick={() => onNavigate?.("head-to-head", q.text)}
                      >
                        Compare in H2H
                      </button>
                      <button
                        className="benchmark-q-btn secondary"
                        onClick={() => onNavigate?.("chat-arena", q.text)}
                      >
                        Open in Arena
                      </button>
                    </div>
                  </div>

                  {/* Expandable Ground Truth & Citations Panel */}
                  {isGtOpen && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "14px 16px",
                        borderRadius: "8px",
                        background: "rgba(6, 11, 20, 0.85)",
                        border: "1px solid rgba(0, 212, 255, 0.2)",
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cyan)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🎯 Gold Standard Benchmark Response & Mathematical Basis</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          lineHeight: 1.6,
                          color: "var(--text)",
                          padding: "10px 12px",
                          background: "rgba(0, 0, 0, 0.3)",
                          borderRadius: "6px",
                          borderLeft: "3px solid var(--cyan)",
                          marginBottom: "12px",
                        }}
                      >
                        <ReactMarkdown>{q.goldResponse}</ReactMarkdown>
                      </div>

                      {q.evidence && (
                        <div
                          style={{
                            padding: "10px 12px",
                            background: "rgba(16, 185, 129, 0.05)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            borderRadius: "6px",
                            fontSize: "0.74rem",
                          }}
                        >
                          <div style={{ color: "var(--emerald)", fontWeight: 700, marginBottom: "4px" }}>
                            📜 Verified Regulatory Citation & Standards:
                          </div>
                          <div style={{ color: "var(--text-dim)", lineHeight: 1.5 }}>
                            {q.evidence}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

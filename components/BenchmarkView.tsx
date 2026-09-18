"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import ModelSelectWidget from "./ModelSelectWidget";
import GroundTruthPanel from "./GroundTruthPanel";
import { BENCHMARK_GOLD_REGISTRY, BenchmarkGoldItem } from "@/lib/benchmark-gold-data";
import { evaluateUseCaseMetrics } from "@/lib/use-case-metrics";
import { getModel } from "@/lib/model-registry";

/* ── Leaderboard data ───────────────────────────────────────────────────── */
const LEADERBOARD = [
  {
    model: "Claude Sonnet 4.5",
    score: 87.4,
    delta: "+3.2%",
    deltaDir: "up",
    label: "Top in EIOPA Solvency II & Policy Analysis",
    badge: "premium",
  },
  {
    model: "DeepSeek R1",
    score: 83.7,
    delta: "+5.1%",
    deltaDir: "up",
    label: "Leader in Actuarial Reasoning & Math",
    badge: "reasoning",
  },
  {
    model: "GPT-4o",
    score: 81.2,
    delta: "-0.8%",
    deltaDir: "down",
    label: "Strong in Multimodal & Claims Extraction",
    badge: "fast",
  },
  {
    model: "Mistral Large",
    score: 78.9,
    delta: "+1.4%",
    deltaDir: "up",
    label: "Consistent in Trilingual Policy Wording",
    badge: "fast",
  },
];

/* ── ROUGE-L & BLEU data ──────────────────────────────────────────────────── */
const ROUGE_BLEU_DATA = [
  { model: "Claude Sonnet 4.5", rouge: 0.812, bleu: 0.674, color: "#f59e0b" },
  { model: "DeepSeek R1", rouge: 0.791, bleu: 0.658, color: "#0ea5e9" },
  { model: "GPT-4o", rouge: 0.768, bleu: 0.631, color: "#10b981" },
  { model: "Mistral Large", rouge: 0.743, bleu: 0.612, color: "#8b5cf6" },
  { model: "Gemini 2.0 Flash", rouge: 0.729, bleu: 0.598, color: "#06b6d4" },
];

/* ── Domain radar dimensions ──────────────────────────────────────────────── */
const RADAR_DIMS = [
  "Policy\nTranslation",
  "Actuarial\nReasoning",
  "Regulatory\nCompliance",
  "Claims\nProcessing",
  "Underwriting\nRisk",
  "Fraud\nDetection",
];

const RADAR_MODELS = [
  {
    label: "Claude Sonnet 4.5",
    color: "#f59e0b",
    values: [0.92, 0.88, 0.95, 0.85, 0.78, 0.84],
  },
  {
    label: "DeepSeek R1",
    color: "#0ea5e9",
    values: [0.85, 0.96, 0.84, 0.80, 0.75, 0.82],
  },
];

/* ── Domain performance ────────────────────────────────────────────────────── */
const DOMAIN_PERF = [
  { domain: "Policy Translation", score: 91.2, color: "#f59e0b" },
  { domain: "Actuarial Reasoning", score: 88.4, color: "#0ea5e9" },
  { domain: "Regulatory Compliance", score: 86.7, color: "#10b981" },
  { domain: "Claims Processing", score: 83.9, color: "#8b5cf6" },
  { domain: "Underwriting Risk", score: 80.3, color: "#f59e0b" },
  { domain: "Fraud Detection", score: 82.5, color: "#0ea5e9" },
];

/* ── Latency tradeoff ──────────────────────────────────────────────────────── */
const LATENCY_DATA = [
  { model: "GPT-4o Mini", latency: 1.8, accuracy: 74, color: "#10b981" },
  { model: "DeepSeek V3", latency: 2.4, accuracy: 79, color: "#0ea5e9" },
  { model: "GPT-4o", latency: 3.6, accuracy: 81, color: "#f59e0b" },
  { model: "Mistral Large", latency: 4.2, accuracy: 79, color: "#8b5cf6" },
  { model: "DeepSeek R1", latency: 6.8, accuracy: 84, color: "#0ea5e9" },
  { model: "Claude Sonnet 4.5", latency: 5.1, accuracy: 87, color: "#f59e0b" },
];

/* ── All 13 Benchmark Questions from Gold Registry ─────────────────────────── */
const ALL_BENCHMARK_ITEMS: BenchmarkGoldItem[] = Object.values(BENCHMARK_GOLD_REGISTRY);

function RadarChart() {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const n = RADAR_DIMS.length;

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
        const { x, y } = polarToCartesian(val, i);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const gridRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridRings.map((ring) => {
        const pts = Array.from({ length: n }, (_, i) => {
          const { x, y } = polarToCartesian(ring, i);
          return `${x},${y}`;
        }).join(" ");
        return (
          <polygon
            key={ring}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {Array.from({ length: n }, (_, i) => {
        const outer = polarToCartesian(1, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {RADAR_MODELS.map((m) => (
        <polygon
          key={m.label}
          points={pointsForModel(m.values)}
          fill={`${m.color}22`}
          stroke={m.color}
          strokeWidth="1.5"
        />
      ))}

      {RADAR_DIMS.map((dim, i) => {
        const { x, y } = polarToCartesian(1.28, i);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7.5"
            fill="rgba(148,163,184,0.9)"
          >
            {dim.split("\n").map((line, j) => (
              <tspan key={j} x={x} dy={j === 0 ? 0 : 9}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

const FILTER_TABS = ["All", "Actuarial", "Solvency II", "Claims", "Underwriting", "Fraud", "Multimodal"];
const DATASET_TABS = ["INS-MMBench", "CuFE", "InsuranceQA", "EIOPA Fine-Tuner", "30-Domain Suite"];

type Tab = "home" | "head-to-head" | "chat-arena" | "benchmark";

interface Props {
  onNavigate?: (tab: Tab, prompt?: string) => void;
}

interface QuestionResult {
  modelId: string;
  answer: string;
  latencyMs: number;
  tokens: number;
  isRunning: boolean;
  gtScore?: number;
  useCaseEval?: any;
}

export default function BenchmarkView({ onNavigate }: Props) {
  const [activeDataset, setActiveDataset] = useState("INS-MMBench");
  const [activeFilter, setActiveFilter] = useState("All");
  const [animated, setAnimated] = useState(false);

  // Model selection for benchmark runs (defaulted to 100% free models to preserve user credits)
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "deepseek/deepseek-v4-flash-0731:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ]);

  // Results cache: questionId -> array of QuestionResult
  const [resultsByQuestion, setResultsByQuestion] = useState<Record<string, QuestionResult[]>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);

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

  const handleAddModel = () => {
    if (selectedModels.length >= 4) return;
    const pool = [
      "nvidia/nemotron-3.5-lightning:free",
      "qwen/qwen3.8-27b:free",
      "openrouter/free",
      "openai/gpt-4o-mini",
    ];
    const next = pool.find((p) => !selectedModels.includes(p)) || pool[0];
    setSelectedModels((prev) => [...prev, next]);
  };

  const handleRemoveModel = (idx: number) => {
    if (selectedModels.length <= 1) return;
    setSelectedModels((prev) => prev.filter((_, i) => i !== idx));
  };

  // Run a single question against all selected models
  const runQuestion = async (q: BenchmarkGoldItem) => {
    setExpandedResults((prev) => ({ ...prev, [q.id]: true }));

    // Initialize result slots
    setResultsByQuestion((prev) => ({
      ...prev,
      [q.id]: selectedModels.map((mId) => ({
        modelId: mId,
        answer: "",
        latencyMs: 0,
        tokens: 0,
        isRunning: true,
      })),
    }));

    // Run parallel queries
    await Promise.all(
      selectedModels.map(async (modelId, idx) => {
        const startTime = Date.now();
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelId,
              prompt: q.text,
              useTools: false,
            }),
          });

          if (!res.ok || !res.body) throw new Error("Request failed");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === "[DONE]") break;
                try {
                  const parsed = JSON.parse(dataStr);
                  const chunk = (parsed.delta && (parsed.type === "content" || parsed.type === "text"))
                    ? parsed.delta
                    : (parsed.t === "text" || parsed.t === "content") ? parsed.c : null;
                  if (chunk) fullText += chunk;
                } catch {}
              }
            }
          }

          const latencyMs = Date.now() - startTime;
          const tokens = fullText.split(/\s+/).length;
          const evalResult = evaluateUseCaseMetrics(q.useCaseId, fullText, q.goldResponse, q.evidence);

          setResultsByQuestion((prev) => {
            const list = [...(prev[q.id] || [])];
            list[idx] = {
              modelId,
              answer: fullText,
              latencyMs,
              tokens,
              isRunning: false,
              gtScore: evalResult.overallScore,
              useCaseEval: evalResult,
            };
            return { ...prev, [q.id]: list };
          });
        } catch (err) {
          setResultsByQuestion((prev) => {
            const list = [...(prev[q.id] || [])];
            list[idx] = {
              modelId,
              answer: "Error running evaluation. Please verify model availability.",
              latencyMs: Date.now() - startTime,
              tokens: 0,
              isRunning: false,
              gtScore: 0,
            };
            return { ...prev, [q.id]: list };
          });
        }
      })
    );
  };

  // Run all visible questions sequentially
  const handleRunAll = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    for (const q of filtered) {
      await runQuestion(q);
    }
    setIsBatchRunning(false);
  };

  return (
    <div className="studio-content" style={{ overflowY: "auto" }}>
      <div className="benchmark-view">
        {/* Top Control Bar: Dataset Tabs + Selected Models Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {/* Dataset filter tabs */}
          <div className="benchmark-filter-tabs" style={{ margin: 0 }}>
            {DATASET_TABS.map((t) => (
              <button
                key={t}
                className={`benchmark-filter-tab${activeDataset === t ? " active" : ""}`}
                onClick={() => setActiveDataset(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Batch Run Button */}
          <button
            onClick={handleRunAll}
            disabled={isBatchRunning}
            style={{
              padding: "7px 18px",
              borderRadius: "8px",
              background: isBatchRunning ? "rgba(245, 158, 11, 0.2)" : "var(--cyan)",
              border: isBatchRunning ? "1px solid var(--amber)" : "none",
              color: isBatchRunning ? "var(--amber)" : "#050b14",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: isBatchRunning ? "not-allowed" : "pointer",
              boxShadow: isBatchRunning ? "none" : "0 0 12px rgba(0, 212, 255, 0.25)",
            }}
          >
            {isBatchRunning ? "⏳ Batch Running Questions..." : `▶ Run All (${filtered.length}) on Selected Models`}
          </button>
        </div>

        {/* Selected Models Bar */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            background: "rgba(11, 22, 40, 0.8)",
            border: "1px solid var(--border)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Active Evaluation Models ({selectedModels.length} of 4)
            </span>
            {selectedModels.length < 4 && (
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${selectedModels.length}, minmax(220px, 1fr))`,
              gap: "10px",
            }}
          >
            {selectedModels.map((mId, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1 }}>
                  <ModelSelectWidget
                    label={`Model ${idx + 1}`}
                    value={mId}
                    compact
                    onChange={(newId) => {
                      setSelectedModels((prev) => {
                        const next = [...prev];
                        next[idx] = newId;
                        return next;
                      });
                    }}
                  />
                </div>
                {selectedModels.length > 1 && (
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

        {/* Score cards */}
        <div className="benchmark-score-cards">
          {LEADERBOARD.map((item, i) => (
            <div
              key={item.model}
              className={`benchmark-score-card${i === 0 ? " rank-1" : ""}`}
            >
              <div className="benchmark-card-model">
                {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}
                {item.model}
              </div>
              <div className="benchmark-card-score">
                {Math.floor(item.score)}
                <span className="score-decimal">
                  .{String(item.score.toFixed(1)).split(".")[1]}
                </span>
              </div>
              <div className={`benchmark-card-delta ${item.deltaDir}`}>
                {item.deltaDir === "up" ? "▲" : "▼"} {item.delta}
              </div>
              <div className="benchmark-card-label">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="benchmark-charts-grid">
          {/* ROUGE-L / BLEU chart */}
          <div className="benchmark-chart-card">
            <div className="benchmark-chart-title">ROUGE-L / BLEU Score by Model</div>
            <div className="benchmark-chart-subtitle">
              Across InsuranceQA · INS-MMBench · {activeDataset}
            </div>
            <div className="benchmark-bar-list">
              {ROUGE_BLEU_DATA.map((row) => (
                <div key={row.model} className="benchmark-bar-item">
                  <div className="benchmark-bar-header">
                    <span className="benchmark-bar-label">{row.model}</span>
                    <span className="benchmark-bar-value">
                      R {row.rouge.toFixed(3)} · B {row.bleu.toFixed(3)}
                    </span>
                  </div>
                  <div className="benchmark-bar-track">
                    <div
                      className="benchmark-bar-fill"
                      style={{
                        width: animated ? `${row.rouge * 100}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                  <div className="benchmark-bar-track" style={{ marginTop: 3 }}>
                    <div
                      className="benchmark-bar-fill"
                      style={{
                        width: animated ? `${row.bleu * 100}%` : "0%",
                        background: `${row.color}88`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Domain Capability Radar */}
          <div className="benchmark-chart-card" style={{ alignItems: "center" }}>
            <div className="benchmark-chart-title" style={{ width: "100%" }}>
              Domain Capability Profile
            </div>
            <div className="benchmark-chart-subtitle" style={{ width: "100%" }}>
              6 Core Insurance Competencies
            </div>
            <RadarChart />
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {RADAR_MODELS.map((m) => (
                <div
                  key={m.label}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: m.color,
                    }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Domain Performance breakdown */}
          <div className="benchmark-chart-card">
            <div className="benchmark-chart-title">Domain Benchmark Pass Rates</div>
            <div className="benchmark-chart-subtitle">
              Verified against European Regulatory Corpus
            </div>
            <div className="benchmark-bar-list">
              {DOMAIN_PERF.map((row) => (
                <div key={row.domain} className="benchmark-bar-item">
                  <div className="benchmark-bar-header">
                    <span className="benchmark-bar-label">{row.domain}</span>
                    <span className="benchmark-bar-value">{row.score}%</span>
                  </div>
                  <div className="benchmark-bar-track">
                    <div
                      className="benchmark-bar-fill"
                      style={{
                        width: animated ? `${row.score}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latency vs Accuracy */}
          <div className="benchmark-chart-card">
            <div className="benchmark-chart-title">Latency vs. Accuracy Tradeoff</div>
            <div className="benchmark-chart-subtitle">
              Note: faster models trade some accuracy for reduced response time
            </div>
            <div className="benchmark-latency-bars">
              {LATENCY_DATA.map((row) => (
                <div key={row.model} className="benchmark-latency-item">
                  <span className="benchmark-latency-model">{row.model}</span>
                  <div className="benchmark-latency-bar-track">
                    <div
                      className="benchmark-latency-bar-fill"
                      style={{
                        width: animated ? `${(row.latency / 8) * 100}%` : "0%",
                        background: row.color,
                      }}
                    >
                      {row.latency}s · {row.accuracy}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

          {/* Question cards with live execution and inline results */}
          <div className="benchmark-q-list">
            {filtered.map((q) => {
              const results = resultsByQuestion[q.id];
              const isExpanded = Boolean(expandedResults[q.id]);
              const isRunningThis = results?.some((r) => r.isRunning);

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
                        disabled={isRunningThis}
                        onClick={() => runQuestion(q)}
                        style={{ background: isRunningThis ? "rgba(0, 212, 255, 0.2)" : undefined }}
                      >
                        {isRunningThis ? "⏳ Running..." : `▶ Run (${selectedModels.length} Models)`}
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

                  {/* Collapsible Inline Results Panel */}
                  {results && results.length > 0 && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        background: "rgba(0, 0, 0, 0.45)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        onClick={() => setExpandedResults((prev) => ({ ...prev, [q.id]: !isExpanded }))}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          marginBottom: isExpanded ? "12px" : 0,
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                          📊 Benchmark Evaluation Results ({results.length} Models)
                          {isRunningThis && <span className="spinner-border" />}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {isExpanded ? "▲ Hide Results" : "▼ Show Results"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          {results.map((res, rIdx) => {
                            const modelInfo = getModel(res.modelId);
                            const name = modelInfo?.label ?? res.modelId.split("/").pop() ?? res.modelId;
                            return (
                              <div
                                key={rIdx}
                                style={{
                                  padding: "12px",
                                  borderRadius: "8px",
                                  background: "rgba(11, 22, 40, 0.7)",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                }}
                              >
                                {/* Result Model Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
                                      {name}
                                    </span>
                                    {res.latencyMs > 0 && (
                                      <span style={{ fontSize: "0.68rem", color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                                        {(res.latencyMs / 1000).toFixed(2)}s
                                      </span>
                                    )}
                                    {res.tokens > 0 && (
                                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                        {res.tokens} words
                                      </span>
                                    )}
                                  </div>

                                  {res.gtScore !== undefined && (
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        fontWeight: 800,
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        background: res.gtScore >= 75 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                        color: res.gtScore >= 75 ? "var(--emerald)" : "var(--amber)",
                                        border: `1px solid ${res.gtScore >= 75 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                                        fontFamily: "var(--font-mono)",
                                      }}
                                    >
                                      GT Score: {res.gtScore}%
                                    </span>
                                  )}
                                </div>

                                {/* Answer Content */}
                                {res.isRunning ? (
                                  <div style={{ color: "var(--cyan)", fontSize: "0.75rem", padding: "8px 0" }}>
                                    Generating model response and computing metrics...
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        maxHeight: "160px",
                                        overflowY: "auto",
                                        fontSize: "0.78rem",
                                        lineHeight: 1.5,
                                        color: "var(--text-dim)",
                                        padding: "8px",
                                        background: "rgba(0,0,0,0.25)",
                                        borderRadius: "6px",
                                        marginBottom: "8px",
                                      }}
                                    >
                                      <ReactMarkdown>{res.answer}</ReactMarkdown>
                                    </div>

                                    {/* Ground Truth Alignment Panel for this result */}
                                    <GroundTruthPanel
                                      modelAnswer={res.answer}
                                      goldResponse={q.goldResponse}
                                      evidence={q.evidence}
                                      useCaseId={q.useCaseId}
                                      modelName={name}
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}
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

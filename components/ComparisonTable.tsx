"use client";
import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { DILRecord } from "./DatasetBrowser";
import {
  calculateTokensPerSec,
  calculateWordCount,
  evaluateGoldAlignment,
  GoldEvaluationResult,
} from "@/lib/benchmark-eval";

export interface CompareRow {
  model: string;
  ok: boolean;
  loading?: boolean;
  answer?: string;
  error?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  toolCallCount: number;
  toolEvents?: Array<{ type: "call" | "result"; name: string; data: string; timestamp: number }>;
}

interface Props {
  results: CompareRow[];
  modelSystemPrompts: Record<string, string>;
  onSystemPromptChange: (model: string, value: string) => void;
  activeRecord?: DILRecord | null;
  prompt?: string;
  onRetryModel?: (model: string) => void;
}

type ViewMode = "split" | "tabs" | "table";

function ComparisonTable({
  results,
  modelSystemPrompts,
  onSystemPromptChange,
  activeRecord,
  prompt,
  onRetryModel,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [activeTabModel, setActiveTabModel] = useState<string>(results[0]?.model ?? "");
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [expandedSystemPrompt, setExpandedSystemPrompt] = useState<Set<string>>(new Set());
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const [modalModel, setModalModel] = useState<string | null>(null);
  const [votedWinner, setVotedWinner] = useState<string | null>(null);
  const [pinGoldSideBySide, setPinGoldSideBySide] = useState<boolean>(Boolean(activeRecord));
  const [showGoldBanner, setShowGoldBanner] = useState<boolean>(true);

  // Filter success rows
  const successRows = useMemo(() => results.filter((r) => r.ok), [results]);

  // Compute evaluations per model
  const modelEvals = useMemo(() => {
    const map = new Map<string, { speed: number; words: number; goldEval?: GoldEvaluationResult }>();
    for (const r of results) {
      const speed = calculateTokensPerSec(r.latencyMs, r.completionTokens);
      const words = calculateWordCount(r.answer);
      const goldEval = activeRecord ? evaluateGoldAlignment(r.answer, activeRecord.response, activeRecord.evidence) : undefined;
      map.set(r.model, { speed, words, goldEval });
    }
    return map;
  }, [results, activeRecord]);

  // Leaders
  const fastestRow = useMemo(() => {
    if (!successRows.length) return null;
    return [...successRows].sort((a, b) => a.latencyMs - b.latencyMs)[0];
  }, [successRows]);

  const topSpeedRow = useMemo(() => {
    if (!successRows.length) return null;
    return [...successRows].sort((a, b) => {
      const speedA = modelEvals.get(a.model)?.speed ?? 0;
      const speedB = modelEvals.get(b.model)?.speed ?? 0;
      return speedB - speedA;
    })[0];
  }, [successRows, modelEvals]);

  const cheapestRow = useMemo(() => {
    if (!successRows.length) return null;
    return [...successRows].sort((a, b) => a.estCostUsd - b.estCostUsd)[0];
  }, [successRows]);

  const topAlignmentRow = useMemo(() => {
    if (!successRows.length || !activeRecord) return null;
    return [...successRows].sort((a, b) => {
      const scoreA = modelEvals.get(a.model)?.goldEval?.score ?? 0;
      const scoreB = modelEvals.get(b.model)?.goldEval?.score ?? 0;
      return scoreB - scoreA;
    })[0];
  }, [successRows, activeRecord, modelEvals]);

  function toggleExpand(model: string) {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });
  }

  function toggleToolTrace(model: string) {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });
  }

  function toggleSystemPrompt(model: string) {
    setExpandedSystemPrompt((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });
  }

  function copyText(model: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedModel(model);
    setTimeout(() => setCopiedModel(null), 1800);
  }

  function exportCSV() {
    let headers: string[];
    let rows: string[];

    if (activeRecord) {
      headers = [
        "record_id",
        "domain",
        "split",
        "gold_quality_score",
        "evidence",
        "question",
        "gold_response",
        "model",
        "ok",
        "gold_alignment_score",
        "evidence_verified",
        "latency_ms",
        "tokens_per_sec",
        "prompt_tokens",
        "completion_tokens",
        "est_cost_usd",
        "tool_calls",
        "model_answer",
        "error",
      ];
      rows = results.map((r) => {
        const ev = modelEvals.get(r.model);
        const vals = [
          activeRecord.id,
          activeRecord.domain,
          activeRecord.split,
          (activeRecord.quality_score * 100).toFixed(0) + "%",
          activeRecord.evidence ?? "",
          activeRecord.question,
          activeRecord.response,
          r.model,
          r.ok ? "true" : "false",
          ev?.goldEval ? `${ev.goldEval.score}%` : "N/A",
          ev?.goldEval ? (ev.goldEval.evidenceMatched ? "true" : "false") : "N/A",
          r.latencyMs,
          ev?.speed ?? 0,
          r.promptTokens,
          r.completionTokens,
          r.estCostUsd,
          r.toolCallCount,
          r.answer ?? "",
          r.error ?? "",
        ];
        return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else {
      headers = [
        "model",
        "ok",
        "latency_ms",
        "tokens_per_sec",
        "prompt_tokens",
        "completion_tokens",
        "est_cost_usd",
        "tool_calls",
        "answer",
        "error",
      ];
      rows = results.map((r) => {
        const ev = modelEvals.get(r.model);
        const vals = [
          r.model,
          r.ok ? "true" : "false",
          r.latencyMs,
          ev?.speed ?? 0,
          r.promptTokens,
          r.completionTokens,
          r.estCostUsd,
          r.toolCallCount,
          r.answer ?? "",
          r.error ?? "",
        ];
        return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    }
    const csv = [headers.join(","), ...rows].join("\n");
    const filename = activeRecord
      ? `benchmark-${activeRecord.id}-comparison.csv`
      : "ai-arena-comparison.csv";
    download(csv, filename, "text/csv");
  }

  function exportJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      prompt: prompt || activeRecord?.question || undefined,
      activeRecord: activeRecord
        ? {
            id: activeRecord.id,
            domain: activeRecord.domain,
            split: activeRecord.split,
            difficulty: activeRecord.difficulty,
            quality_score: activeRecord.quality_score,
            question: activeRecord.question,
            context: activeRecord.context,
            response: activeRecord.response,
            evidence: activeRecord.evidence,
          }
        : null,
      results: results.map((r) => ({
        ...r,
        speedTokensPerSec: modelEvals.get(r.model)?.speed ?? 0,
        wordCount: modelEvals.get(r.model)?.words ?? 0,
        goldEvaluation: modelEvals.get(r.model)?.goldEval ?? null,
      })),
      votedWinner,
    };
    const filename = activeRecord
      ? `benchmark-${activeRecord.id}-comparison.json`
      : "ai-arena-comparison.json";
    download(JSON.stringify(payload, null, 2), filename, "application/json");
  }

  function download(content: string, filename: string, mime: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const gridColumnCount = useMemo(() => {
    let count = results.length;
    if (pinGoldSideBySide && activeRecord) count += 1;
    return Math.min(count, 4);
  }, [results.length, pinGoldSideBySide, activeRecord]);

  const activeTabRow = useMemo(
    () => results.find((r) => r.model === activeTabModel) ?? results[0],
    [results, activeTabModel]
  );

  const activeTabEval = activeTabRow ? modelEvals.get(activeTabRow.model) : undefined;

  return (
    <div className="compare-container" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Ground Truth Reference Banner ────────────────────────────────── */}
      {activeRecord && (
        <div className="compare-ground-truth-card" style={{ padding: "16px 20px" }}>
          <div className="gt-header" style={{ marginBottom: showGoldBanner ? 14 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                className="brand-tag"
                style={{
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  borderColor: "var(--accent-border)",
                  fontWeight: 700,
                }}
              >
                Data Lake Ground Truth
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--text-main)",
                }}
              >
                {activeRecord.id}
              </span>
              <span className="brand-tag">{activeRecord.domain.replace(/_/g, " ")}</span>
              <span className="quality-badge">{(activeRecord.quality_score * 100).toFixed(0)}% Verified Quality</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn-secondary${pinGoldSideBySide ? " active" : ""}`}
                onClick={() => setPinGoldSideBySide((prev) => !prev)}
                style={{
                  fontSize: 11.5,
                  padding: "4px 12px",
                  borderColor: pinGoldSideBySide ? "var(--cyan-border)" : undefined,
                  color: pinGoldSideBySide ? "var(--cyan-light)" : undefined,
                  background: pinGoldSideBySide ? "var(--cyan-dim)" : undefined,
                }}
                title="Pin verified gold response as a column in the arena"
              >
                {pinGoldSideBySide ? "✓ Gold Column Pinned" : "+ Pin Gold Column in Arena"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowGoldBanner((prev) => !prev)}
                style={{ fontSize: 11.5, padding: "4px 10px" }}
              >
                {showGoldBanner ? "Hide Details" : "Show Gold Standard"}
              </button>
            </div>
          </div>

          {showGoldBanner && (
            <div className="gt-body" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div className="gt-question-box" style={{ background: "var(--bg-canvas-subtle)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span className="gt-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  Benchmark Ingestion Question
                </span>
                <div style={{ fontSize: "13.5px", color: "var(--text-main)", fontWeight: 500, lineHeight: 1.5 }}>
                  {activeRecord.question}
                </div>
              </div>

              <div className="gt-response-box" style={{ background: "var(--bg-canvas-subtle)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="gt-label" style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Verified Gold Standard Response
                  </span>
                  <span className="quality-badge" style={{ fontSize: 10 }}>Gold Expert Verified</span>
                </div>
                <div style={{ fontSize: "13.5px", color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {activeRecord.response}
                </div>
                {activeRecord.evidence && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", fontSize: "12px", color: "var(--cyan-light)", display: "flex", gap: 6 }}>
                    <b>Regulatory Evidence:</b>
                    <span style={{ fontStyle: "italic" }}>"{activeRecord.evidence}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Top Podium Leaderboard Cards ─────────────────────────────────── */}
      {successRows.length > 1 && (
        <div className="compare-leaderboard">
          {topAlignmentRow && activeRecord && (
            <div className="leader-card">
              <div className="leader-icon" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em" }}>
                ACC
              </div>
              <div className="leader-meta">
                <span className="leader-label">Top Alignment</span>
                <span className="leader-value">{topAlignmentRow.model.split("/").pop()}</span>
                <span className="leader-sub">
                  {modelEvals.get(topAlignmentRow.model)?.goldEval?.score}% agreement with Gold Standard
                </span>
              </div>
            </div>
          )}

          {topSpeedRow && (
            <div className="leader-card">
              <div className="leader-icon fastest" style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.05em" }}>
                SPD
              </div>
              <div className="leader-meta">
                <span className="leader-label">Generation Velocity</span>
                <span className="leader-value">{topSpeedRow.model.split("/").pop()}</span>
                <span className="leader-sub">
                  {modelEvals.get(topSpeedRow.model)?.speed} tok/s ({fastestRow?.latencyMs.toLocaleString()}ms total)
                </span>
              </div>
            </div>
          )}

          {cheapestRow && (
            <div className="leader-card">
              <div className="leader-icon cheapest" style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.05em" }}>
                VAL
              </div>
              <div className="leader-meta">
                <span className="leader-label">Value Leader</span>
                <span className="leader-value">{cheapestRow.model.split("/").pop()}</span>
                <span className="leader-sub">
                  {cheapestRow.estCostUsd === 0
                    ? "Free / Local Zero-Cost"
                    : `$${cheapestRow.estCostUsd < 0.0001 ? cheapestRow.estCostUsd.toExponential(2) : cheapestRow.estCostUsd.toFixed(4)} estimated run cost`}
                </span>
              </div>
            </div>
          )}

          <div className="leader-card">
            <div className="leader-icon" style={{ background: "var(--violet-dim)", color: "var(--violet)", fontWeight: 800, fontSize: 11, letterSpacing: "0.05em" }}>
              ALL
            </div>
            <div className="leader-meta">
              <span className="leader-label">Arena Benchmark</span>
              <span className="leader-value">{results.length} Models Tested</span>
              <span className="leader-sub">{successRows.length} successful evaluations</span>
            </div>
          </div>
        </div>
      )}

      {/* ── View Switcher & Toolbar Header ───────────────────────────────── */}
      <div className="arena-view-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-main)" }}>
              Model Comparison Arena
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-subtle)", marginTop: 2 }}>
              Comparing {results.length} model outputs side by side
            </div>
          </div>

          <div className="arena-view-tabs">
            <button
              type="button"
              className={`arena-view-tab${viewMode === "split" ? " active" : ""}`}
              onClick={() => setViewMode("split")}
              title="Side-by-side reading cards"
            >
              <span>🔲 Side-by-Side</span>
            </button>
            <button
              type="button"
              className={`arena-view-tab${viewMode === "tabs" ? " active" : ""}`}
              onClick={() => setViewMode("tabs")}
              title="Full-width document reader"
            >
              <span>📑 Full-Width Tabs</span>
            </button>
            <button
              type="button"
              className={`arena-view-tab${viewMode === "table" ? " active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Metrics matrix table"
            >
              <span>📊 Metrics Table</span>
            </button>
          </div>
        </div>

        <div className="export-actions">
          <button className="btn-secondary" onClick={exportCSV} title="Export full benchmark evaluation to CSV">
            Export CSV
          </button>
          <button className="btn-secondary" onClick={exportJSON} title="Export full benchmark evaluation to JSON">
            Export JSON
          </button>
        </div>
      </div>

      {/* ── VIEW 1: Side-by-Side Arena Columns (Default / Primary) ───────── */}
      {viewMode === "split" && (
        <div
          className="arena-split-grid"
          style={{ "--arena-cols": gridColumnCount } as React.CSSProperties}
        >
          {/* Optional Pinned Gold Standard Column */}
          {pinGoldSideBySide && activeRecord && (
            <div
              className="arena-model-card"
              style={{
                borderColor: "var(--cyan-border)",
                background: "var(--bg-surface)",
              }}
            >
              <div
                className="arena-card-header"
                style={{
                  background: "rgba(6, 182, 212, 0.08)",
                  borderBottom: "1px solid var(--cyan-border)",
                }}
              >
                <div className="arena-model-title-row">
                  <div>
                    <div className="arena-model-title" style={{ color: "var(--cyan-light)" }}>
                      Gold Standard
                    </div>
                    <div className="arena-model-id-tag">{activeRecord.id} · Verified Benchmark</div>
                  </div>
                  <span className="brand-tag" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>
                    Expert Reference
                  </span>
                </div>
                <div className="arena-accolade-badges">
                  <span className="arena-pill-badge alignment">
                    {(activeRecord.quality_score * 100).toFixed(0)}% Quality
                  </span>
                  <span className="arena-pill-badge alignment">
                    {activeRecord.split.toUpperCase()} SPLIT
                  </span>
                </div>
              </div>

              <div className="arena-telemetry-strip">
                <div className="arena-telemetry-item">
                  <span>Domain:</span>
                  <span className="arena-telemetry-val">{activeRecord.domain.replace(/_/g, " ")}</span>
                </div>
                <div className="arena-telemetry-item">
                  <span>Difficulty:</span>
                  <span className="arena-telemetry-val">{activeRecord.difficulty}</span>
                </div>
              </div>

              <div className="arena-answer-canvas expanded" style={{ background: "rgba(6, 182, 212, 0.02)" }}>
                <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)", fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                  {activeRecord.question}
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
                  {activeRecord.response}
                </div>
                {activeRecord.evidence && (
                  <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: "6px", background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)", fontSize: "12px", color: "var(--cyan-light)" }}>
                    <b>Statutory Evidence:</b> {activeRecord.evidence}
                  </div>
                )}
              </div>

              <div className="arena-card-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copyText("gold-standard", activeRecord.response)}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  {copiedModel === "gold-standard" ? "✓ Copied" : "Copy Gold Answer"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPinGoldSideBySide(false)}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  ✕ Unpin
                </button>
              </div>
            </div>
          )}

          {/* Model Output Columns */}
          {results.map((row) => {
            const ev = modelEvals.get(row.model);
            const isExpanded = expandedModels.has(row.model);
            const isFastest = row.ok && fastestRow?.model === row.model && successRows.length > 1;
            const isTopSpeed = row.ok && topSpeedRow?.model === row.model && successRows.length > 1;
            const isCheapest = row.ok && cheapestRow?.model === row.model && successRows.length > 1;
            const isTopAlignment = row.ok && topAlignmentRow?.model === row.model && successRows.length > 1;
            const isVoted = votedWinner === row.model;
            const modelShortName = row.model.split("/").pop() ?? row.model;

            return (
              <div key={row.model} className="arena-model-card">
                {/* Model Header */}
                <div className="arena-card-header">
                  <div className="arena-model-title-row">
                    <div>
                      <div className="arena-model-title">{modelShortName}</div>
                      <div className="arena-model-id-tag">{row.model}</div>
                    </div>

                    <button
                      type="button"
                      className={`arena-vote-btn${isVoted ? " voted" : ""}`}
                      onClick={() => setVotedWinner(isVoted ? null : row.model)}
                      title="Vote this model response as preferred"
                    >
                      <span>{isVoted ? "★ Voted Best" : "☆ Vote Best"}</span>
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="arena-accolade-badges">
                    {!row.ok && (
                      <span className="arena-pill-badge" style={{ background: "var(--rose-dim)", color: "var(--rose)", borderColor: "rgba(244,63,94,0.3)" }}>
                        ⚠ Inference Failed
                      </span>
                    )}
                    {isTopAlignment && <span className="arena-pill-badge alignment">🎯 Top Gold Alignment</span>}
                    {isTopSpeed && <span className="arena-pill-badge fastest">⚡ {ev?.speed} tok/s</span>}
                    {isFastest && !isTopSpeed && <span className="arena-pill-badge fastest">⚡ Lowest Latency</span>}
                    {isCheapest && (
                      <span className="arena-pill-badge cheapest">
                        💎 {row.estCostUsd === 0 ? "Zero-Cost" : "Lowest Cost"}
                      </span>
                    )}
                    {isVoted && <span className="arena-pill-badge winner">★ Your Preference</span>}
                  </div>
                </div>

                {/* Telemetry Bar */}
                <div className="arena-telemetry-strip">
                  <div className="arena-telemetry-item">
                    <span>Time:</span>
                    <span className="arena-telemetry-val">{row.latencyMs.toLocaleString()}ms</span>
                  </div>
                  {ev?.speed ? (
                    <div className="arena-telemetry-item">
                      <span>Speed:</span>
                      <span className="arena-telemetry-val" style={{ color: "var(--accent-light)" }}>
                        {ev.speed} tok/s
                      </span>
                    </div>
                  ) : null}
                  <div className="arena-telemetry-item">
                    <span>Tokens:</span>
                    <span className="arena-telemetry-val">
                      {row.completionTokens.toLocaleString()} out
                    </span>
                  </div>
                  <div className="arena-telemetry-item">
                    <span>Cost:</span>
                    <span className="arena-telemetry-val" style={{ color: "var(--emerald)" }}>
                      {row.estCostUsd > 0
                        ? `$${row.estCostUsd < 0.0001 ? row.estCostUsd.toExponential(2) : row.estCostUsd.toFixed(4)}`
                        : "Free / $0"}
                    </span>
                  </div>
                </div>

                {/* Gold Evaluation Strip if activeRecord */}
                {activeRecord && ev?.goldEval && (
                  <div className="arena-gold-eval-strip">
                    <div className="arena-gold-score">
                      <span>Gold Alignment:</span>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{ev.goldEval.score}%</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>({ev.goldEval.label})</span>
                    </div>

                    {activeRecord.evidence && (
                      <div
                        className={`arena-evidence-status ${ev.goldEval.evidenceMatched ? "verified" : "missing"}`}
                      >
                        {ev.goldEval.evidenceMatched ? "✓ Evidence Cited" : "⚠ Evidence Not Cited"}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Markdown Answer Reading Canvas */}
                <div className={`arena-answer-canvas ${isExpanded ? "expanded" : "limited"}`}>
                  {row.loading && (
                    <div className="arena-loading-card">
                      <div className="arena-loading-spinner" />
                      <div className="arena-loading-text">Generating response…</div>
                      <div className="arena-loading-sub">Connecting to model endpoint</div>
                    </div>
                  )}

                  {!row.loading && !row.ok && (
                    <div className="arena-error-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontWeight: 700 }}>⚠ Inference Error</div>
                        {onRetryModel && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => onRetryModel(row.model)}
                            style={{ fontSize: 11, padding: "2px 8px", borderColor: "var(--rose)", color: "var(--rose)" }}
                          >
                            🔄 Retry Model
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{row.error ?? "An inference error occurred"}</div>
                      {(row.error?.includes("429") || row.error?.toLowerCase().includes("rate limit") || row.error?.toLowerCase().includes("free-models-per-day")) && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(244,63,94,0.15)", borderRadius: "6px", fontSize: "11.5px", color: "var(--text-main)" }}>
                          💡 <b>OpenRouter Rate Limit:</b> Free-tier models have a strict daily quota (<code>free-models-per-day</code>). Switch to production models (e.g. <b>GPT-4o Mini</b> or <b>Llama 3.3 70B</b>) or local Ollama models to bypass this limit.
                        </div>
                      )}
                    </div>
                  )}

                  {!row.loading && row.ok && row.answer && row.answer.trim() && (
                    <ReactMarkdown>{row.answer}</ReactMarkdown>
                  )}

                  {!row.loading && row.ok && (!row.answer || !row.answer.trim()) && (
                    <div className="arena-empty-answer-box">
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>ℹ Empty Response Received</div>
                      <div style={{ fontSize: 12, marginBottom: 10 }}>
                        The model concluded inference without producing text content. Output may have been consumed by internal reasoning or filtered.
                      </div>
                      {onRetryModel && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onRetryModel(row.model)}
                          style={{ fontSize: 11, padding: "4px 12px" }}
                        >
                          🔄 Retry Model
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tool Trace Collapsible Panel */}
                {expandedTools.has(row.model) && row.toolEvents && row.toolEvents.length > 0 && (
                  <div style={{ padding: "12px 18px", background: "var(--bg-canvas-subtle)", borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--cyan-light)", marginBottom: 8 }}>
                      ⚡ Executed Tool Sequence ({row.toolEvents.length} events)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "220px", overflowY: "auto" }}>
                      {row.toolEvents.map((evItem, ei) => (
                        <div key={ei} style={{ fontSize: "11px", fontFamily: "var(--font-mono)", background: "var(--bg-surface)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: evItem.type === "call" ? "var(--cyan-light)" : "var(--emerald)", fontWeight: 700 }}>
                              [{evItem.type.toUpperCase()}] {evItem.name}()
                            </span>
                            <span style={{ color: "var(--text-subtle)", fontSize: "10px" }}>
                              {new Date(evItem.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {evItem.data}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Prompt Override Accordion */}
                {expandedSystemPrompt.has(row.model) && (
                  <div style={{ padding: "12px 18px", background: "var(--bg-canvas-subtle)", borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>
                      System Prompt Instructions for Next Run:
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Specify customized system persona or guidance for this model…"
                      value={modelSystemPrompts[row.model] ?? ""}
                      onChange={(e) => onSystemPromptChange(row.model, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "6px",
                        color: "var(--text-main)",
                        fontSize: "12px",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="arena-card-footer">
                  <div className="arena-card-footer-left">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => toggleExpand(row.model)}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                    >
                      {isExpanded ? "Collapse" : "Expand Height"}
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setModalModel(row.model)}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      title="Open distraction-free full width reader modal"
                    >
                      Full Reader ↗
                    </button>

                    {row.ok && row.answer && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => copyText(row.model, row.answer!)}
                        style={{ fontSize: 11, padding: "4px 10px" }}
                      >
                        {copiedModel === row.model ? "✓ Copied" : "Copy"}
                      </button>
                    )}

                    {row.toolEvents && row.toolEvents.length > 0 && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => toggleToolTrace(row.model)}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderColor: "var(--cyan-border)",
                          color: "var(--cyan-light)",
                        }}
                      >
                        {expandedTools.has(row.model)
                          ? "Hide Tools"
                          : `Tools (${row.toolCallCount})`}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => toggleSystemPrompt(row.model)}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                    title="Edit system prompt override for this model"
                  >
                    ⚙ System Prompt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VIEW 2: Full-Width Tabbed Reader ─────────────────────────────── */}
      {viewMode === "tabs" && activeTabRow && (
        <div className="tabbed-reader-card">
          {/* Tab Navigation */}
          <div className="tabbed-reader-tabs">
            {results.map((r) => {
              const isActive = r.model === activeTabModel;
              const short = r.model.split("/").pop() ?? r.model;
              return (
                <button
                  key={r.model}
                  type="button"
                  className={`tabbed-reader-tab${isActive ? " active" : ""}`}
                  onClick={() => setActiveTabModel(r.model)}
                >
                  <span>{short}</span>
                  {!r.ok && <span style={{ color: "var(--rose)", fontSize: 10 }}>⚠</span>}
                  {votedWinner === r.model && <span>★</span>}
                </button>
              );
            })}
          </div>

          {/* Model Header Info */}
          <div className="arena-card-header" style={{ padding: "20px 28px" }}>
            <div className="arena-model-title-row">
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
                  {activeTabRow.model.split("/").pop()}
                </div>
                <div className="arena-model-id-tag" style={{ fontSize: "12px", marginTop: 2 }}>
                  {activeTabRow.model}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className={`arena-vote-btn${votedWinner === activeTabRow.model ? " voted" : ""}`}
                  onClick={() =>
                    setVotedWinner(votedWinner === activeTabRow.model ? null : activeTabRow.model)
                  }
                >
                  {votedWinner === activeTabRow.model ? "★ Voted Best Response" : "☆ Vote as Best"}
                </button>

                {activeTabRow.ok && activeTabRow.answer && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => copyText(activeTabRow.model, activeTabRow.answer!)}
                  >
                    {copiedModel === activeTabRow.model ? "✓ Copied" : "Copy Output"}
                  </button>
                )}
              </div>
            </div>

            {/* Telemetry bar */}
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              <div className="metric-pill">
                <span>Latency:</span>
                <span className="metric-val">{activeTabRow.latencyMs.toLocaleString()}ms</span>
              </div>
              {activeTabEval?.speed ? (
                <div className="metric-pill">
                  <span>Speed:</span>
                  <span className="metric-val" style={{ color: "var(--accent-light)" }}>
                    {activeTabEval.speed} tok/s
                  </span>
                </div>
              ) : null}
              <div className="metric-pill">
                <span>Prompt:</span>
                <span className="metric-val">{activeTabRow.promptTokens.toLocaleString()} tok</span>
              </div>
              <div className="metric-pill">
                <span>Completion:</span>
                <span className="metric-val">{activeTabRow.completionTokens.toLocaleString()} tok</span>
              </div>
              <div className="metric-pill">
                <span>Est. Cost:</span>
                <span className="metric-val" style={{ color: "var(--emerald)" }}>
                  {activeTabRow.estCostUsd > 0
                    ? `$${activeTabRow.estCostUsd < 0.0001 ? activeTabRow.estCostUsd.toExponential(2) : activeTabRow.estCostUsd.toFixed(4)}`
                    : "Free / $0"}
                </span>
              </div>
              {activeTabEval?.goldEval && (
                <div className="metric-pill" style={{ borderColor: "var(--cyan-border)" }}>
                  <span style={{ color: "var(--cyan-light)" }}>Gold Alignment:</span>
                  <span className="metric-val" style={{ color: "var(--cyan-light)" }}>
                    {activeTabEval.goldEval.score}% ({activeTabEval.goldEval.label})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expansive Reading Canvas */}
          <div className="arena-answer-canvas expanded" style={{ padding: "32px 36px", fontSize: "15px", lineHeight: 1.8 }}>
            {activeTabRow.loading && (
              <div className="arena-loading-card">
                <div className="arena-loading-spinner" />
                <div className="arena-loading-text">Generating response…</div>
                <div className="arena-loading-sub">Connecting to model endpoint</div>
              </div>
            )}

            {!activeTabRow.loading && !activeTabRow.ok && (
              <div className="arena-error-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>⚠ Inference Error</div>
                  {onRetryModel && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onRetryModel(activeTabRow.model)}
                      style={{ fontSize: 11, padding: "3px 10px", borderColor: "var(--rose)", color: "var(--rose)" }}
                    >
                      🔄 Retry Model
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{activeTabRow.error ?? "An error occurred during inference"}</div>
                {(activeTabRow.error?.includes("429") || activeTabRow.error?.toLowerCase().includes("rate limit") || activeTabRow.error?.toLowerCase().includes("free-models-per-day")) && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(244,63,94,0.15)", borderRadius: "6px", fontSize: "12px", color: "var(--text-main)" }}>
                    💡 <b>OpenRouter Rate Limit:</b> Free-tier models have a strict daily quota (<code>free-models-per-day</code>). Switch to production models (e.g. <b>GPT-4o Mini</b> or <b>Llama 3.3 70B</b>) or local Ollama models to bypass this limit.
                  </div>
                )}
              </div>
            )}

            {!activeTabRow.loading && activeTabRow.ok && activeTabRow.answer && activeTabRow.answer.trim() && (
              <ReactMarkdown>{activeTabRow.answer}</ReactMarkdown>
            )}

            {!activeTabRow.loading && activeTabRow.ok && (!activeTabRow.answer || !activeTabRow.answer.trim()) && (
              <div className="arena-empty-answer-box">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>ℹ Empty Response Received</div>
                <div style={{ fontSize: 13, marginBottom: 12 }}>
                  The model concluded inference without producing text content. Output may have been consumed by internal reasoning or filtered.
                </div>
                {onRetryModel && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onRetryModel(activeTabRow.model)}
                    style={{ fontSize: 11, padding: "4px 12px" }}
                  >
                    🔄 Re-run Model
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 3: Enhanced Metrics Matrix Table ─────────────────────────── */}
      {viewMode === "table" && (
        <div className="matrix-table-card">
          <div className="matrix-table-scroll" style={{ overflowX: "auto" }}>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Model</th>
                  {activeRecord && <th>Gold Alignment</th>}
                  <th>Latency</th>
                  <th>Throughput</th>
                  <th>Tokens (In / Out)</th>
                  <th>Est. Cost</th>
                  <th>Tools</th>
                  <th style={{ minWidth: 280 }}>Output Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => {
                  const ev = modelEvals.get(row.model);
                  const isFastest = row.ok && fastestRow?.model === row.model && successRows.length > 1;
                  const isCheapest = row.ok && cheapestRow?.model === row.model && successRows.length > 1;
                  const isTopAlignment = row.ok && topAlignmentRow?.model === row.model && successRows.length > 1;
                  const modelShort = row.model.split("/").pop() ?? row.model;

                  return (
                    <tr key={row.model}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                            {modelShort}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)" }}>
                            {row.model}
                          </span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                            {!row.ok && <span style={{ color: "var(--rose)", fontSize: "11px", fontWeight: 600 }}>Failed</span>}
                            {isTopAlignment && <span className="tag-fastest" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>Top Alignment</span>}
                            {isFastest && <span className="tag-fastest">Fastest</span>}
                            {isCheapest && <span className="tag-cheapest">Cheapest</span>}
                          </div>
                        </div>
                      </td>

                      {activeRecord && (
                        <td>
                          {ev?.goldEval ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--cyan-light)" }}>
                                {ev.goldEval.score}%
                              </span>
                              <span style={{ fontSize: "10.5px", color: "var(--text-subtle)" }}>
                                {ev.goldEval.label}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}

                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {row.latencyMs.toLocaleString()}ms
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-light)" }}>
                          {ev?.speed ? `${ev.speed} tok/s` : "—"}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "12px" }}>
                          {row.promptTokens.toLocaleString()} / {row.completionTokens.toLocaleString()}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", color: isCheapest ? "var(--emerald)" : "var(--text-muted)" }}>
                          {row.estCostUsd > 0
                            ? `$${row.estCostUsd < 0.0001 ? row.estCostUsd.toExponential(2) : row.estCostUsd.toFixed(4)}`
                            : "Free"}
                        </span>
                      </td>

                      <td>
                        <span className="brand-tag">{row.toolCallCount} calls</span>
                      </td>

                      <td>
                        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", maxHeight: "64px", overflow: "hidden", lineHeight: 1.5 }}>
                          {row.error ? (
                            <span style={{ color: "var(--rose)" }}>⚠ {row.error}</span>
                          ) : (
                            row.answer?.slice(0, 180) + "…"
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setModalModel(row.model)}
                            style={{ fontSize: 11, padding: "3px 8px" }}
                          >
                            Read Full
                          </button>
                          {row.ok && row.answer && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => copyText(row.model, row.answer!)}
                              style={{ fontSize: 11, padding: "3px 8px" }}
                            >
                              {copiedModel === row.model ? "✓" : "Copy"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Distraction-Free Fullscreen Reading Modal ────────────────────── */}
      {modalModel && (
        <div className="arena-modal-backdrop" onClick={() => setModalModel(null)}>
          <div className="arena-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="arena-modal-header">
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                  {modalModel.split("/").pop()}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                  {modalModel}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {results.find((r) => r.model === modalModel)?.answer && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      copyText(modalModel, results.find((r) => r.model === modalModel)?.answer!)
                    }
                  >
                    {copiedModel === modalModel ? "✓ Copied" : "Copy"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalModel(null)}
                  style={{ fontWeight: 700 }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="arena-modal-body">
              {results.find((r) => r.model === modalModel)?.error && (
                <div style={{ color: "var(--rose)", background: "var(--rose-dim)", padding: "16px 20px", borderRadius: "8px", marginBottom: "16px" }}>
                  ⚠ {results.find((r) => r.model === modalModel)?.error}
                </div>
              )}

              <ReactMarkdown>
                {results.find((r) => r.model === modalModel)?.answer ?? ""}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ComparisonTable);

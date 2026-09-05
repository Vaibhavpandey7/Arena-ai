"use client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { DILRecord } from "./DatasetBrowser";

export interface CompareRow {
  model: string;
  ok: boolean;
  answer?: string;
  error?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  toolCallCount: number;
}

interface Props {
  results: CompareRow[];
  modelSystemPrompts: Record<string, string>;
  onSystemPromptChange: (model: string, value: string) => void;
  activeRecord?: DILRecord | null;
}

function ComparisonTable({ results, modelSystemPrompts, onSystemPromptChange, activeRecord }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  function toggleExpand(model: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });
  }

  function copyAnswer(model: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(model);
    setTimeout(() => setCopiedIndex(null), 1800);
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
        "latency_ms",
        "prompt_tokens",
        "completion_tokens",
        "est_cost_usd",
        "tool_calls",
        "model_answer",
        "error"
      ];
      rows = results.map((r) => {
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
          r.latencyMs,
          r.promptTokens,
          r.completionTokens,
          r.estCostUsd,
          r.toolCallCount,
          r.answer ?? "",
          r.error ?? ""
        ];
        return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });
    } else {
      headers = ["model", "ok", "latencyMs", "promptTokens", "completionTokens", "estCostUsd", "toolCallCount", "answer", "error"];
      rows = results.map((r) =>
        headers.map((h) => {
          const val = (r as unknown as Record<string, unknown>)[h] ?? "";
          const s = String(val).replace(/"/g, '""');
          return `"${s}"`;
        }).join(",")
      );
    }
    const csv = [headers.join(","), ...rows].join("\n");
    const filename = activeRecord ? `benchmark-${activeRecord.id}-comparison.csv` : "ai-arena-comparison.csv";
    download(csv, filename, "text/csv");
  }

  function exportJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeRecord: activeRecord ? {
        id: activeRecord.id,
        domain: activeRecord.domain,
        split: activeRecord.split,
        difficulty: activeRecord.difficulty,
        quality_score: activeRecord.quality_score,
        question: activeRecord.question,
        context: activeRecord.context,
        response: activeRecord.response,
        evidence: activeRecord.evidence,
      } : null,
      results,
    };
    const filename = activeRecord ? `benchmark-${activeRecord.id}-comparison.json` : "ai-arena-comparison.json";
    download(JSON.stringify(payload, null, 2), filename, "application/json");
  }

  function download(content: string, filename: string, mime: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const successRows = results.filter((r) => r.ok);
  const fastestMs = successRows.length ? Math.min(...successRows.map((r) => r.latencyMs)) : Infinity;
  const fastestRow = successRows.find((r) => r.latencyMs === fastestMs);

  const cheapestCost = successRows.length ? Math.min(...successRows.map((r) => r.estCostUsd)) : Infinity;
  const cheapestRow = successRows.find((r) => r.estCostUsd === cheapestCost);

  return (
    <div className="compare-container">
      {/* Ground Truth Reference Banner if evaluating against Data Lake */}
      {activeRecord && (
        <div className="compare-ground-truth-card">
          <div className="gt-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="brand-tag" style={{ background: "var(--accent-dim)", color: "var(--accent)", borderColor: "var(--accent-border)", fontWeight: 700 }}>
                Data Lake Ground Truth
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "var(--text-main)" }}>
                {activeRecord.id}
              </span>
              <span className="brand-tag">{activeRecord.domain.replace(/_/g, " ")}</span>
              <span className="quality-badge">{(activeRecord.quality_score * 100).toFixed(0)}% Quality</span>
            </div>
            <div className="export-actions">
              <button className="btn-secondary" onClick={exportCSV} style={{ fontSize: 11, padding: "5px 12px" }}>
                Export Benchmark CSV
              </button>
              <button className="btn-secondary" onClick={exportJSON} style={{ fontSize: 11, padding: "5px 12px" }}>
                Export Benchmark JSON
              </button>
            </div>
          </div>

          <div className="gt-body">
            <div className="gt-question-box">
              <span className="gt-label">Benchmark Question</span>
              <div style={{ fontSize: "13px", color: "var(--text-main)", fontWeight: 500 }}>{activeRecord.question}</div>
            </div>

            <div className="gt-response-box">
              <span className="gt-label">Verified Gold Standard Response</span>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{activeRecord.response}</div>
              {activeRecord.evidence && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)", fontSize: "12px", color: "var(--cyan-light)" }}>
                  <b>Regulatory Evidence:</b> {activeRecord.evidence}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Leaderboard Benchmark Cards */}
      {successRows.length > 1 && (
        <div className="compare-leaderboard">
          {fastestRow && (
            <div className="leader-card">
              <div className="leader-icon fastest" style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.05em' }}>SPD</div>
              <div className="leader-meta">
                <span className="leader-label">Speed Champion</span>
                <span className="leader-value">{fastestRow.model.split("/").pop()}</span>
                <span className="leader-sub">{fastestRow.latencyMs.toLocaleString()}ms total latency</span>
              </div>
            </div>
          )}

          {cheapestRow && (
            <div className="leader-card">
              <div className="leader-icon cheapest" style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.05em' }}>VAL</div>
              <div className="leader-meta">
                <span className="leader-label">Value Leader</span>
                <span className="leader-value">{cheapestRow.model.split("/").pop()}</span>
                <span className="leader-sub">
                  ${cheapestRow.estCostUsd < 0.0001 ? cheapestRow.estCostUsd.toExponential(2) : cheapestRow.estCostUsd.toFixed(4)} estimated run cost
                </span>
              </div>
            </div>
          )}

          <div className="leader-card">
            <div className="leader-icon" style={{ background: "var(--violet-dim)", color: "var(--violet)", fontWeight: 800, fontSize: 11, letterSpacing: '0.05em' }}>
              ALL
            </div>
            <div className="leader-meta">
              <span className="leader-label">Benchmark Depth</span>
              <span className="leader-value">{results.length} Models Tested</span>
              <span className="leader-sub">{successRows.length} successful evaluations</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Comparison Matrix Table */}
      <div className="matrix-table-card">
        <div className="matrix-table-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-main)" }}>
              Head-to-Head Comparison Matrix
            </span>
            <span className="brand-tag">{results.length} models</span>
          </div>

          <div className="export-actions">
            <button className="btn-secondary" onClick={exportCSV}>
              Export CSV
            </button>
            <button className="btn-secondary" onClick={exportJSON}>
              Export JSON
            </button>
          </div>
        </div>

        <div className="matrix-table-scroll" style={{ overflowX: "auto" }}>
          <table className="matrix-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Model</th>
                <th>Latency</th>
                <th>Prompt Tokens</th>
                <th>Completion Tokens</th>
                <th>Est. Cost</th>
                <th>Tools</th>
                <th style={{ minWidth: 320 }}>Output & Gold Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const isFastest = row.ok && row.latencyMs === fastestMs && successRows.length > 1;
                const isCheapest = row.ok && row.estCostUsd === cheapestCost && successRows.length > 1;
                const isExpanded = expanded.has(row.model);
                const modelName = row.model.split("/").pop() ?? row.model;

                return (
                  <tr key={row.model}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {modelName}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)" }}>
                          {row.model}
                        </span>

                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                          {!row.ok && <span style={{ color: "var(--rose)", fontSize: "11px", fontWeight: 600 }}>Failed</span>}
                          {isFastest && <span className="tag-fastest">Fastest</span>}
                          {isCheapest && <span className="tag-cheapest">Cheapest</span>}
                        </div>

                        {/* System prompt override */}
                        <div style={{ marginTop: 8 }}>
                          <textarea
                            rows={1}
                            placeholder="System prompt override…"
                            value={modelSystemPrompts[row.model] ?? ""}
                            onChange={(e) => onSystemPromptChange(row.model, e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              background: "var(--bg-canvas-subtle)",
                              border: "1px solid var(--border-default)",
                              borderRadius: "4px",
                              color: "var(--text-main)",
                              fontSize: "11px",
                              outline: "none",
                              resize: "vertical",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: isFastest ? "var(--accent)" : "var(--text-main)" }}>
                        {row.latencyMs.toLocaleString()}ms
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {row.promptTokens.toLocaleString()}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {row.completionTokens.toLocaleString()}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", color: isCheapest ? "var(--emerald)" : "var(--text-muted)" }}>
                        {row.estCostUsd > 0
                          ? `$${row.estCostUsd < 0.0001 ? row.estCostUsd.toExponential(2) : row.estCostUsd.toFixed(4)}`
                          : "—"}
                      </span>
                    </td>

                    <td>
                      <span className="brand-tag">
                        {row.toolCallCount}
                      </span>
                    </td>

                    <td>
                      {!row.ok && (
                        <div style={{ color: "var(--rose)", fontSize: "12px", background: "var(--rose-dim)", padding: "8px 12px", borderRadius: "6px" }}>
                          ⚠ {row.error ?? "Inference error occurred"}
                        </div>
                      )}

                      {row.ok && row.answer && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              lineHeight: "1.6",
                              maxHeight: isExpanded ? "none" : "90px",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <ReactMarkdown>{row.answer}</ReactMarkdown>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                            <button
                              className="btn-secondary"
                              onClick={() => toggleExpand(row.model)}
                              style={{ padding: "3px 10px", fontSize: "11px" }}
                            >
                              {isExpanded ? "Collapse Output" : "Expand Full Output"}
                            </button>

                            <button
                              className="btn-secondary"
                              onClick={() => copyAnswer(row.model, row.answer!)}
                              style={{ padding: "3px 10px", fontSize: "11px" }}
                            >
                              {copiedIndex === row.model ? "✓ Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ComparisonTable);

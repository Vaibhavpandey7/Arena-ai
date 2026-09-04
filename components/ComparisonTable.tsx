"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

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
}

export default function ComparisonTable({ results, modelSystemPrompts, onSystemPromptChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(model: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(model) ? next.delete(model) : next.add(model);
      return next;
    });
  }

  function exportCSV() {
    const headers = ["model", "ok", "latencyMs", "promptTokens", "completionTokens", "estCostUsd", "toolCallCount", "answer", "error"];
    const rows = results.map((r) =>
      headers.map((h) => {
        const val = (r as unknown as Record<string, unknown>)[h] ?? "";
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    download(csv, "ai-arena-comparison.csv", "text/csv");
  }

  function exportJSON() {
    download(JSON.stringify(results, null, 2), "ai-arena-comparison.json", "application/json");
  }

  function download(content: string, filename: string, mime: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Tag fastest and cheapest
  const successRows = results.filter((r) => r.ok);
  const fastestMs = successRows.length ? Math.min(...successRows.map((r) => r.latencyMs)) : Infinity;
  const cheapestCost = successRows.length ? Math.min(...successRows.map((r) => r.estCostUsd)) : Infinity;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Latency</th>
              <th>Prompt tok.</th>
              <th>Compl. tok.</th>
              <th>Est. cost</th>
              <th>Tool calls</th>
              <th style={{ minWidth: 240 }}>Answer</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const isFastest = row.ok && row.latencyMs === fastestMs;
              const isCheapest = row.ok && row.estCostUsd === cheapestCost && successRows.length > 1;
              const isExpanded = expanded.has(row.model);
              const modelName = row.model.split("/").pop() ?? row.model;

              return (
                <tr key={row.model}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span className="model-pill">{modelName}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {!row.ok && <span className="badge badge-bad">error</span>}
                        {isFastest && <span className="tag-fastest">⚡ fastest</span>}
                        {isCheapest && <span className="tag-cheapest">▼ cheapest</span>}
                      </div>
                      {/* Per-model system prompt override */}
                      <div className="sysprompt-override">
                        <textarea
                          rows={2}
                          placeholder="System prompt override…"
                          value={modelSystemPrompts[row.model] ?? ""}
                          onChange={(e) => onSystemPromptChange(row.model, e.target.value)}
                          title="Override system prompt for this model in the next run"
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="metric-mono">{row.latencyMs.toLocaleString()}ms</span>
                  </td>
                  <td>
                    <span className="metric-mono">{row.promptTokens.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="metric-mono">{row.completionTokens.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="metric-mono">
                      {row.estCostUsd > 0
                        ? `$${row.estCostUsd < 0.0001 ? row.estCostUsd.toExponential(2) : row.estCostUsd.toFixed(4)}`
                        : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="metric-mono">{row.toolCallCount}</span>
                  </td>
                  <td className="answer-cell">
                    {!row.ok && (
                      <span className="bad" style={{ fontSize: 12 }}>{row.error ?? "Unknown error"}</span>
                    )}
                    {row.ok && row.answer && (
                      <div>
                        <div className={isExpanded ? "answer-expanded" : "answer-truncated"}>
                          {isExpanded ? (
                            <ReactMarkdown>{row.answer}</ReactMarkdown>
                          ) : (
                            row.answer
                          )}
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ marginTop: 4, fontSize: 11 }}
                          onClick={() => toggleExpand(row.model)}
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {results.length > 0 && (
        <div className="export-bar">
          <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
          <button className="btn-ghost" onClick={exportJSON}>Export JSON</button>
        </div>
      )}
    </div>
  );
}

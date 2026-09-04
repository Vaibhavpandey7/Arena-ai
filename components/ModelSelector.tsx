"use client";
import React, { useState, useEffect, useMemo } from "react";

export interface NormalizedModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };
  supportsTools: boolean;
  supportsReasoning: boolean;
}

interface Props {
  mode: "single" | "compare";
  selected: string[];
  onChange: (ids: string[]) => void;
}

const FEATURED_IDS = [
  "deepseek/deepseek-r1",
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwq-32b",
  "deepseek/deepseek-chat",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "mistralai/mistral-large-2407",
];

const INITIAL_LIMIT = 8;

function ModelSelectorComponent({ mode, selected, onChange }: Props) {
  const [models, setModels] = useState<NormalizedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"featured" | "reasoning" | "tools" | "all">("featured");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load models");
        setLoading(false);
      });
  }, []);

  // Reset display limit when filter or search changes
  useEffect(() => {
    setDisplayLimit(search.trim() ? 12 : INITIAL_LIMIT);
  }, [search, activeFilter]);

  // Filter & prioritize models
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return models.filter((m) => {
      // Search matching
      if (q) {
        const matchesSearch =
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Filter tabs (if not actively searching, or apply filter with search)
      if (activeFilter === "featured" && !q) {
        return FEATURED_IDS.some((fid) => m.id.toLowerCase().includes(fid.toLowerCase()));
      }
      if (activeFilter === "reasoning") {
        return m.supportsReasoning;
      }
      if (activeFilter === "tools") {
        return m.supportsTools;
      }
      return true;
    }).sort((a, b) => {
      // Pin selected models to the absolute top
      const aSel = selected.includes(a.id);
      const bSel = selected.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;

      // Then prioritize featured models
      const aFeat = FEATURED_IDS.some((f) => a.id.toLowerCase().includes(f.toLowerCase()));
      const bFeat = FEATURED_IDS.some((f) => b.id.toLowerCase().includes(f.toLowerCase()));
      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [models, search, activeFilter, selected]);

  const visibleModels = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  function toggleModel(id: string) {
    if (mode === "single") {
      onChange([id]);
    } else {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else if (selected.length < 4) {
        onChange([...selected, id]);
      }
    }
  }

  function formatCtx(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  }

  const hasMore = filtered.length > displayLimit;

  return (
    <div className="model-deck-card">
      <div className="model-deck-header">
        <div className="deck-title">
          <span>🧠</span>
          <span>{mode === "single" ? "Select Active Model" : "Select Models for Arena"}</span>
          {mode === "compare" && (
            <span className="brand-tag" style={{ color: selected.length === 4 ? "var(--accent)" : "inherit" }}>
              {selected.length}/4 selected
            </span>
          )}
          {!loading && (
            <span className="brand-tag" style={{ fontSize: "10.5px" }}>
              {filtered.length} of {models.length} models
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Capability filter tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`domain-chip${activeFilter === "featured" ? " active" : ""}`}
              onClick={() => setActiveFilter("featured")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              ⭐ Featured
            </button>
            <button
              className={`domain-chip${activeFilter === "reasoning" ? " active" : ""}`}
              onClick={() => setActiveFilter("reasoning")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              ⚡ Reasoning
            </button>
            <button
              className={`domain-chip${activeFilter === "tools" ? " active" : ""}`}
              onClick={() => setActiveFilter("tools")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              🛠 Tools
            </button>
            <button
              className={`domain-chip${activeFilter === "all" ? " active" : ""}`}
              onClick={() => setActiveFilter("all")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              🌐 All Models
            </button>
          </div>

          <div className="deck-search">
            <span style={{ fontSize: 12, opacity: 0.6 }}>🔍</span>
            <input
              type="search"
              placeholder="Search 400+ models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-subtle)" }}>
          <span className="live-dot" style={{ display: "inline-block", marginRight: 8 }} />
          Loading neural models from OpenRouter directory…
        </div>
      )}

      {error && (
        <div style={{ color: "var(--rose)", fontSize: "12px", padding: "10px 0" }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="model-grid">
            {visibleModels.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px", color: "var(--text-subtle)" }}>
                No models match "{search}". Try searching another name or switch to "All Models".
              </div>
            )}

            {visibleModels.map((m) => {
              const isSel = selected.includes(m.id);
              const disabled = mode === "compare" && !isSel && selected.length >= 4;

              return (
                <div
                  key={m.id}
                  className={`model-card${isSel ? " selected" : ""}${disabled ? " disabled" : ""}`}
                  onClick={() => !disabled && toggleModel(m.id)}
                >
                  <div className="model-card-top">
                    <div style={{ overflow: "hidden" }}>
                      <div className="model-card-name">{m.name}</div>
                      <div className="model-card-id">{m.id}</div>
                    </div>

                    <div className="selection-ring">
                      {isSel && <span className="selection-check">✓</span>}
                    </div>
                  </div>

                  <div className="model-card-bottom">
                    <div className="model-badges">
                      {m.supportsReasoning && (
                        <span className="badge-reasoning">Reasoning</span>
                      )}
                      {m.supportsTools && (
                        <span className="badge-tools">Tools</span>
                      )}
                    </div>
                    <span className="model-ctx">{formatCtx(m.context_length)} ctx</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More / Show All Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 }}>
            {hasMore && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  style={{ fontSize: "12px", padding: "6px 16px" }}
                >
                  ▼ Show More (+12)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setDisplayLimit(filtered.length)}
                  style={{ fontSize: "12px", padding: "6px 16px" }}
                >
                  Show All ({filtered.length})
                </button>
              </>
            )}

            {displayLimit > INITIAL_LIMIT && (
              <button
                className="btn-secondary"
                onClick={() => setDisplayLimit(INITIAL_LIMIT)}
                style={{ fontSize: "12px", padding: "6px 16px" }}
              >
                ▲ Show Less (Top {INITIAL_LIMIT})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(ModelSelectorComponent);

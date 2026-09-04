"use client";
import { useState, useEffect } from "react";

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

export default function ModelSelector({ mode, selected, onChange }: Props) {
  const [models, setModels] = useState<NormalizedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "reasoning" | "tools">("all");
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

  const filtered = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === "reasoning") return m.supportsReasoning;
    if (activeFilter === "tools") return m.supportsTools;
    return true;
  });

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
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Quick capability filter pills */}
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`domain-chip${activeFilter === "all" ? " active" : ""}`}
              onClick={() => setActiveFilter("all")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              All
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
          </div>

          <div className="deck-search">
            <span style={{ fontSize: 12, opacity: 0.6 }}>🔍</span>
            <input
              type="search"
              placeholder="Filter by name or id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-subtle)" }}>
          <span className="live-dot" style={{ display: "inline-block", marginRight: 8 }} />
          Loading neural models from OpenRouter…
        </div>
      )}

      {error && (
        <div style={{ color: "var(--rose)", fontSize: "12px", padding: "10px 0" }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && (
        <div className="model-grid">
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px", color: "var(--text-subtle)" }}>
              No models match current filter criteria.
            </div>
          )}

          {filtered.map((m) => {
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
      )}
    </div>
  );
}

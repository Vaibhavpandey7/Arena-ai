"use client";
import { useState, useEffect } from "react";

interface NormalizedModel {
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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => { setModels(d.models ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load models"); setLoading(false); });
  }, []);

  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

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
    <div>
      <input
        type="search"
        placeholder="Search models…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      {mode === "compare" && (
        <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
          {selected.length}/4 selected
        </p>
      )}
      {loading && <p className="muted empty-state">Loading models…</p>}
      {error && <p className="bad" style={{ fontSize: 12 }}>{error}</p>}
      {!loading && !error && (
        <div className="model-list">
          {filtered.length === 0 && <p className="empty-state">No models match</p>}
          {filtered.map((m) => {
            const isSel = selected.includes(m.id);
            const disabled = mode === "compare" && !isSel && selected.length >= 4;
            return (
              <div
                key={m.id}
                className={`model-item${isSel ? " selected" : ""}${disabled ? " disabled" : ""}`}
                onClick={() => !disabled && toggleModel(m.id)}
                style={{ opacity: disabled ? 0.45 : 1 }}
              >
                <input
                  type={mode === "single" ? "radio" : "checkbox"}
                  checked={isSel}
                  onChange={() => !disabled && toggleModel(m.id)}
                  readOnly={mode === "single"}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="model-info">
                  <div className="model-name">{m.name}</div>
                  <div className="model-meta">{m.id} · {formatCtx(m.context_length)} ctx</div>
                  <div className="model-badges">
                    {m.supportsTools && <span className="badge badge-tool">tools</span>}
                    {m.supportsReasoning && <span className="badge badge-reason">reasoning</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";

export interface NormalizedModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };
  supportsTools: boolean;
  supportsReasoning: boolean;
  isCustom?: boolean;
  baseUrl?: string;
  apiKey?: string;
}

export interface CustomModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  context_length: number;
  supportsTools: boolean;
  supportsReasoning: boolean;
}

interface Props {
  mode: "single" | "compare";
  selected: string[];
  onChange: (ids: string[]) => void;
  onCustomEndpointsChange?: (endpoints: Record<string, { baseUrl: string; apiKey?: string }>) => void;
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
const CUSTOM_STORAGE_KEY = "ai-arena-custom-models";

const PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", sampleId: "ft:gpt-4o-mini-2024-07-18:org:model-name", needsKey: true },
  { label: "Together AI", baseUrl: "https://api.together.xyz/v1", sampleId: "togethercomputer/llama-3-8b-instruct", needsKey: true },
  { label: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", sampleId: "accounts/my-org/models/my-model", needsKey: true },
  { label: "Ollama (Local)", baseUrl: "http://localhost:11434/v1", sampleId: "llama3.2", needsKey: false },
  { label: "vLLM / TGI", baseUrl: "http://localhost:8000/v1", sampleId: "meta-llama/Meta-Llama-3-8B-Instruct", needsKey: false },
];

function isModelFree(m: NormalizedModel) {
  if (m.isCustom) return false;
  return (
    m.id.toLowerCase().includes(":free") ||
    (m.pricing && m.pricing.prompt === 0 && m.pricing.completion === 0)
  );
}

function ModelSelectorComponent({ mode, selected, onChange, onCustomEndpointsChange }: Props) {
  const [apiModels, setApiModels] = useState<NormalizedModel[]>([]);
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"featured" | "free" | "reasoning" | "tools" | "custom" | "all">("featured");
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customId, setCustomId] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("https://api.openai.com/v1");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customContext, setCustomContext] = useState(128000);
  const [customTools, setCustomTools] = useState(true);
  const [customReasoning, setCustomReasoning] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);
  const [formError, setFormError] = useState("");

  // Load custom models from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_STORAGE_KEY);
      if (stored) {
        const parsed: CustomModelConfig[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomModels(parsed);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, []);

  // Fetch OpenRouter API models
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        setApiModels(d.models ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load models");
        setLoading(false);
      });
  }, []);

  // Combine custom models with API models
  const allModels = useMemo<NormalizedModel[]>(() => {
    const customNormalized: NormalizedModel[] = customModels.map((cm) => ({
      id: cm.id,
      name: cm.name,
      context_length: cm.context_length,
      pricing: { prompt: 0, completion: 0 },
      supportsTools: cm.supportsTools,
      supportsReasoning: cm.supportsReasoning,
      isCustom: true,
      baseUrl: cm.baseUrl,
      apiKey: cm.apiKey,
    }));

    return [...customNormalized, ...apiModels];
  }, [customModels, apiModels]);

  // Notify parent whenever customModels or local models with endpoints change
  useEffect(() => {
    if (onCustomEndpointsChange) {
      const endpoints: Record<string, { baseUrl: string; apiKey?: string }> = {};
      allModels.forEach((m) => {
        if (m.baseUrl) {
          endpoints[m.id] = { baseUrl: m.baseUrl, apiKey: m.apiKey || undefined };
        }
      });
      onCustomEndpointsChange(endpoints);
    }
  }, [allModels, onCustomEndpointsChange]);

  // Reset display limit when filter or search changes
  useEffect(() => {
    setDisplayLimit(search.trim() ? 12 : INITIAL_LIMIT);
  }, [search, activeFilter]);

  // Filter & prioritize models
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allModels.filter((m) => {
      // Search matching
      if (q) {
        const matchesSearch =
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.isCustom && "custom finetune fine-tuned".includes(q));
        if (!matchesSearch) return false;
      }

      // Filter tabs
      if (activeFilter === "featured" && !q) {
        if (m.isCustom) return true; // Keep user's custom models prominent in Featured
        return FEATURED_IDS.some((fid) => m.id.toLowerCase().includes(fid.toLowerCase()));
      }
      if (activeFilter === "free") {
        return isModelFree(m);
      }
      if (activeFilter === "reasoning") {
        return m.supportsReasoning;
      }
      if (activeFilter === "tools") {
        return m.supportsTools;
      }
      if (activeFilter === "custom") {
        return m.isCustom === true;
      }
      return true;
    }).sort((a, b) => {
      // Pin selected models to the absolute top
      const aSel = selected.includes(a.id);
      const bSel = selected.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;

      // Pin custom models next
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;

      // Then prioritize featured models
      const aFeat = FEATURED_IDS.some((f) => a.id.toLowerCase().includes(f.toLowerCase()));
      const bFeat = FEATURED_IDS.some((f) => b.id.toLowerCase().includes(f.toLowerCase()));
      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [allModels, search, activeFilter, selected]);

  const visibleModels = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  const toggleModel = useCallback((id: string) => {
    if (mode === "single") {
      onChange([id]);
    } else {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else if (selected.length < 4) {
        onChange([...selected, id]);
      }
    }
  }, [mode, selected, onChange]);

  function handleDeleteCustom(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Remove custom model "${id}"?`)) {
      const updated = customModels.filter((m) => m.id !== id);
      setCustomModels(updated);
      try {
        localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      }
    }
  }

  function handleSaveCustom(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const trimmedName = customName.trim();
    const trimmedId = customId.trim();
    const trimmedUrl = customBaseUrl.trim();

    if (!trimmedName) {
      setFormError("Please enter a model name.");
      return;
    }
    if (!trimmedId) {
      setFormError("Please enter a model ID (e.g. ft:gpt-4o-mini-... or model tag).");
      return;
    }
    if (!trimmedUrl) {
      setFormError("Please enter an API Base URL.");
      return;
    }

    // Check if ID already exists
    if (customModels.some((m) => m.id.toLowerCase() === trimmedId.toLowerCase())) {
      setFormError(`A custom model with ID "${trimmedId}" already exists.`);
      return;
    }

    const newModel: CustomModelConfig = {
      id: trimmedId,
      name: trimmedName,
      baseUrl: trimmedUrl,
      apiKey: customApiKey.trim() || undefined,
      context_length: Number(customContext) || 128000,
      supportsTools: customTools,
      supportsReasoning: customReasoning,
    };

    const updated = [newModel, ...customModels];
    setCustomModels(updated);
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // Auto-select the newly created model
    if (mode === "single") {
      onChange([trimmedId]);
    } else if (selected.length < 4) {
      onChange([...selected, trimmedId]);
    }

    // Reset and close
    setShowModal(false);
    setCustomName("");
    setCustomId("");
    setCustomApiKey("");
    setFormError("");
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setCustomBaseUrl(p.baseUrl);
    if (!customId) {
      setCustomId(p.sampleId);
    }
    if (!customName) {
      setCustomName(`${p.label} Model`);
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
          <span>{mode === "single" ? "Select Active Model" : "Select Models for Arena"}</span>
          {mode === "compare" && (
            <span className="brand-tag" style={{ color: selected.length === 4 ? "var(--accent)" : "inherit" }}>
              {selected.length}/4 selected
            </span>
          )}
          {!loading && (
            <span className="brand-tag" style={{ fontSize: "10.5px" }}>
              {filtered.length} of {allModels.length} models
            </span>
          )}
        </div>

        <div className="model-deck-controls">
          {/* Add Your Own Model Button */}
          <button
            type="button"
            className="btn-secondary add-model-btn"
            onClick={() => setShowModal(true)}
            style={{
              padding: "4px 11px",
              fontSize: "11.5px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              borderColor: "var(--accent-border)",
              color: "var(--accent-light)",
            }}
          >
            <span>+</span>
            <span>Add Your Own Model</span>
          </button>

          {/* Capability filter tabs */}
          <div className="model-filter-tabs">
            <button
              className={`domain-chip${activeFilter === "featured" ? " active" : ""}`}
              onClick={() => setActiveFilter("featured")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              Featured
            </button>
            <button
              className={`domain-chip${activeFilter === "free" ? " active" : ""}`}
              onClick={() => setActiveFilter("free")}
              style={{ padding: "4px 10px", fontSize: "11px", color: activeFilter === "free" ? "#fff" : "#34d399" }}
            >
              Free
            </button>
            <button
              className={`domain-chip${activeFilter === "reasoning" ? " active" : ""}`}
              onClick={() => setActiveFilter("reasoning")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              Reasoning
            </button>
            <button
              className={`domain-chip${activeFilter === "tools" ? " active" : ""}`}
              onClick={() => setActiveFilter("tools")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              Tools
            </button>
            {allModels.some((m) => m.isCustom) && (
              <button
                className={`domain-chip${activeFilter === "custom" ? " active" : ""}`}
                onClick={() => setActiveFilter("custom")}
                style={{ padding: "4px 10px", fontSize: "11px", color: activeFilter === "custom" ? "#fff" : "#fbbf24" }}
              >
                Your Models ({allModels.filter((m) => m.isCustom).length})
              </button>
            )}
            <button
              className={`domain-chip${activeFilter === "all" ? " active" : ""}`}
              onClick={() => setActiveFilter("all")}
              style={{ padding: "4px 10px", fontSize: "11px" }}
            >
              All Models
            </button>
          </div>

          <div className="deck-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="model-search-input"
              name="modelSearch"
              type="search"
              placeholder="Search models or custom models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-subtle)" }}>
          <span className="live-dot" style={{ display: "inline-block", marginRight: 8 }} />
          Loading neural models directory…
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
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "28px", color: "var(--text-subtle)" }}>
                {activeFilter === "free" ? (
                  <div>
                    <div>No free models match your search query "{search}".</div>
                    <button
                      className="btn-secondary"
                      onClick={() => { setSearch(""); setActiveFilter("free"); }}
                      style={{ marginTop: 12, fontSize: 11 }}
                    >
                      Clear Search
                    </button>
                  </div>
                ) : activeFilter === "custom" ? (
                  <div>
                    <div>No custom models added yet.</div>
                    <button
                      className="btn-primary"
                      onClick={() => setShowModal(true)}
                      style={{ marginTop: 12, fontSize: 11 }}
                    >
                      + Add Your Own Model
                    </button>
                  </div>
                ) : (
                  <div>No models match "{search}". Try searching another name or switch to "All Models".</div>
                )}
              </div>
            )}

            {visibleModels.map((m) => {
              const isSel = selected.includes(m.id);
              const disabled = mode === "compare" && !isSel && selected.length >= 4;
              const isFree = isModelFree(m);

              return (
                <div
                  key={m.id}
                  className={`model-card${isSel ? " selected" : ""}${disabled ? " disabled" : ""}`}
                  onClick={() => !disabled && toggleModel(m.id)}
                >
                  <div className="model-card-top">
                    <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                      <div className="model-card-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {m.name}
                        </span>
                      </div>
                      <div className="model-card-id" title={m.id}>
                        {m.isCustom ? `Endpoint: ${m.baseUrl}` : m.id}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {m.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustom(m.id, e)}
                          title="Remove custom model"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-subtle)",
                            cursor: "pointer",
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rose)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-subtle)")}
                        >
                          Remove
                        </button>
                      )}
                      <div className="selection-ring">
                        {isSel && <span className="selection-check">✓</span>}
                      </div>
                    </div>
                  </div>

                  <div className="model-card-bottom">
                    <div className="model-badges">
                      {m.isCustom && (
                        <span className="badge-custom">Custom</span>
                      )}
                      {isFree && (
                        <span className="badge-free">Free</span>
                      )}
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
                  Show More (+12)
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
                Show Less (Top {INITIAL_LIMIT})
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Add Custom / Fine-Tuned Model Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>Add Your Own Model</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustom}>
              <div className="modal-body">
                {/* Preset Quick Fill */}
                <div className="modal-field">
                  <label>Quick Presets (Select Provider)</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => applyPreset(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Name */}
                <div className="modal-field">
                  <label htmlFor="custom-model-name">Display Name *</label>
                  <input
                    id="custom-model-name"
                    name="customModelName"
                    type="text"
                    required
                    placeholder="e.g. DIL Claims Custom Model"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                {/* Model ID */}
                <div className="modal-field">
                  <label htmlFor="custom-model-id">Model ID / Checkpoint Tag *</label>
                  <input
                    id="custom-model-id"
                    name="customModelId"
                    type="text"
                    required
                    placeholder="e.g. ft:gpt-4o-mini-2024-07-18:my-org:v1 or llama3.2"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                    The model identifier passed to the inference endpoint.
                  </span>
                </div>

                {/* Base URL */}
                <div className="modal-field">
                  <label htmlFor="custom-base-url">API Base URL *</label>
                  <input
                    id="custom-base-url"
                    name="customBaseUrl"
                    type="url"
                    required
                    placeholder="e.g. https://api.openai.com/v1 or http://localhost:11434/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                    Standard OpenAI-compatible API base (e.g. /v1). /chat/completions is appended automatically.
                  </span>
                </div>

                {/* API Key */}
                <div className="modal-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="custom-api-key">API Key (Optional for Local Ollama/vLLM)</label>
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {showKeyText ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="custom-api-key"
                    name="customApiKey"
                    type={showKeyText ? "text" : "password"}
                    placeholder="sk-... (Stored strictly in your local browser)"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                </div>

                {/* Context Window & Capabilities */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="modal-field">
                    <label htmlFor="custom-context-length">Context Window (Tokens)</label>
                    <input
                      id="custom-context-length"
                      name="customContextLength"
                      type="number"
                      min={1024}
                      max={2000000}
                      step={1024}
                      value={customContext}
                      onChange={(e) => setCustomContext(Number(e.target.value))}
                    />
                  </div>

                  <div className="modal-field" style={{ justifyContent: "center", gap: 8, paddingTop: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        id="custom-tools-cb"
                        name="customToolsCb"
                        type="checkbox"
                        checked={customTools}
                        onChange={(e) => setCustomTools(e.target.checked)}
                      />
                      <span>Supports Tools</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        id="custom-reasoning-cb"
                        name="customReasoningCb"
                        type="checkbox"
                        checked={customReasoning}
                        onChange={(e) => setCustomReasoning(e.target.checked)}
                      />
                      <span>Reasoning Trace</span>
                    </label>
                  </div>
                </div>

                {formError && (
                  <div style={{ color: "var(--rose)", fontSize: 12, padding: "4px 0" }}>
                    ⚠ {formError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save & Select Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ModelSelectorComponent);

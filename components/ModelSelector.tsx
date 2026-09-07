"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

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

const CUSTOM_STORAGE_KEY = "ai-arena-custom-models";

const PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", sampleId: "ft:gpt-4o-mini-2024-07-18:org:model-name", needsKey: true },
  { label: "Hugging Face", baseUrl: "https://router.huggingface.co/hf-inference/v1", sampleId: "meta-llama/Llama-3.2-3B-Instruct", needsKey: true },
  { label: "Together AI", baseUrl: "https://api.together.xyz/v1", sampleId: "togethercomputer/llama-3-8b-instruct", needsKey: true },
  { label: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", sampleId: "accounts/my-org/models/my-model", needsKey: true },
  { label: "Ollama (Local)", baseUrl: "http://localhost:11434/v1", sampleId: "llama3.2", needsKey: false },
  { label: "vLLM / TGI", baseUrl: "http://localhost:8000/v1", sampleId: "meta-llama/Meta-Llama-3-8B-Instruct", needsKey: false },
];

const COMPARE_PRESETS = [
  {
    label: "⚡ Top 4 Benchmark",
    models: ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "anthropic/claude-3-haiku"],
    desc: "4 fast, production-reliable models that avoid free-tier daily caps",
  },
  {
    label: "⚡ Frontier Trio",
    models: ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
    desc: "Top frontier reasoning & instruct models",
  },
  {
    label: "🏠 Local Models",
    models: ["llama3.2:3b", "mistral-small3.1:24b", "nemotron3:33b"],
    desc: "Zero-cost local Ollama models",
  },
  {
    label: "🧮 Fast & Efficient",
    models: ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct"],
    desc: "Fast & reliable executors",
  },
];

function isModelFree(m: NormalizedModel) {
  if (m.isCustom) return false;
  return (
    m.id.toLowerCase().includes(":free") ||
    (m.pricing && m.pricing.prompt === 0 && m.pricing.completion === 0)
  );
}

function formatCtx(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function ModelSelectorComponent({ mode, selected, onChange, onCustomEndpointsChange }: Props) {
  const [apiModels, setApiModels] = useState<NormalizedModel[]>([]);
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"featured" | "free" | "reasoning" | "tools" | "custom" | "all">("featured");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [error, setError] = useState("");

  // Modal state for custom model
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

  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

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

  // Notify parent whenever custom endpoints change
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

  // Filter & prioritize models
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allModels.filter((m) => {
      if (q) {
        const matches =
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.isCustom && "custom finetune fine-tuned ollama".includes(q));
        if (!matches) return false;
      }

      if (activeFilter === "featured" && !q) {
        if (m.isCustom) return true;
        return FEATURED_IDS.some((fid) => m.id.toLowerCase().includes(fid.toLowerCase()));
      }
      if (activeFilter === "free") return isModelFree(m);
      if (activeFilter === "reasoning") return m.supportsReasoning;
      if (activeFilter === "tools") return m.supportsTools;
      if (activeFilter === "custom") return m.isCustom === true;
      return true;
    }).sort((a, b) => {
      const aSel = selected.includes(a.id);
      const bSel = selected.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;

      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;

      const aFeat = FEATURED_IDS.some((f) => a.id.toLowerCase().includes(f.toLowerCase()));
      const bFeat = FEATURED_IDS.some((f) => b.id.toLowerCase().includes(f.toLowerCase()));
      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [allModels, search, activeFilter, selected]);

  const toggleModel = useCallback((id: string) => {
    if (mode === "single") {
      onChange([id]);
      setPopoverOpen(false);
    } else {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else if (selected.length < 4) {
        onChange([...selected, id]);
      }
    }
  }, [mode, selected, onChange]);

  function removeSelected(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  }

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

    if (!trimmedName || !trimmedId || !trimmedUrl) {
      setFormError("Please enter model name, ID, and base URL.");
      return;
    }

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

    if (mode === "single") {
      onChange([trimmedId]);
    } else if (selected.length < 4) {
      onChange([...selected, trimmedId]);
    }

    setShowModal(false);
    setCustomName("");
    setCustomId("");
    setCustomApiKey("");
    setFormError("");
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setCustomBaseUrl(p.baseUrl);
    if (!customId) setCustomId(p.sampleId);
    if (!customName) setCustomName(`${p.label} Model`);
  }

  // Active model info for single mode
  const currentModel = allModels.find((m) => m.id === selected[0]) || {
    id: selected[0] || "deepseek/deepseek-r1",
    name: (selected[0] || "deepseek/deepseek-r1").split("/").pop() || "DeepSeek R1",
    context_length: 65536,
    supportsReasoning: true,
    supportsTools: true,
    pricing: { prompt: 0, completion: 0 },
  };

  return (
    <div className="compact-model-bar" ref={popoverRef}>
      {/* ── Single Model Bar ────────────────────────────────────────── */}
      {mode === "single" && (
        <div className="model-bar-inner">
          <div className="model-bar-left">
            <span className="model-bar-label">Active Model:</span>

            <button
              type="button"
              id="model-selector-trigger"
              className={`model-pill-trigger${popoverOpen ? " is-open" : ""}`}
              onClick={() => setPopoverOpen((prev) => !prev)}
            >
              <div className="model-pill-main">
                <span className="model-indicator-dot" />
                <span className="model-pill-name">{currentModel.name}</span>
                <span className="model-pill-id hide-on-mobile">{currentModel.id}</span>
              </div>

              <div className="model-pill-meta">
                <span className="model-pill-badge ctx">{formatCtx(currentModel.context_length)} ctx</span>
                {currentModel.supportsReasoning && (
                  <span className="model-pill-badge reasoning">Reasoning</span>
                )}
                {currentModel.supportsTools && (
                  <span className="model-pill-badge tools">Tools</span>
                )}
                {isModelFree(currentModel as NormalizedModel) && (
                  <span className="model-pill-badge free">Free</span>
                )}
                <span className="model-pill-caret">▾</span>
              </div>
            </button>
          </div>

          <div className="model-bar-right">
            <button
              type="button"
              className="btn-secondary add-model-btn"
              onClick={() => setShowModal(true)}
              title="Connect a local Ollama model or fine-tune"
            >
              <span>+ Custom / Ollama</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Compare Mode Bar ────────────────────────────────────────── */}
      {mode === "compare" && (
        <div className="model-bar-inner compare-bar">
          <div className="compare-bar-left">
            <div className="compare-selected-chips">
              <span className="model-bar-label">
                Arena Models ({selected.length}/4):
              </span>

              {selected.map((selId) => {
                const m = allModels.find((x) => x.id === selId);
                const name = m?.name || selId.split("/").pop() || selId;
                return (
                  <div key={selId} className="compare-model-chip">
                    <span>{name}</span>
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={(e) => removeSelected(selId, e)}
                      title={`Remove ${name}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {selected.length < 4 && (
                <button
                  type="button"
                  className="btn-secondary add-arena-model-btn"
                  onClick={() => setPopoverOpen((prev) => !prev)}
                >
                  <span>+ Add Model ({4 - selected.length} slots left)</span>
                  <span>▾</span>
                </button>
              )}
            </div>

            {/* Quick 1-Click Comparison Presets */}
            <div className="compare-quick-presets">
              <span style={{ fontSize: 11, color: "var(--text-subtle)", marginRight: 2 }}>
                Quick Presets:
              </span>
              {COMPARE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="preset-pill-btn"
                  onClick={() => onChange(preset.models)}
                  title={preset.desc}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="model-bar-right">
            <button
              type="button"
              className="btn-secondary add-model-btn"
              onClick={() => setShowModal(true)}
              title="Connect a local Ollama model or custom endpoint"
            >
              <span>+ Custom Model</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Popover / Dropdown ─────────────────────────────── */}
      {popoverOpen && (
        <div className="model-popover-card">
          {/* Popover Header with Search */}
          <div className="popover-search-header">
            <div className="popover-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                className="popover-search-input"
                placeholder="Type to filter 35+ models by name, provider, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="popover-clear-btn"
                  onClick={() => setSearch("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="popover-filter-tabs">
              <button
                type="button"
                className={`popover-tab${activeFilter === "featured" ? " active" : ""}`}
                onClick={() => setActiveFilter("featured")}
              >
                Featured
              </button>
              <button
                type="button"
                className={`popover-tab${activeFilter === "free" ? " active" : ""}`}
                onClick={() => setActiveFilter("free")}
              >
                Free
              </button>
              <button
                type="button"
                className={`popover-tab${activeFilter === "reasoning" ? " active" : ""}`}
                onClick={() => setActiveFilter("reasoning")}
              >
                Reasoning
              </button>
              <button
                type="button"
                className={`popover-tab${activeFilter === "tools" ? " active" : ""}`}
                onClick={() => setActiveFilter("tools")}
              >
                Tools
              </button>
              {allModels.some((m) => m.isCustom) && (
                <button
                  type="button"
                  className={`popover-tab${activeFilter === "custom" ? " active" : ""}`}
                  onClick={() => setActiveFilter("custom")}
                >
                  Custom ({allModels.filter((m) => m.isCustom).length})
                </button>
              )}
              <button
                type="button"
                className={`popover-tab${activeFilter === "all" ? " active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All Models ({allModels.length})
              </button>
            </div>
          </div>

          {/* Model List View */}
          <div className="popover-model-list">
            {loading && (
              <div className="popover-loading">
                <span className="live-dot" /> Loading models directory…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="popover-empty">
                <div>No models match "{search}".</div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 8, fontSize: 11 }}
                  onClick={() => { setSearch(""); setActiveFilter("all"); }}
                >
                  Clear Search Filter
                </button>
              </div>
            )}

            {!loading && filtered.map((m) => {
              const isSel = selected.includes(m.id);
              const isFree = isModelFree(m);
              const disabled = mode === "compare" && !isSel && selected.length >= 4;

              return (
                <div
                  key={m.id}
                  className={`popover-model-row${isSel ? " selected" : ""}${disabled ? " disabled" : ""}`}
                  onClick={() => !disabled && toggleModel(m.id)}
                >
                  <div className="row-left">
                    <div className="row-checkbox">
                      {mode === "single" ? (
                        <div className={`radio-circle${isSel ? " active" : ""}`} />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSel}
                          disabled={disabled}
                          readOnly
                        />
                      )}
                    </div>

                    <div className="row-info">
                      <div className="row-title">
                        <span className="row-name">{m.name}</span>
                        {m.isCustom && <span className="badge-custom">Custom</span>}
                        {isFree && <span className="badge-free">Free</span>}
                        {m.supportsReasoning && <span className="badge-reasoning">R1</span>}
                        {m.supportsTools && <span className="badge-tools">Tools</span>}
                      </div>
                      <div className="row-id">
                        {m.isCustom ? `Local / Endpoint: ${m.baseUrl}` : m.id}
                      </div>
                    </div>
                  </div>

                  <div className="row-right">
                    <span className="row-ctx">{formatCtx(m.context_length)} ctx</span>
                    {m.isCustom && (
                      <button
                        type="button"
                        className="row-del-btn"
                        onClick={(e) => handleDeleteCustom(m.id, e)}
                        title="Delete custom model"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Popover Footer */}
          <div className="popover-footer">
            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
              Showing {filtered.length} of {allModels.length} models
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: "3px 10px" }}
                onClick={() => setShowModal(true)}
              >
                + Add Custom Model
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: 11, padding: "3px 12px" }}
                onClick={() => setPopoverOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Custom Model Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>Add Your Own Model / Local Ollama</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
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

                <div className="modal-field">
                  <label htmlFor="custom-model-name">Display Name *</label>
                  <input
                    id="custom-model-name"
                    type="text"
                    required
                    placeholder="e.g. My Actuarial Llama"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="modal-field">
                  <label htmlFor="custom-model-id">Model ID / Checkpoint Tag *</label>
                  <input
                    id="custom-model-id"
                    type="text"
                    required
                    placeholder="e.g. llama3.2 or ft:gpt-4o-mini-..."
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                  />
                </div>

                <div className="modal-field">
                  <label htmlFor="custom-base-url">API Base URL *</label>
                  <input
                    id="custom-base-url"
                    type="url"
                    required
                    placeholder="e.g. http://localhost:11434/v1 or https://api.openai.com/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                  />
                </div>

                <div className="modal-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="custom-api-key">API Key (Optional for Local Ollama/vLLM)</label>
                    <button
                      type="button"
                      className="api-key-toggle-btn"
                      onClick={() => setShowKeyText(!showKeyText)}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, cursor: "pointer" }}
                    >
                      {showKeyText ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="custom-api-key"
                    type={showKeyText ? "text" : "password"}
                    placeholder="sk-... (Stored strictly in your local browser)"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="modal-field">
                    <label htmlFor="custom-context-length">Context Window (Tokens)</label>
                    <input
                      id="custom-context-length"
                      type="number"
                      min={1024}
                      max={2000000}
                      step={1024}
                      value={customContext}
                      onChange={(e) => setCustomContext(Number(e.target.value))}
                    />
                  </div>

                  <div className="modal-field" style={{ justifyContent: "center", gap: 8, paddingTop: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={customTools}
                        onChange={(e) => setCustomTools(e.target.checked)}
                      />
                      <span>Supports Tools</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                      <input
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

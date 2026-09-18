"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { MODEL_REGISTRY, MODEL_GROUPS, ModelDef, getModel } from "@/lib/model-registry";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}

interface ApiModel {
  id: string;
  name: string;
  context_length: number;
  pricing?: { prompt: number; completion: number };
  supportsTools?: boolean;
  supportsReasoning?: boolean;
  isCustom?: boolean;
}

export default function ModelSelectWidget({
  value,
  onChange,
  label,
  placeholder = "Select model...",
  compact = false,
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("featured");
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search safely when opened without scrolling parent containers
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  // Fetch all OpenRouter models from API
  useEffect(() => {
    let mounted = true;
    setIsLoadingApi(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data.models)) {
          setApiModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingApi(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Current selected model details
  const selectedModel = useMemo(() => {
    const fromRegistry = getModel(value);
    if (fromRegistry) return fromRegistry;
    const fromApi = apiModels.find((m) => m.id === value);
    if (fromApi) {
      const isFree =
        fromApi.id.endsWith(":free") ||
        (fromApi.pricing && fromApi.pricing.prompt === 0 && fromApi.pricing.completion === 0);
      return {
        id: fromApi.id,
        label: fromApi.name || fromApi.id,
        provider: fromApi.id.split("/")[0] || "Custom",
        providerInitial: (fromApi.id.split("/")[0] || "AI").slice(0, 2).toUpperCase(),
        tier: isFree ? "free" : "standard",
        tags: [
          fromApi.supportsReasoning ? "reasoning" : "fast",
          isFree ? "open-source" : undefined,
        ].filter(Boolean),
        contextK: Math.round((fromApi.context_length || 4096) / 1000),
        isFree: Boolean(isFree),
        tooltip: `${fromApi.name || fromApi.id} (${Math.round((fromApi.context_length || 4096) / 1000)}k ctx)`,
        badge: fromApi.supportsReasoning ? "reasoning" : "fast",
      } as unknown as ModelDef;
    }
    return undefined;
  }, [value, apiModels]);

  // Filtered model list
  const filteredModels = useMemo(() => {
    const query = search.toLowerCase().trim();

    // If "all" tab is selected or user searches, search both registry and API models
    if (activeTab === "all" || (query.length > 1 && activeTab !== "featured")) {
      const allUnified = [...MODEL_REGISTRY];
      const registryIds = new Set(MODEL_REGISTRY.map((m) => m.id));

      for (const apiM of apiModels) {
        if (!registryIds.has(apiM.id)) {
          const isFree =
            apiM.id.endsWith(":free") ||
            (apiM.pricing && apiM.pricing.prompt === 0 && apiM.pricing.completion === 0);
          allUnified.push({
            id: apiM.id,
            label: apiM.name || apiM.id,
            provider: apiM.id.split("/")[0] || "OpenRouter",
            providerInitial: (apiM.id.split("/")[0] || "OR").slice(0, 2).toUpperCase(),
            tier: isFree ? "free" : "standard",
            tags: [
              apiM.supportsReasoning ? "reasoning" : undefined,
              isFree ? "open-source" : undefined,
              apiM.id.includes("vision") || apiM.id.includes("vl") ? "multimodal" : undefined,
            ].filter(Boolean) as any,
            contextK: Math.round((apiM.context_length || 4096) / 1000),
            isFree: Boolean(isFree),
            tooltip: `${apiM.name || apiM.id}`,
            badge: apiM.supportsReasoning ? "reasoning" : "fast",
          });
        }
      }

      return allUnified.filter((m) => {
        const matchesQuery =
          !query ||
          m.label.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query);

        if (!matchesQuery) return false;

        if (activeTab === "free") return m.isFree;
        if (activeTab === "reasoning") return m.tags?.includes("reasoning") || m.tags?.includes("extended-thinking");
        if (activeTab === "domain") return m.tags?.includes("domain-specific") || m.id.includes("insurance") || m.id.includes("dil");
        if (activeTab === "multimodal") return m.tags?.includes("multimodal") || m.id.includes("vision") || m.id.includes("vl");
        if (activeTab === "fast") return m.tags?.includes("fast");

        return true;
      });
    }

    // Default: Curated Registry filtered by active tab
    return MODEL_REGISTRY.filter((m) => {
      const matchesQuery =
        !query ||
        m.label.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (activeTab === "featured") return true;
      if (activeTab === "free") return m.isFree;
      if (activeTab === "reasoning") return m.tags.includes("reasoning") || m.tags.includes("extended-thinking");
      if (activeTab === "domain") return m.tags.includes("domain-specific");
      if (activeTab === "multimodal") return m.tags.includes("multimodal");
      if (activeTab === "fast") return m.tags.includes("fast") && m.tier !== "premium";
      if (activeTab === "premium") return m.tier === "premium";

      return true;
    });
  }, [search, activeTab, apiModels]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: "4px",
            fontWeight: 600,
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: compact ? "6px 10px" : "8px 12px",
          background: "rgba(11, 22, 40, 0.9)",
          border: isOpen ? "1px solid var(--cyan)" : "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.82rem",
          textAlign: "left",
          transition: "all 0.15s ease",
          boxShadow: isOpen ? "0 0 10px rgba(0, 212, 255, 0.2)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", minWidth: 0 }}>
          {selectedModel ? (
            <>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: selectedModel.isFree ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 212, 255, 0.12)",
                  color: selectedModel.isFree ? "var(--emerald)" : "var(--cyan)",
                  border: `1px solid ${selectedModel.isFree ? "rgba(16, 185, 129, 0.3)" : "rgba(0, 212, 255, 0.25)"}`,
                  flexShrink: 0,
                }}
              >
                {selectedModel.providerInitial}
              </span>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedModel.label}
              </span>
              {selectedModel.isFree && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--emerald)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  FREE
                </span>
              )}
              {selectedModel.tags?.includes("reasoning") && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "rgba(14, 165, 233, 0.15)",
                    color: "var(--cyan-light)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  🧠 REASONING
                </span>
              )}
              {selectedModel.tags?.includes("domain-specific") && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--amber)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  🛡 DOMAIN
                </span>
              )}
            </>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>{placeholder}</span>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginLeft: "6px" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            maxHeight: "380px",
            background: "#0d1a30",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7), 0 0 1px rgba(0, 212, 255, 0.3)",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", boxSizing: "border-box" }}>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 440+ OpenRouter models..."
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.78rem",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "6px 8px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(0, 0, 0, 0.2)",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {[
              { id: "featured", label: "Featured" },
              { id: "free", label: "⭐ Free" },
              { id: "reasoning", label: "🧠 Reasoning" },
              { id: "domain", label: "🛡 Domain" },
              { id: "fast", label: "⚡ Fast" },
              { id: "multimodal", label: "🌐 Vision" },
              { id: "all", label: `All (${apiModels.length || "440+"})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontSize: "0.68rem",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: activeTab === tab.id ? "var(--cyan)" : "transparent",
                  color: activeTab === tab.id ? "#050b14" : "var(--text-muted)",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Model list items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
            {filteredModels.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                No models matching &quot;{search}&quot;
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = m.id === value;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(0, 212, 255, 0.12)" : "transparent",
                      border: isSelected ? "1px solid rgba(0, 212, 255, 0.3)" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "2px",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.label}
                        </span>
                        {m.isFree && (
                          <span
                            style={{
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "var(--emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                            }}
                          >
                            FREE
                          </span>
                        )}
                        {m.tags?.includes("reasoning") && (
                          <span
                            style={{
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "rgba(14, 165, 233, 0.15)",
                              color: "var(--cyan-light)",
                            }}
                          >
                            🧠 REASONING
                          </span>
                        )}
                        {m.tags?.includes("domain-specific") && (
                          <span
                            style={{
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--amber)",
                            }}
                          >
                            🛡 DOMAIN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span>{m.provider}</span>
                        <span>·</span>
                        <span>{m.contextK ? `${m.contextK}k context` : ""}</span>
                        <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis" }}>{m.id}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span style={{ color: "var(--cyan)", fontWeight: 800, fontSize: "0.85rem" }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { MODEL_REGISTRY, MODEL_GROUPS, ModelDef, getModel } from "@/lib/model-registry";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
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
  onRemove,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("featured");
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
      // Generous, readable dropdown width between 380px and viewport bounds
      const desiredWidth = Math.min(Math.max(rect.width, 400), viewportWidth - 24);
      // Position left so it never bleeds off right edge or left edge of the screen
      let left = rect.left;
      if (left + desiredWidth > viewportWidth - 12) {
        left = Math.max(12, viewportWidth - 12 - desiredWidth);
      }

      setCoords({
        top: rect.bottom + 6,
        left: left,
        width: desiredWidth,
      });
    }
  }, []);

  // Update position on open/resize/scroll and focus search
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleUpdate = () => updateCoords();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 40);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      clearTimeout(timer);
    };
  }, [isOpen, updateCoords]);

  // Fetch all OpenRouter models from API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingApi(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data.models)) {
          setApiModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingApi(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Current selected model details with comprehensive fallback resolution
  const selectedModel = useMemo(() => {
    if (!value) return undefined;

    // 1. Direct registry lookup
    let fromRegistry = getModel(value);
    if (!fromRegistry) {
      const baseId = value.replace(/:free$/, "");
      fromRegistry = getModel(baseId);
    }
    if (fromRegistry) {
      return {
        ...fromRegistry,
        id: value,
        isFree: value.endsWith(":free") || fromRegistry.isFree,
      };
    }

    // 2. Direct API models lookup
    const fromApi = apiModels.find(
      (m) => m.id === value || m.id === value.replace(/:free$/, "")
    );
    if (fromApi) {
      const isFree =
        value.endsWith(":free") ||
        fromApi.id.endsWith(":free") ||
        (fromApi.pricing && fromApi.pricing.prompt === 0 && fromApi.pricing.completion === 0);
      return {
        id: value,
        label: fromApi.name || fromApi.id.split("/")[1] || fromApi.id,
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

    // 3. Fallback synthesis from ID string so it NEVER shows empty "Select model..."
    const isFree = value.includes(":free");
    const parts = value.split("/");
    const provider = parts.length > 1 ? parts[0] : "AI";
    const rawName = parts.length > 1 ? parts[1] : parts[0];
    const cleanName = rawName
      .replace(/:free$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id: value,
      label: cleanName,
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
      providerInitial: provider.slice(0, 2).toUpperCase(),
      tier: isFree ? "free" : "standard",
      tags: [isFree ? "open-source" : "fast"],
      contextK: 128,
      isFree: Boolean(isFree),
      tooltip: `${cleanName} (${value})`,
      badge: "fast",
    } as unknown as ModelDef;
  }, [value, apiModels]);

  // Unified models: Curated registry + all OpenRouter API models
  const allUnified = useMemo(() => {
    const list: ModelDef[] = [...MODEL_REGISTRY];
    const registryIds = new Set(MODEL_REGISTRY.map((m) => m.id));

    for (const apiM of apiModels) {
      if (!registryIds.has(apiM.id)) {
        const isFree =
          apiM.id.endsWith(":free") ||
          apiM.id.includes(":free") ||
          (apiM.pricing && apiM.pricing.prompt === 0 && apiM.pricing.completion === 0);

        list.push({
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
    return list;
  }, [apiModels]);

  const freeCount = useMemo(() => {
    return allUnified.filter((m) => m.isFree).length;
  }, [allUnified]);

  // Filtered model list
  const filteredModels = useMemo(() => {
    const query = search.toLowerCase().trim();

    // If "featured" tab and no query, return curated registry
    if (activeTab === "featured" && !query) {
      return MODEL_REGISTRY;
    }

    // Filter from unified catalog
    return allUnified.filter((m) => {
      const matchesQuery =
        !query ||
        m.label.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (activeTab === "free") return Boolean(m.isFree);
      if (activeTab === "reasoning") return m.tags?.includes("reasoning") || m.tags?.includes("extended-thinking");
      if (activeTab === "domain") return m.tags?.includes("domain-specific") || m.id.includes("insurance") || m.id.includes("dil");
      if (activeTab === "multimodal") return m.tags?.includes("multimodal") || m.id.includes("vision") || m.id.includes("vl");
      if (activeTab === "fast") return m.tags?.includes("fast");

      return true;
    });
  }, [search, activeTab, allUnified]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
      {/* Properly Shaped Label Header */}
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "5px",
            padding: "0 2px",
            minHeight: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                display: "inline-block",
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--cyan)",
                boxShadow: "0 0 6px var(--cyan)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                fontWeight: 700,
                userSelect: "none",
              }}
            >
              {label}
            </span>
          </div>

          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px 5px",
                borderRadius: "4px",
                fontSize: "0.72rem",
                lineHeight: 1,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--rose)";
                e.currentTarget.style.background = "rgba(244, 63, 94, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
              title="Remove model"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Trigger Button - Pristine container bounded layout */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: compact ? "6px 10px" : "8px 12px",
          background: "rgba(11, 22, 40, 0.9)",
          border: isOpen ? "1px solid var(--cyan)" : "1px solid rgba(0, 212, 255, 0.22)",
          borderRadius: "8px",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.82rem",
          textAlign: "left",
          transition: "all 0.15s ease",
          boxShadow: isOpen
            ? "0 0 12px rgba(0, 212, 255, 0.25), inset 0 0 8px rgba(0, 212, 255, 0.08)"
            : "0 2px 5px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {selectedModel ? (
            <>
              {/* Provider Badge */}
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "2px 5px",
                  borderRadius: "4px",
                  background: selectedModel.isFree ? "rgba(16, 185, 129, 0.18)" : "rgba(0, 212, 255, 0.15)",
                  color: selectedModel.isFree ? "var(--emerald)" : "var(--cyan)",
                  border: `1px solid ${selectedModel.isFree ? "rgba(16, 185, 129, 0.35)" : "rgba(0, 212, 255, 0.3)"}`,
                  flexShrink: 0,
                  lineHeight: 1.2,
                }}
              >
                {selectedModel.providerInitial}
              </span>

              {/* Model Label - guaranteed to truncate cleanly with ellipsis without bursting container */}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: compact ? "0.78rem" : "0.82rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                  color: "var(--text)",
                }}
                title={selectedModel.label}
              >
                {selectedModel.label}
              </span>

              {/* Status Badge (prioritized single badge so it never crowds or bursts the box) */}
              {selectedModel.isFree ? (
                <span
                  style={{
                    fontSize: "0.58rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    fontWeight: 800,
                    flexShrink: 0,
                    letterSpacing: "0.04em",
                  }}
                >
                  FREE
                </span>
              ) : selectedModel.tags?.includes("reasoning") ? (
                <span
                  style={{
                    fontSize: "0.58rem",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    background: "rgba(14, 165, 233, 0.15)",
                    color: "var(--cyan-light)",
                    border: "1px solid rgba(14, 165, 233, 0.3)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  🧠 REASON
                </span>
              ) : null}
            </>
          ) : (
            <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.78rem" }}>
              {placeholder}
            </span>
          )}
        </div>

        {/* Dropdown Chevron indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingLeft: "6px",
            flexShrink: 0,
            color: isOpen ? "var(--cyan)" : "var(--text-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease, color 0.15s ease",
            fontSize: "0.62rem",
          }}
        >
          ▼
        </div>
      </button>

      {/* Popover Dropdown rendered into document.body to stay above chat div with full size */}
      {isOpen && coords && mounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "440px",
            background: "#0b1628",
            border: "1px solid rgba(0, 212, 255, 0.35)",
            borderRadius: "10px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 24px rgba(0, 212, 255, 0.2)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", boxSizing: "border-box" }}>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 440+ OpenRouter models..."
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.82rem",
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
              gap: "6px",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(0, 0, 0, 0.3)",
              overflowX: "auto",
              scrollbarWidth: "none",
              boxSizing: "border-box",
            }}
          >
            {[
              { id: "featured", label: "Featured" },
              { id: "free", label: `⭐ Free (${freeCount})` },
              { id: "reasoning", label: "🧠 Reasoning" },
              { id: "domain", label: "🛡 Domain" },
              { id: "fast", label: "⚡ Fast" },
              { id: "multimodal", label: "🌐 Vision" },
              { id: "all", label: `All (${allUnified.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontSize: "0.72rem",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: activeTab === tab.id ? "1px solid var(--cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: activeTab === tab.id ? "rgba(0, 212, 255, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: activeTab === tab.id ? "var(--cyan-light)" : "var(--text-muted)",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Model list items */}
          <div className="model-select-list" style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
            {filteredModels.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>
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
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(0, 212, 255, 0.12)" : "transparent",
                      border: isSelected ? "1px solid rgba(0, 212, 255, 0.35)" : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "3px",
                      transition: "background 0.1s ease",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                      {/* Top line: Label + Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                        >
                          {m.label}
                        </span>

                        {m.isFree && (
                          <span
                            style={{
                              fontSize: "0.58rem",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "var(--emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              flexShrink: 0,
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
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: "rgba(14, 165, 233, 0.15)",
                              color: "var(--cyan-light)",
                              border: "1px solid rgba(14, 165, 233, 0.3)",
                              flexShrink: 0,
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
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--amber)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              flexShrink: 0,
                            }}
                          >
                            🛡 DOMAIN
                          </span>
                        )}
                      </div>

                      {/* Subtitle: Provider, context, ID */}
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>{m.provider}</span>
                        <span style={{ flexShrink: 0, opacity: 0.5 }}>·</span>
                        {m.contextK ? (
                          <>
                            <span style={{ flexShrink: 0 }}>{m.contextK}k ctx</span>
                            <span style={{ flexShrink: 0, opacity: 0.5 }}>·</span>
                          </>
                        ) : null}
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            opacity: 0.7,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {m.id}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span style={{ color: "var(--cyan)", fontWeight: 800, fontSize: "0.9rem", flexShrink: 0 }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

"use client";

import React from "react";
import {
  INSURANCE_PLUGINS,
  type InsurancePluginId,
  type InsurancePluginDefinition,
} from "@/lib/insurance-plugins";
import type { InsuranceBenchmarkId } from "@/lib/insurance-benchmark-registry";

interface Props {
  activePluginId: InsurancePluginId;
  onSelectPlugin: (plugin: InsurancePluginDefinition) => void;
  activeDatasetId?: InsuranceBenchmarkId;
  onSelectDataset?: (datasetId: InsuranceBenchmarkId) => void;
  compact?: boolean;
  hideDetails?: boolean;
  hideHeader?: boolean;
}

export default function InsurancePluginSelector({
  activePluginId,
  onSelectPlugin,
  activeDatasetId,
  onSelectDataset,
  compact = false,
  hideDetails = false,
  hideHeader = false,
}: Props) {
  const activePlugin = INSURANCE_PLUGINS.find((p) => p.id === activePluginId) || INSURANCE_PLUGINS[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? "10px" : "14px",
        background: compact ? "transparent" : "var(--bg-surface)",
        border: compact ? "none" : "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: compact ? "0" : "16px 18px",
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🧩</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              {compact ? "Use Cases" : "Insurance Use-Case Plugins"}
            </span>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: "10px",
                background: "rgba(66, 133, 244, 0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(66, 133, 244, 0.25)",
              }}
            >
              {INSURANCE_PLUGINS.length} Available
            </span>
          </div>
          {!compact && (
            <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
              Select use case to load mapped benchmark datasets & judge metrics
            </span>
          )}
        </div>
      )}

      {/* Plugins Grid/List matching Chat Arena .gemini-extensions-list */}
      <div
        className="gemini-extensions-list"
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "8px",
        }}
      >
        {INSURANCE_PLUGINS.map((plugin) => {
          const isActive = plugin.id === activePluginId;
          return (
            <div
              key={plugin.id}
              className={`gemini-extension-row${isActive ? " active" : ""}`}
              onClick={() => onSelectPlugin(plugin)}
              style={{
                cursor: "pointer",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                borderRadius: "var(--radius-md)",
                border: isActive
                  ? "1px solid rgba(66, 133, 244, 0.45)"
                  : "1px solid var(--border-subtle)",
                background: isActive
                  ? "rgba(66, 133, 244, 0.08)"
                  : "var(--bg-surface-elevated)",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: "17px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: isActive ? "rgba(66, 133, 244, 0.15)" : "var(--bg-canvas)",
                    border: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  {plugin.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="gemini-extension-name"
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: isActive ? "var(--accent)" : "var(--text-main)",
                    }}
                  >
                    {plugin.name}
                  </div>
                  <div
                    className="gemini-extension-sub"
                    style={{
                      fontSize: "11px",
                      color: "var(--text-subtle)",
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={plugin.sub}
                  >
                    {plugin.sub}
                  </div>
                </div>
              </div>

              {/* iOS style toggle */}
              <div
                className={`arena-plugin-toggle${isActive ? " on" : ""}`}
                style={{ flexShrink: 0 }}
                title={isActive ? "Active plugin" : "Click to activate"}
              />
            </div>
          );
        })}
      </div>

      {/* Active Plugin Metrics & Dataset Details Card */}
      {!hideDetails && (
        <div
          style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Top: Dataset Mappings */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Mapped Benchmark Datasets:
              </span>
              {activePlugin.datasetIds.map((dsId, idx) => {
                const dsName = activePlugin.datasetNames[idx] || dsId;
                const isDatasetActive = !activeDatasetId || activeDatasetId === dsId;
                return (
                  <button
                    key={dsId}
                    type="button"
                    onClick={() => onSelectDataset?.(dsId)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: isDatasetActive
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border-subtle)",
                      background: isDatasetActive
                        ? "rgba(66, 133, 244, 0.15)"
                        : "var(--bg-canvas)",
                      color: isDatasetActive ? "var(--accent)" : "var(--text-subtle)",
                      cursor: onSelectDataset ? "pointer" : "default",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>📊</span>
                    <span>{dsName}</span>
                  </button>
                );
              })}
            </div>

            <span style={{ fontSize: "11px", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>⚖️</span>
              <span>LLM Judge Target Metrics (Scored 0–100)</span>
            </span>
          </div>

          {/* Bottom: Insurance Evaluation Metrics Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {activePlugin.metrics.map((metric, mIdx) => (
              <div
                key={metric.id}
                title={metric.description}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  color: "var(--emerald)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ fontSize: "9px", opacity: 0.8 }}>M{mIdx + 1}</span>
                <span>{metric.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

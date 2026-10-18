"use client";

import React, { useEffect } from "react";
import StructuredMarkdown from "../StructuredMarkdown";

interface Props {
  modelId: string;
  modelLetter: string;
  answer: string;
  reasoning?: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estCostUsd: number;
  onClose: () => void;
}

export default function ModelMaximizeModal({
  modelId,
  modelLetter,
  answer,
  reasoning,
  promptTokens,
  completionTokens,
  latencyMs,
  estCostUsd,
  onClose,
}: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const shortName = modelId.split("/").pop() || modelId;
  const wordCount = answer ? answer.trim().split(/\s+/).filter(Boolean).length : 0;
  const tps = latencyMs > 0 && completionTokens > 0 ? (completionTokens / (latencyMs / 1000)).toFixed(1) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "1000px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-elevated)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              Model {modelLetter}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
              {shortName}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
              ({modelId})
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={() => {
                if (answer) navigator.clipboard.writeText(answer);
              }}
              className="arena-header-btn"
              title="Copy response to clipboard"
            >
              Copy Response
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontSize: "18px",
                width: "32px",
                height: "32px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Quick Meta Sub-header */}
        <div
          style={{
            padding: "8px 20px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>Latency: <strong style={{ color: "var(--text-main)" }}>{(latencyMs / 1000).toFixed(2)}s</strong></span>
          <span>Tokens: <strong style={{ color: "var(--text-main)" }}>{completionTokens}</strong></span>
          {tps && <span>Speed: <strong style={{ color: "var(--text-main)" }}>{tps} t/s</strong></span>}
          <span>Words: <strong style={{ color: "var(--text-main)" }}>{wordCount}</strong></span>
          {estCostUsd > 0 && <span>Est Cost: <strong style={{ color: "var(--text-main)" }}>${estCostUsd.toFixed(5)}</strong></span>}
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {reasoning && (
            <div
              style={{
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Chain-of-Thought / Internal Reasoning
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {reasoning}
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-subtle)",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Insurance Response
            </div>
            <StructuredMarkdown content={answer || "No response generated."} />
          </div>
        </div>
      </div>
    </div>
  );
}

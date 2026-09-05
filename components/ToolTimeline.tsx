"use client";
import { useState, useEffect } from "react";

export interface ToolEvent {
  type: "call" | "result";
  name: string;
  data: string; // JSON string of args or result string
  timestamp: number;
}

interface Props {
  events: ToolEvent[];
  activeTools?: string[];
  toolChoice?: string;
  isRunning?: boolean;
}

export default function ToolTimeline({ events, activeTools = [], toolChoice = "auto", isRunning = false }: Props) {
  const [open, setOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Auto-expand whenever events arrive
  useEffect(() => {
    if (events.length > 0) {
      setOpen(true);
    }
  }, [events.length]);

  function copyEventData(idx: number, text: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  // If no events and no active tools, hide
  if (events.length === 0 && (!activeTools || activeTools.length === 0)) {
    return null;
  }

  // If no events but tools were armed
  if (events.length === 0) {
    return (
      <div className="tool-chronometer armed-only">
        <div className="tool-header" style={{ cursor: "default" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13.5px", color: "var(--cyan-light)" }}>
              Tool Execution Chronometer
            </span>
            <span className="brand-tag" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>
              {activeTools.length} Tool{activeTools.length !== 1 ? "s" : ""} Armed
            </span>
            <span className="brand-tag" style={{ fontSize: "10.5px" }}>
              Mode: {toolChoice === "auto" ? "Auto" : toolChoice === "required" ? "Required Any" : `Force (${toolChoice})`}
            </span>
          </div>
          {isRunning && <span className="live-dot" style={{ background: "var(--cyan)" }} />}
        </div>

        <div style={{ padding: "12px 18px", fontSize: "12px", color: "var(--text-subtle)", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Available to Model:</span>
            {activeTools.map((t) => (
              <span key={t} className="tool-chip" style={{ fontSize: "10px" }}>
                {t}
              </span>
            ))}
          </div>
          {!isRunning && (
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              ℹ The model resolved this prompt from internal knowledge without issuing function calls.
              To ensure tool execution, choose <strong>"Force Specific Tool"</strong> in the control station or prompt explicitly for calculations or regulatory search.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`tool-chronometer${open ? " is-open" : ""}`}>
      <div className="tool-header" onClick={() => setOpen((o) => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13.5px", color: "var(--cyan-light)" }}>
            Tool Execution Chronometer
          </span>
          <span className="brand-tag" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
          {toolChoice && toolChoice !== "auto" && (
            <span className="brand-tag" style={{ fontSize: "10.5px", color: "var(--accent-light)", borderColor: "var(--accent-border)" }}>
              {toolChoice === "required" ? "Required" : `Forced: ${toolChoice}`}
            </span>
          )}
          {isRunning && <span className="live-dot" style={{ background: "var(--cyan)" }} />}
        </div>

        <span style={{ fontSize: 12, opacity: 0.7, transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms" }}>
          ▶
        </span>
      </div>

      {open && (
        <div className="tool-event-list">
          {events.map((ev, i) => (
            <div key={i} className="tool-event-item">
              <div className={`tool-type-badge ${ev.type}`}>
                {ev.type}
              </div>

              <div className="tool-event-content">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="tool-fn-name">{ev.name}()</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)" }}>
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "10px", padding: "1px 6px" }}
                      onClick={(e) => copyEventData(i, ev.data, e)}
                    >
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <pre className="tool-payload">
                  <code>{ev.data}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

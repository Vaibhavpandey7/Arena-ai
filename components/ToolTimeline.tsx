"use client";
import { useState } from "react";

export interface ToolEvent {
  type: "call" | "result";
  name: string;
  data: string; // JSON string of args or result string
  timestamp: number;
}

interface Props {
  events: ToolEvent[];
}

export default function ToolTimeline({ events }: Props) {
  const [open, setOpen] = useState(true);

  if (events.length === 0) return null;

  return (
    <div className="tool-chronometer">
      <div className="tool-header" onClick={() => setOpen((o) => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--cyan-light)" }}>
            Tool Execution Chronometer
          </span>
          <span className="brand-tag" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)" }}>
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
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

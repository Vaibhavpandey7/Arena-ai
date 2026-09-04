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
    <div className="panel">
      <div
        className={`panel-header${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="panel-title">
          <span className="badge badge-tool">Tool calls</span>
          <span className="muted" style={{ fontSize: 11 }}>{events.length} event{events.length !== 1 ? "s" : ""}</span>
        </div>
        <span className={`chevron${open ? " open" : ""}`}>▶</span>
      </div>

      {open && (
        <div className="panel-body" style={{ padding: "8px 20px" }}>
          {events.map((ev, i) => (
            <div key={i} className="tool-event">
              <div style={{ paddingTop: 2 }}>
                {ev.type === "call" ? (
                  <span className="badge badge-tool">call</span>
                ) : (
                  <span
                    className="badge"
                    style={{ background: "var(--tool-dim)", color: "var(--good)", opacity: 0.85 }}
                  >
                    result
                  </span>
                )}
              </div>
              <div className="tool-event-body">
                <div className="tool-name">{ev.name}</div>
                <div className="tool-data">{ev.data}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";

interface Props {
  text: string;
  isRunning: boolean;
}

export default function ThinkingStream({ text, isRunning }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div
        className={`panel-header${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="panel-title">
          <span className="badge badge-reason">Reasoning</span>
          {isRunning && <span className="live-dot" />}
          {!isRunning && text && (
            <span className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              {text.length.toLocaleString()} chars
            </span>
          )}
        </div>
        <span className={`chevron${open ? " open" : ""}`}>▶</span>
      </div>

      {open && (
        <div className="panel-body">
          {!text && !isRunning && (
            <p className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
              No reasoning trace — this model does not expose a thinking stream.
            </p>
          )}
          {!text && isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-dot" />
              <p className="muted" style={{ fontSize: 12 }}>Waiting for reasoning…</p>
            </div>
          )}
          {text && (
            <div className="thinking-text">{text}</div>
          )}
        </div>
      )}
    </>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  text: string;
  isRunning: boolean;
}

export default function ThinkingStream({ text, isRunning }: Props) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as reasoning streams in
  useEffect(() => {
    if (isRunning && open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [text, isRunning, open]);

  function copyTrace(e: React.MouseEvent) {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={`neural-terminal${isRunning ? " active" : ""}`}>
      <div className="terminal-header" onClick={() => setOpen((o) => !o)}>
        <div className="terminal-title-group">
          <span className="neural-badge">Neural Reasoning Trace</span>
          {isRunning && <span className="live-dot" />}
          {text && (
            <span className="brand-tag">
              {text.length.toLocaleString()} chars
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {text && (
            <button
              className="btn-secondary"
              onClick={copyTrace}
              style={{ padding: "3px 10px", fontSize: "11px" }}
            >
              {copied ? "✓ Copied" : "Copy Trace"}
            </button>
          )}
          <span style={{ fontSize: 12, opacity: 0.7, transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms" }}>
            ▶
          </span>
        </div>
      </div>

      {open && (
        <div className="terminal-body" ref={bodyRef}>
          {!text && !isRunning && (
            <span style={{ color: "var(--text-subtle)", fontStyle: "italic" }}>
              No thinking trace available for this model run.
            </span>
          )}

          {!text && isRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
              <span className="live-dot" />
              <span>Generating chain of thought reasoning…</span>
            </div>
          )}

          {text && (
            <div>
              {text}
              {isRunning && <span className="streaming-active" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

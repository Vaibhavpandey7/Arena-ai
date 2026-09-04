"use client";
import { useState, useEffect } from "react";

interface HistoryEntry {
  prompt: string;
  systemPrompt: string;
  timestamp: number;
}

const STORAGE_KEY = "ai-arena-prompt-history";
const MAX_ENTRIES = 20;

interface Props {
  open: boolean;
  onToggle: () => void;
  onRestore: (prompt: string, systemPrompt: string) => void;
}

export function saveToHistory(prompt: string, systemPrompt: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const entry: HistoryEntry = { prompt, systemPrompt, timestamp: Date.now() };
    const deduped = existing.filter(
      (e) => e.prompt !== prompt || e.systemPrompt !== systemPrompt
    );
    const updated = [entry, ...deduped].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function PromptHistorySidebar({ open, onToggle, onRestore }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
  }, [open]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function clearHistory() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setHistory([]);
  }

  return (
    <>
      <button
        className="btn-ghost"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left" }}
      >
        {open ? "▼" : "▶"} History ({history.length})
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {history.length === 0 && (
            <p className="empty-state">No prompt history yet.</p>
          )}
          {history.map((entry, i) => (
            <div
              key={i}
              className="history-item"
              onClick={() => onRestore(entry.prompt, entry.systemPrompt)}
            >
              <div className="history-prompt">{entry.prompt}</div>
              <div className="history-time">{formatTime(entry.timestamp)}</div>
            </div>
          ))}
          {history.length > 0 && (
            <div style={{ padding: "6px 10px" }}>
              <button className="btn-ghost" onClick={clearHistory} style={{ fontSize: 11 }}>
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

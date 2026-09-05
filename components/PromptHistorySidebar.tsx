"use client";
import { useState, useEffect } from "react";

export interface HistoryEntry {
  prompt: string;
  systemPrompt: string;
  timestamp: number;
}

const STORAGE_KEY = "ai-arena-prompt-history";
const MAX_ENTRIES = 25;

interface Props {
  open: boolean;
  onClose: () => void;
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

export default function PromptHistorySidebar({ open, onClose, onRestore }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");

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
      " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function clearHistory() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setHistory([]);
  }

  if (!open) return null;

  const filtered = history.filter((h) =>
    h.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="history-drawer-backdrop" onClick={onClose}>
      <div className="history-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="drawer-title">Prompt History</div>
            <span className="brand-tag">{history.length}</span>
          </div>
          <button className="icon-button" onClick={onClose} title="Close drawer">
            ✕
          </button>
        </div>

        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
          <input
            id="history-search-input"
            name="historySearch"
            type="text"
            className="history-search-input"
            placeholder="Search past prompts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="drawer-content">
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-subtle)" }}>
              {history.length === 0 ? "No prompts saved yet." : "No matching prompts found."}
            </div>
          )}

          {filtered.map((entry, i) => (
            <div
              key={i}
              className="history-card"
              onClick={() => {
                onRestore(entry.prompt, entry.systemPrompt);
                onClose();
              }}
            >
              <div className="history-prompt-text">{entry.prompt}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span className="history-time-stamp">{formatTime(entry.timestamp)}</span>
                {entry.systemPrompt && (
                  <span className="brand-tag" style={{ fontSize: 10 }}>+ System Prompt</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-secondary" onClick={clearHistory}>
              Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

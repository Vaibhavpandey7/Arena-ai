"use client";
import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";
import ModelSelector from "@/components/ModelSelector";
import ThinkingStream from "@/components/ThinkingStream";
import ToolTimeline, { ToolEvent } from "@/components/ToolTimeline";
import ComparisonTable, { CompareRow } from "@/components/ComparisonTable";
import DatasetBrowser from "@/components/DatasetBrowser";
import PromptHistorySidebar, { saveToHistory } from "@/components/PromptHistorySidebar";

type Mode = "single" | "compare";

export default function Page() {
  const [mode, setMode] = useState<Mode>("single");
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [useTools, setUseTools] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modelSystemPrompts, setModelSystemPrompts] = useState<Record<string, string>>({});

  const [isRunning, setIsRunning] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [usage, setUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_cost_usd: number } | null>(null);
  const [error, setError] = useState("");

  const [compareResults, setCompareResults] = useState<CompareRow[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const runSingle = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    const model = selectedModels[0];
    saveToHistory(prompt, systemPrompt);
    setIsRunning(true);
    setReasoning(""); setAnswer(""); setToolEvents([]); setUsage(null); setError("");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, systemPrompt, useTools }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) { setError(`Request failed: ${res.status}`); setIsRunning(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(data); } catch { continue; }
          switch (event.type) {
            case "reasoning": setReasoning((p) => p + (event.delta as string)); break;
            case "content":   setAnswer((p) => p + (event.delta as string)); break;
            case "tool_call":
              setToolEvents((p) => [...p, { type: "call", name: String(event.name), data: JSON.stringify(event.args, null, 2), timestamp: Date.now() }]);
              break;
            case "tool_result":
              setToolEvents((p) => [...p, { type: "result", name: String(event.name), data: String(event.result), timestamp: Date.now() }]);
              break;
            case "usage": setUsage(event.usage as typeof usage); break;
            case "error":  setError(String(event.error)); break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, [prompt, systemPrompt, useTools, selectedModels]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const runCompare = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    saveToHistory(prompt, systemPrompt);
    setIsComparing(true); setCompareResults([]); setCompareError("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: selectedModels, prompt, systemPrompt, useTools, modelSystemPrompts }),
      });
      const data = await res.json();
      if (!res.ok) setCompareError(data.error ?? "Compare failed");
      else setCompareResults(data.results ?? []);
    } catch (err) {
      setCompareError((err as Error).message);
    } finally {
      setIsComparing(false);
    }
  }, [prompt, systemPrompt, useTools, selectedModels, modelSystemPrompts]);

  const handleRun = mode === "single" ? (isRunning ? stopRun : runSingle) : runCompare;
  const runLabel = mode === "single" ? (isRunning ? "Stop" : "Run") : (isComparing ? "Running…" : "Compare");
  const isDisabled = !prompt.trim() || selectedModels.length === 0 || (mode === "compare" && isComparing);
  const latestModelAnswer = mode === "single" ? answer : (compareResults.find((r) => r.ok)?.answer ?? "");
  const hasResults = answer || compareResults.length > 0 || error || compareError || isRunning || isComparing;

  return (
    <div className="layout">

      {/* ── Left control rail ──────────────────────────────────────────── */}
      <aside className="rail">

        {/* Header */}
        <div className="rail-header">
          <div>
            <div className="rail-logo">AI Arena</div>
            <div className="rail-logo-sub">OpenRouter · Insurance Pipeline</div>
          </div>
          <ThemeToggle />
        </div>

        {/* Mode selector */}
        <div className="rail-section">
          <div className="rail-label">Mode</div>
          <div className="mode-tabs">
            <button className={`mode-tab${mode === "single" ? " active" : ""}`} onClick={() => setMode("single")}>
              Single
            </button>
            <button className={`mode-tab${mode === "compare" ? " active" : ""}`} onClick={() => setMode("compare")}>
              Compare
            </button>
          </div>
        </div>

        {/* Prompt */}
        <div className="rail-section">
          <div className="rail-label">Prompt</div>
          <textarea
            id="prompt-input"
            rows={6}
            placeholder="What do you want to know?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isDisabled) handleRun();
            }}
          />
          <div className="muted" style={{ fontSize: 10, marginTop: 5, textAlign: "right" }}>⌘↵ to run</div>
        </div>

        {/* System prompt */}
        <div className="rail-section">
          <div className="rail-label">System prompt</div>
          <textarea
            id="system-prompt-input"
            rows={2}
            placeholder="Optional system instructions…"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>

        {/* Tools toggle */}
        <div className="rail-section">
          <div className="toggle-row">
            <span className="toggle-label">Allow tool use</span>
            <label className="toggle">
              <input type="checkbox" checked={useTools} onChange={(e) => setUseTools(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
          {useTools && (
            <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span className="badge badge-tool">calculator</span>
              <span className="badge badge-tool">get_current_time</span>
              <span className="badge badge-tool">insurance_search</span>
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="rail-section">
          <div className="rail-label">
            {mode === "single" ? "Model" : "Models — select up to 4"}
          </div>
          <ModelSelector mode={mode} selected={selectedModels} onChange={setSelectedModels} />
        </div>

        {/* Run button */}
        <div className="rail-section">
          <button
            id="run-button"
            className={`btn-primary${isRunning ? " running" : ""}`}
            onClick={handleRun}
            disabled={isDisabled}
          >
            {runLabel}
          </button>
          {selectedModels.length === 0 && (
            <p className="muted" style={{ fontSize: 11, marginTop: 7, textAlign: "center" }}>
              Select a model above
            </p>
          )}
        </div>

        {/* Prompt history */}
        <div className="rail-section" style={{ flex: 1 }}>
          <PromptHistorySidebar
            open={historyOpen}
            onToggle={() => setHistoryOpen((o) => !o)}
            onRestore={(p, sp) => { setPrompt(p); setSystemPrompt(sp); setHistoryOpen(false); }}
          />
        </div>
      </aside>

      {/* ── Right content area ────────────────────────────────────────── */}
      <main className="content-area">

        {/* Empty state */}
        {!hasResults && (
          <div className="content-empty">
            <div className="content-empty-logo">⚡</div>
            <div className="content-empty-title">AI Arena</div>
            <div className="content-empty-sub">
              Run any prompt against the world's best LLMs. Stream reasoning traces, watch tool calls live, and compare models side by side.
            </div>
            <div className="feature-chips">
              <span className="feature-chip"><span className="accent">◈</span> Reasoning traces</span>
              <span className="feature-chip"><span className="tool-color">⟳</span> Live tool calls</span>
              <span className="feature-chip"><span className="good">≡</span> Side-by-side compare</span>
              <span className="feature-chip"><span className="muted">◎</span> Insurance data pipeline</span>
            </div>
          </div>
        )}

        {/* ── Single-run results ─────────────────────────────────────── */}
        {mode === "single" && (
          <>
            {/* Running banner */}
            {isRunning && !reasoning && !answer && (
              <div className="running-banner">
                <span className="live-dot" />
                <div>
                  <div className="running-banner-text">Waiting for response…</div>
                  <div className="running-banner-model">{selectedModels[0]}</div>
                </div>
              </div>
            )}

            {/* Reasoning trace */}
            {(reasoning || (isRunning && !answer)) && (
              <div className={isRunning ? "panel panel-active panel-glow-amber" : "panel"}>
                <ThinkingStream text={reasoning} isRunning={isRunning} />
              </div>
            )}

            {/* Tool timeline */}
            {toolEvents.length > 0 && (
              <div className="panel-glow-blue" style={{ borderBottom: "1px solid var(--border)" }}>
                <ToolTimeline events={toolEvents} />
              </div>
            )}

            {/* Answer */}
            {(answer || (isRunning && reasoning)) && (
              <div className={`panel${isRunning ? " panel-active" : ""}`}>
                <div className="panel-header open">
                  <div className="panel-title">
                    <span className="badge badge-muted">Answer</span>
                    {isRunning && <span className="live-dot" />}
                    {!isRunning && answer && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        {answer.split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                  </div>
                  <span className="model-pill">{selectedModels[0]}</span>
                </div>
                <div className="panel-body">
                  {error && <div className="error-banner" style={{ marginBottom: 12 }}>⚠ {error}</div>}
                  <div className={`answer-content${isRunning && !answer.endsWith(" ") ? " streaming-cursor" : ""}`}>
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                </div>
                {usage && (
                  <div className="usage-row">
                    <span>↑ {usage.prompt_tokens.toLocaleString()} tok</span>
                    <span>↓ {usage.completion_tokens.toLocaleString()} tok</span>
                    {usage.total_cost_usd > 0 && (
                      <span>
                        $ {usage.total_cost_usd < 0.0001
                          ? usage.total_cost_usd.toExponential(2)
                          : usage.total_cost_usd.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error with no answer */}
            {error && !answer && !isRunning && (
              <div style={{ padding: 20 }}>
                <div className="error-banner">⚠ {error}</div>
              </div>
            )}
          </>
        )}

        {/* ── Compare results ────────────────────────────────────────── */}
        {mode === "compare" && (
          <>
            {isComparing && (
              <div className="running-banner">
                <span className="live-dot" />
                <div>
                  <div className="running-banner-text">
                    Running {selectedModels.length} models in parallel…
                  </div>
                  <div className="running-banner-model">{selectedModels.join(" · ")}</div>
                </div>
              </div>
            )}

            {compareError && (
              <div style={{ padding: 20 }}>
                <div className="error-banner">⚠ {compareError}</div>
              </div>
            )}

            {compareResults.length > 0 && (
              <div className="panel">
                <div className="panel-header open">
                  <div className="panel-title">
                    <span className="badge badge-muted">Comparison</span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {compareResults.filter((r) => r.ok).length}/{compareResults.length} succeeded
                    </span>
                  </div>
                </div>
                <ComparisonTable
                  results={compareResults}
                  modelSystemPrompts={modelSystemPrompts}
                  onSystemPromptChange={(model, value) =>
                    setModelSystemPrompts((prev) => ({ ...prev, [model]: value }))
                  }
                />
              </div>
            )}
          </>
        )}

        {/* Dataset browser — always at the bottom */}
        <DatasetBrowser onLoadRecord={(p) => setPrompt(p)} modelAnswer={latestModelAnswer} />

        {/* Bottom padding */}
        <div style={{ height: 32 }} />
      </main>
    </div>
  );
}

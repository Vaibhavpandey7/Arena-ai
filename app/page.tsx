"use client";
import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";
import ModelSelector from "@/components/ModelSelector";
import ThinkingStream from "@/components/ThinkingStream";
import ToolTimeline, { ToolEvent } from "@/components/ToolTimeline";
import ComparisonTable, { CompareRow } from "@/components/ComparisonTable";
import DatasetBrowser, { DILRecord } from "@/components/DatasetBrowser";
import PromptHistorySidebar, { saveToHistory } from "@/components/PromptHistorySidebar";
import ToolSandboxModal from "@/components/ToolSandboxModal";

type ViewMode = "single" | "compare" | "dataset";

const SUGGESTIONS = [
  { domain: "Actuarial", text: "Calculate the pure premium and risk margin for a property portfolio with expected loss ratio of 68% and €12.5M earned premium." },
  { domain: "Solvency II", text: "Explain the difference between Solvency Capital Requirement (SCR) and Minimum Capital Requirement (MCR) under EU Solvency II Pillar 1." },
  { domain: "Reasoning", text: "Analyze whether an insurer can exercise subrogation rights against a co-insured party under standard commercial property coverage." },
  { domain: "Tool Math", text: "Use the calculator tool to compute: (145000 * 0.045) + (230000 * 0.038) / 12 and explain the monthly reserve implication." },
  { domain: "Compliance", text: "What are the mandatory elements of the Own Risk and Solvency Assessment (ORSA) report required by EIOPA guidelines?" }
];

export default function Page() {
  const [mode, setMode] = useState<ViewMode>("single");
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [useTools, setUseTools] = useState(true);
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "calculator",
    "solvency_ratio_checker",
    "insurance_knowledge_search",
    "currency_converter",
    "get_current_time",
  ]);
  const [toolChoice, setToolChoice] = useState<string>("auto");
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(["deepseek/deepseek-r1"]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modelSystemPrompts, setModelSystemPrompts] = useState<Record<string, string>>({});

  const handleModelChange = useCallback((ids: string[]) => {
    setSelectedModels(ids);
  }, []);

  const [isRunning, setIsRunning] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const [answer, setAnswer] = useState("");
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [usage, setUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_cost_usd: number } | null>(null);
  const [error, setError] = useState("");

  const [compareResults, setCompareResults] = useState<CompareRow[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [customEndpoints, setCustomEndpoints] = useState<Record<string, { baseUrl: string; apiKey?: string }>>({});

  const [activeRecord, setActiveRecord] = useState<DILRecord | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const answerPanelRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);

  const runSingle = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    const model = selectedModels[0];
    const customEndpoint = customEndpoints[model];
    saveToHistory(prompt, systemPrompt);
    setIsRunning(true);
    setReasoning("");
    setAnswer("");
    setToolEvents([]);
    setUsage(null);
    setError("");
    hasScrolledRef.current = false;
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          systemPrompt,
          useTools,
          selectedTools,
          toolChoice,
          customEndpoint,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setError(`Inference request failed with status: ${res.status}`);
        setIsRunning(false);
        return;
      }

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
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }

          switch (event.type) {
            case "reasoning":
              setReasoning((prev) => prev + (event.delta as string));
              break;
            case "content":
              setAnswer((prev) => prev + (event.delta as string));
              if (!hasScrolledRef.current) {
                hasScrolledRef.current = true;
                setTimeout(() => {
                  answerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 40);
              }
              break;
            case "tool_call":
              setToolEvents((prev) => [
                ...prev,
                {
                  type: "call",
                  name: String(event.name),
                  data: JSON.stringify(event.args, null, 2),
                  timestamp: Date.now(),
                },
              ]);
              break;
            case "tool_result":
              setToolEvents((prev) => [
                ...prev,
                {
                  type: "result",
                  name: String(event.name),
                  data: String(event.result),
                  timestamp: Date.now(),
                },
              ]);
              break;
            case "usage":
              setUsage(event.usage as typeof usage);
              break;
            case "error":
              setError(String(event.error));
              break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setIsRunning(false);
    }
  }, [prompt, systemPrompt, useTools, selectedTools, toolChoice, selectedModels, customEndpoints]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const runCompare = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    saveToHistory(prompt, systemPrompt);
    setIsComparing(true);
    setCompareResults([]);
    setCompareError("");

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          models: selectedModels,
          prompt,
          systemPrompt,
          useTools,
          selectedTools,
          toolChoice,
          modelSystemPrompts,
          modelCustomEndpoints: customEndpoints,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCompareError(data.error ?? "Compare benchmark failed");
      } else {
        setCompareResults(data.results ?? []);
      }
    } catch (err) {
      setCompareError((err as Error).message);
    } finally {
      setIsComparing(false);
    }
  }, [prompt, systemPrompt, useTools, selectedModels, modelSystemPrompts, customEndpoints]);

  const exportSingleBenchmark = useCallback((format: "csv" | "json") => {
    if (!answer) return;
    const download = (content: string, filename: string, mime: string) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content], { type: mime }));
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    };

    const model = selectedModels[0] ?? "unknown-model";
    const ts = new Date().toISOString();

    if (format === "json") {
      const payload = {
        exportedAt: ts,
        model,
        prompt,
        systemPrompt: systemPrompt || undefined,
        answer,
        usage: usage || null,
        groundTruth: activeRecord ? {
          id: activeRecord.id,
          domain: activeRecord.domain,
          split: activeRecord.split,
          difficulty: activeRecord.difficulty,
          quality_score: activeRecord.quality_score,
          question: activeRecord.question,
          context: activeRecord.context,
          gold_response: activeRecord.response,
          evidence: activeRecord.evidence,
        } : null,
      };
      const filename = activeRecord ? `benchmark-${activeRecord.id}-${model.split("/").pop()}.json` : `evaluation-${model.split("/").pop()}.json`;
      download(JSON.stringify(payload, null, 2), filename, "application/json");
    } else {
      const headers = [
        "record_id",
        "domain",
        "split",
        "model",
        "question",
        "model_answer",
        "gold_response",
        "gold_quality_score",
        "evidence",
        "prompt_tokens",
        "completion_tokens",
        "est_cost_usd",
        "timestamp"
      ];
      const row = [
        activeRecord?.id ?? "N/A",
        activeRecord?.domain ?? "custom",
        activeRecord?.split ?? "N/A",
        model,
        activeRecord?.question ?? prompt,
        answer,
        activeRecord?.response ?? "N/A",
        activeRecord?.quality_score !== undefined ? (activeRecord.quality_score * 100).toFixed(0) + "%" : "N/A",
        activeRecord?.evidence ?? "N/A",
        usage?.prompt_tokens ?? "",
        usage?.completion_tokens ?? "",
        usage?.total_cost_usd ?? "",
        ts
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",");

      const filename = activeRecord ? `benchmark-${activeRecord.id}-${model.split("/").pop()}.csv` : `evaluation-${model.split("/").pop()}.csv`;
      download([headers.join(","), row].join("\n"), filename, "text/csv");
    }
  }, [answer, selectedModels, prompt, systemPrompt, usage, activeRecord]);

  const handleRun = mode === "single" ? (isRunning ? stopRun : runSingle) : runCompare;
  const isExecuting = isRunning || isComparing;
  const isDisabled = !prompt.trim() || selectedModels.length === 0 || (mode === "compare" && isComparing);
  const latestModelAnswer = mode === "single" ? answer : (compareResults.find((r) => r.ok)?.answer ?? "");
  const hasResults = answer || compareResults.length > 0 || error || compareError || isRunning || isComparing;

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>

      {/* Top Floating Glass Navbar */}
      <header className="top-navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <div className="brand-section" onClick={() => setMode("single")}>
            <div className="brand-badge">AI</div>
            <div>
              <div className="brand-name">AI Arena</div>
            </div>
            <span className="brand-tag">v3.0</span>
          </div>

          {/* Central Segmented Navigation Tabs */}
          <nav className="nav-tab-deck">
            <button
              className={`nav-tab${mode === "single" ? " active" : ""}`}
              onClick={() => setMode("single")}
            >
              <span>Single Arena</span>
            </button>
            <button
              className={`nav-tab${mode === "compare" ? " active" : ""}`}
              onClick={() => setMode("compare")}
            >
              <span>Head-to-Head</span>
            </button>
            <button
              className={`nav-tab${mode === "dataset" ? " active" : ""}`}
              onClick={() => setMode("dataset")}
            >
              <span>Data Lake</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="navbar-actions">
            <div className="status-pill">
              <span className="live-dot" />
              <span className="status-pill-text">OpenRouter Live</span>
            </div>

            <button
              className="icon-button"
              onClick={() => setHistoryOpen(true)}
              title="View prompt history"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="app-container">
        {/* Command Deck (Prompt Console) — visible in Single & Compare modes */}
        {mode !== "dataset" && (
          <section className="command-deck">
            <div className="command-header">
              <div className="command-title-group">
                <span className="command-title">
                  {mode === "single" ? "Prompt Execution Console" : "Benchmark Prompt Console"}
                </span>
                <span className="mode-badge">
                  {mode === "single" ? "1 Model Streaming" : `Parallel (${selectedModels.length} Models)`}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="kbd-shortcut hide-on-mobile">⌘ + Enter to run</span>
              </div>
            </div>

            {/* Quick Inspiration Carousel */}
            <div className="suggestion-carousel">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-pill"
                  onClick={() => setPrompt(s.text)}
                >
                  <span className="pill-domain">{s.domain}</span>
                  <span>{s.text.slice(0, 60)}…</span>
                </button>
              ))}
            </div>

            {/* Prompt Input Box */}
            <div className="prompt-box-wrapper">
              <textarea
                id="prompt-input"
                name="prompt"
                className="main-prompt-input"
                rows={4}
                placeholder="Enter an insurance question, actuarial calculation, or regulatory inquiry…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isDisabled) {
                    handleRun();
                  }
                }}
              />

              {/* Optional System Prompt Accordion */}
              <div>
                <button
                  className="system-prompt-toggle"
                  onClick={() => setShowSystemPrompt((prev) => !prev)}
                >
                  <span>{showSystemPrompt ? "▼" : "▶"}</span>
                  <span>{showSystemPrompt ? "Hide system prompt" : "+ Add system prompt instructions"}</span>
                </button>

                {showSystemPrompt && (
                  <textarea
                    id="system-prompt-input"
                    name="systemPrompt"
                    className="system-prompt-input"
                    rows={2}
                    placeholder="Provide specific system role or behavioral instructions (e.g. You are a senior EU insurance actuary)…"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Command Deck Footer Controls */}
            <div className="command-footer">
              <div className="footer-left-controls">
                {/* Advanced Tool Control Station */}
                <div className="tool-control-station">
                  <div className="tool-master-toggle">
                    <span className="switch-label">Tools</span>
                    <label className="toggle-switch" title="Toggle tool calling for models">
                      <input
                        type="checkbox"
                        checked={useTools}
                        onChange={(e) => setUseTools(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {useTools && (
                    <>
                      {/* Granular Tool Toggles */}
                      <div className="tool-select-chips">
                        {[
                          { id: "calculator", label: "Calculator", icon: "🧮" },
                          { id: "solvency_ratio_checker", label: "Solvency II", icon: "⚖️" },
                          { id: "insurance_knowledge_search", label: "Search Lake", icon: "🔍" },
                          { id: "currency_converter", label: "Currency", icon: "💱" },
                          { id: "get_current_time", label: "Time", icon: "⏱️" },
                        ].map((t) => {
                          const isChecked = selectedTools.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={`tool-chip-toggle${isChecked ? " active" : ""}`}
                              onClick={() => {
                                if (isChecked) {
                                  if (selectedTools.length > 1) {
                                    setSelectedTools(selectedTools.filter((id) => id !== t.id));
                                    if (toolChoice === t.id) setToolChoice("auto");
                                  }
                                } else {
                                  setSelectedTools([...selectedTools, t.id]);
                                }
                              }}
                              title={isChecked ? `Disable ${t.label}` : `Enable ${t.label}`}
                            >
                              <span>{t.icon}</span>
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Execution Policy Dropdown */}
                      <div className="tool-mode-dropdown-wrapper">
                        <span style={{ fontSize: 11, color: "var(--text-subtle)", whiteSpace: "nowrap" }}>Mode:</span>
                        <select
                          className="tool-mode-select"
                          value={toolChoice}
                          onChange={(e) => setToolChoice(e.target.value)}
                          title="Tool execution policy"
                        >
                          <option value="auto">Auto (Model Decides)</option>
                          <option value="required">Required (Must Call Tool)</option>
                          <optgroup label="Force Specific Tool">
                            {selectedTools.map((tid) => (
                              <option key={tid} value={tid}>
                                Force: {tid}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Direct Sandbox Modal Trigger */}
                  <button
                    type="button"
                    className="btn-secondary sandbox-launch-btn"
                    onClick={() => setSandboxOpen(true)}
                    title="Test tools directly without invoking an LLM"
                  >
                    <span>⚡ Tool Sandbox</span>
                  </button>
                </div>

                <div className="char-counter hide-on-mobile">
                  {prompt.length} chars
                </div>
              </div>

              <div className="footer-right-actions">
                <button
                  id="run-button"
                  className={`btn-execute${isRunning ? " running" : ""}`}
                  onClick={handleRun}
                  disabled={isDisabled}
                >
                  {isRunning ? (
                    <>
                      <span className="live-dot" style={{ background: "#fff" }} />
                      <span>Stop Execution</span>
                    </>
                  ) : isComparing ? (
                    <>
                      <span className="live-dot" style={{ background: "#fff" }} />
                      <span>Running Arena…</span>
                    </>
                  ) : mode === "single" ? (
                    <>
                      <span>Run Model</span>
                      <span>↵</span>
                    </>
                  ) : (
                    <>
                      <span>Compare {selectedModels.length} Models</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Model Selection Deck */}
        {mode !== "dataset" && (
          <ModelSelector
            mode={mode}
            selected={selectedModels}
            onChange={handleModelChange}
            onCustomEndpointsChange={setCustomEndpoints}
          />
        )}

        {/* ── Single Model Results Workspace ───────────────────────────── */}
        {mode === "single" && (
          <div className="bento-workspace">
            {/* Empty Hero Card when no results yet */}
            {!hasResults && (
              <div className="empty-hero-card">
                <h1 className="empty-title">AI Arena Intelligence Studio</h1>
                <p className="empty-desc">
                  Select a state-of-the-art model above and run complex insurance inquiries. Inspect reasoning traces in real time, observe autonomous tool invocations, and benchmark performance.
                </p>
                <div className="empty-feature-grid">
                  <span className="feature-pill">DeepSeek R1 Reasoning</span>
                  <span className="feature-pill">Live Tool Call Chronometer</span>
                  <span className="feature-pill">38 DIL Insurance Records</span>
                  <span className="feature-pill">Real-time SSE Streaming</span>
                </div>
              </div>
            )}

            {/* Waiting status bar */}
            {isRunning && !reasoning && !answer && (
              <div className="running-status-bar">
                <div className="running-left">
                  <span className="live-dot" />
                  <div>
                    <div className="running-text">Awaiting model stream generation…</div>
                    <div className="running-model">{selectedModels[0]}</div>
                  </div>
                </div>
                <button className="btn-secondary" onClick={stopRun} style={{ fontSize: 11 }}>
                  Cancel
                </button>
              </div>
            )}

            {/* Live Neural Reasoning Stream */}
            {(reasoning || (isRunning && !answer)) && (
              <ThinkingStream text={reasoning} isRunning={isRunning} />
            )}

            {/* Tool Chronometer */}
            {(toolEvents.length > 0 || useTools) && (
              <ToolTimeline
                events={toolEvents}
                activeTools={useTools ? selectedTools : []}
                toolChoice={toolChoice}
                isRunning={isRunning}
              />
            )}

            {/* Answer Card */}
            {(answer || isRunning) && (
              <div className="answer-panel" ref={answerPanelRef}>
                <div className="answer-header">
                  <div className="answer-title-group">
                    <span className="answer-badge">Inference Output</span>
                    {isRunning && <span className="live-dot" />}
                    {!isRunning && answer && (
                      <span className="brand-tag">
                        {answer.split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                  </div>
                  <span className="model-source-pill">{selectedModels[0]}</span>
                </div>

                <div className="answer-body">
                  {error && (
                    <div style={{ color: "var(--rose)", background: "var(--rose-dim)", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px" }}>
                      ⚠ {error}
                    </div>
                  )}
                  <div className={isRunning && !answer.endsWith(" ") ? "streaming-active" : ""}>
                    {answer ? (
                      <ReactMarkdown>{answer}</ReactMarkdown>
                    ) : isRunning ? (
                      <div style={{ color: "var(--text-subtle)", fontStyle: "italic", display: "flex", alignItems: "center", gap: 8, fontSize: "13px", padding: "8px 0" }}>
                        <span className="live-dot" /> Generating output…
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="answer-telemetry-bar">
                  <div className="telemetry-metrics">
                    {usage ? (
                      <>
                        <div className="metric-pill">
                          <span>Prompt:</span>
                          <span className="metric-val">{usage.prompt_tokens.toLocaleString()} tok</span>
                        </div>
                        <div className="metric-pill">
                          <span>Completion:</span>
                          <span className="metric-val">{usage.completion_tokens.toLocaleString()} tok</span>
                        </div>
                        {usage.total_cost_usd > 0 && (
                          <div className="metric-pill">
                            <span>Est. Cost:</span>
                            <span className="metric-val" style={{ color: "var(--emerald)" }}>
                              ${usage.total_cost_usd < 0.0001
                                ? usage.total_cost_usd.toExponential(2)
                                : usage.total_cost_usd.toFixed(4)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="metric-pill">
                        <span>Status:</span>
                        <span className="metric-val">{isRunning ? "Generating…" : "Complete"}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => exportSingleBenchmark("csv")}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      disabled={!answer}
                      title="Export evaluation results to CSV with ground truth"
                    >
                      Export CSV
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => exportSingleBenchmark("json")}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      disabled={!answer}
                      title="Export evaluation results to JSON with ground truth"
                    >
                      Export JSON
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => navigator.clipboard.writeText(answer)}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      disabled={!answer}
                    >
                      Copy Output
                    </button>
                  </div>
                </div>

                {/* Ground Truth Evaluation Deck when Data Lake record is active */}
                {activeRecord && (
                  <div className="ground-truth-panel">
                    <div className="gt-panel-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span className="brand-tag" style={{ background: "var(--accent-dim)", color: "var(--accent)", borderColor: "var(--accent-border)", fontWeight: 700 }}>
                          Data Lake Ground Truth
                        </span>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          {activeRecord.id}
                        </span>
                        <span className="brand-tag">{activeRecord.domain.replace(/_/g, " ")}</span>
                        <span className="quality-badge">{(activeRecord.quality_score * 100).toFixed(0)}% Gold Quality</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          className="btn-secondary"
                          onClick={() => setMode("dataset")}
                          style={{ fontSize: 11, padding: "4px 10px" }}
                        >
                          View in Data Lake
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setActiveRecord(null)}
                          style={{ fontSize: 11, padding: "4px 8px" }}
                          title="Unlink ground truth record"
                        >
                          ✕ Unlink
                        </button>
                      </div>
                    </div>

                    <div className="gt-panel-body">
                      <div className="gt-side-by-side">
                        <div className="gt-col">
                          <div className="gt-col-title">
                            <span>Verified Gold Standard Response</span>
                            <span className="quality-badge">Verified Expert</span>
                          </div>
                          <div className="gt-col-text">
                            {activeRecord.response}
                          </div>
                          {activeRecord.evidence && (
                            <div className="gt-evidence-box">
                              <span style={{ fontWeight: 700, color: "var(--text-subtle)", fontSize: 11, textTransform: "uppercase" }}>Regulatory Evidence:</span>{" "}
                              <span style={{ fontStyle: "italic" }}>"{activeRecord.evidence}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional quick link if no ground truth is active */}
                {!activeRecord && answer && !isRunning && (
                  <div className="gt-link-prompt" onClick={() => setMode("dataset")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="brand-tag" style={{ background: "var(--cyan-dim)", color: "var(--cyan-light)", borderColor: "var(--cyan-border)" }}>
                        Data Lake Benchmark
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Compare this model output against 38 verified gold standard records in the Data Lake.
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                      Open Data Lake ↵
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error banner if failed without answer */}
            {error && !answer && !isRunning && (
              <div style={{ color: "var(--rose)", background: "var(--rose-dim)", padding: "16px 20px", borderRadius: "12px", border: "1px solid rgba(244,63,94,0.3)" }}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* ── Head-to-Head Compare Workspace ───────────────────────────── */}
        {mode === "compare" && (
          <div className="bento-workspace">
            {isComparing && (
              <div className="running-status-bar">
                <div className="running-left">
                  <span className="live-dot" />
                  <div>
                    <div className="running-text">
                      Evaluating {selectedModels.length} models in parallel…
                    </div>
                    <div className="running-model">{selectedModels.join(" · ")}</div>
                  </div>
                </div>
              </div>
            )}

            {compareError && (
              <div style={{ color: "var(--rose)", background: "var(--rose-dim)", padding: "16px 20px", borderRadius: "12px", border: "1px solid rgba(244,63,94,0.3)" }}>
                ⚠ {compareError}
              </div>
            )}

            {compareResults.length > 0 && (
              <ComparisonTable
                results={compareResults}
                modelSystemPrompts={modelSystemPrompts}
                onSystemPromptChange={(model, value) =>
                  setModelSystemPrompts((prev) => ({ ...prev, [model]: value }))
                }
                activeRecord={activeRecord}
              />
            )}
          </div>
        )}

        {/* ── Insurance Data Lake Studio Workspace ─────────────────────── */}
        {mode === "dataset" && (
          <DatasetBrowser
            onLoadRecord={(p, record) => {
              setPrompt(p);
              if (record) setActiveRecord(record);
              setMode("single");
            }}
            modelAnswer={latestModelAnswer}
            activeRecord={activeRecord}
            onSelectRecord={(rec) => setActiveRecord(rec)}
          />
        )}
      </main>

      {/* Slide-over Prompt History Drawer */}
      <PromptHistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={(p, sp) => {
          setPrompt(p);
          setSystemPrompt(sp);
          if (sp) setShowSystemPrompt(true);
        }}
      />

      {/* Direct Manual Tool Sandbox Modal */}
      <ToolSandboxModal
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
        onSendToPrompt={(text) => {
          setPrompt(text);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

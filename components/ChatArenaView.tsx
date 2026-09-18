"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ModelSelectWidget from "./ModelSelectWidget";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const MODELS = [
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", mode: "reasoning" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", mode: "reasoning" },
  { id: "openai/gpt-4o", label: "GPT-4o", mode: "fast" },
  { id: "anthropic/claude-3-5-sonnet", label: "Claude Sonnet 3.5", mode: "fast" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", mode: "fast" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", mode: "fast" },
  { id: "qwen/qwq-32b", label: "QwQ 32B", mode: "reasoning" },
  { id: "mistralai/mistral-large-2407", label: "Mistral Large", mode: "fast" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3", mode: "fast" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", mode: "fast" },
];

interface PluginDef {
  id: string;
  icon: string;
  name: string;
  sub: string;
  connections: { type: "db" | "web" | "mail" | "agent"; label: string }[];
}

const PLUGINS: PluginDef[] = [
  {
    id: "premium-calculator",
    icon: "🧮",
    name: "Premium Calculator",
    sub: "Pure premium & risk margin",
    connections: [
      { type: "db", label: "Rate DB" },
      { type: "web", label: "Dashboard" },
    ],
  },
  {
    id: "solvency-ii-checker",
    icon: "⚖️",
    name: "Solvency II Checker",
    sub: "SCR / MCR compliance",
    connections: [
      { type: "web", label: "EIOPA Portal" },
      { type: "web", label: "Dashboard" },
    ],
  },
  {
    id: "policy-extractor",
    icon: "📄",
    name: "Policy Extractor",
    sub: "Structured clause extraction",
    connections: [
      { type: "db", label: "Policy Lake" },
      { type: "mail", label: "Email Agent" },
    ],
  },
  {
    id: "eiopa-search",
    icon: "🔍",
    name: "EIOPA Guidelines Search",
    sub: "Regulatory knowledge base",
    connections: [
      { type: "web", label: "EIOPA Site" },
      { type: "db", label: "Reg DB" },
    ],
  },
  {
    id: "fx-converter",
    icon: "💱",
    name: "FX Converter",
    sub: "Multi-currency conversion",
    connections: [{ type: "web", label: "FX Feed" }],
  },
  {
    id: "fraud-signal",
    icon: "🕵️",
    name: "Fraud Signal Checker",
    sub: "CFIT / SIU signal matrix",
    connections: [
      { type: "db", label: "Claims Intel" },
      { type: "agent", label: "SIU Agent" },
    ],
  },
  {
    id: "actuarial-tables",
    icon: "📐",
    name: "Actuarial Tables",
    sub: "Ogden / mortality / dev factors",
    connections: [
      { type: "db", label: "Actuarial DB" },
      { type: "agent", label: "Calc Agent" },
    ],
  },
];

const QUICK_CHIPS = [
  "Analyse subrogation rights",
  "Explain ORSA requirements",
  "Check SCR ratio",
  "Classify claim severity",
  "Translate policy to plain English",
];

const USE_CASE_CHIPS = [
  "Data extraction on new policy",
  "Regulatory check — EIOPA compliance",
  "Underwriting risk assessment",
  "Actuarial reserve calculation",
  "Fraud signal analysis",
  "Policy clause translation",
];

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface ToolEvent {
  type: "call" | "result";
  name: string;
  data: string;
  timestamp: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  estCostUsd?: number;
  isStreaming?: boolean;
}

/* ── Connection tag component ───────────────────────────────────────────────── */
function ConnTag({
  type,
  label,
}: {
  type: "db" | "web" | "mail" | "agent";
  label: string;
}) {
  const icons = { db: "🗄", web: "🌐", mail: "📧", agent: "🤖" };
  return (
    <span className={`arena-conn-tag ${type}`}>
      {icons[type]} {label}
    </span>
  );
}

/* ── Tool call display ─────────────────────────────────────────────────────── */
function ToolCallBlock({ events }: { events: ToolEvent[] }) {
  return (
    <>
      {events.map((ev, i) => (
        <div key={i} className="arena-tool-call">
          <div className="arena-tool-call-header">
            <span className="arena-tool-call-icon">⚙️</span>
            <span className="arena-tool-call-name">{ev.name}()</span>
            <span className="arena-tool-call-type">
              {ev.type === "call" ? "→ Tool Call" : "← Result"}
            </span>
          </div>
          {ev.data && (
            <div className="arena-tool-call-args">
              {ev.data.length > 300 ? ev.data.slice(0, 300) + "…" : ev.data}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/* ── Message bubble ─────────────────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`arena-msg ${msg.role}`}>
      <div className="arena-msg-avatar">
        {msg.role === "user" ? "👤" : "🤖"}
      </div>
      <div className="arena-msg-body">
        {msg.toolEvents && msg.toolEvents.length > 0 && (
          <ToolCallBlock events={msg.toolEvents} />
        )}
        <div className="arena-msg-bubble">
          {msg.isStreaming && !msg.content ? (
            <div className="arena-typing">
              <div className="arena-typing-dot" />
              <div className="arena-typing-dot" />
              <div className="arena-typing-dot" />
            </div>
          ) : (
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          )}
        </div>
        {/* Metrics footer */}
        {msg.role === "assistant" && !msg.isStreaming && (
          <div className="arena-msg-metrics">
            {msg.promptTokens != null && msg.promptTokens > 0 && (
              <span>🔢 {msg.promptTokens.toLocaleString()} in</span>
            )}
            {msg.completionTokens != null && msg.completionTokens > 0 && (
              <span>📤 {msg.completionTokens.toLocaleString()} out</span>
            )}
            {msg.latencyMs != null && msg.latencyMs > 0 && (
              <span>⏱ {(msg.latencyMs / 1000).toFixed(2)}s</span>
            )}
            {msg.estCostUsd != null && msg.estCostUsd > 0 && (
              <span>
                💵{" "}
                {msg.estCostUsd < 0.0001
                  ? `$${msg.estCostUsd.toExponential(2)}`
                  : `$${msg.estCostUsd.toFixed(4)}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
interface ChatArenaProps {
  initialPrompt?: string;
  onReady?: () => void;
}

export default function ChatArenaView({ initialPrompt, onReady }: ChatArenaProps = {}) {
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3.3-70b-instruct:free");
  const [activePlugins, setActivePlugins] = useState<Set<string>>(
    new Set(["premium-calculator", "solvency-ii-checker"])
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const initialSentRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modelInfo = MODELS.find((m) => m.id === selectedModel);
  const activePluginCount = activePlugins.size;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const togglePlugin = (id: string) => {
    setActivePlugins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = useCallback(async (overridePrompt?: string) => {
    const text = (overridePrompt ?? input).trim();
    if (!text || isStreaming) return;

    setInput("");

    // Add user message
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Add streaming assistant message
    const assistantMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        isStreaming: true,
        toolEvents: [],
      },
    ]);
    setIsStreaming(true);

    const startTime = Date.now();
    abortRef.current = new AbortController();

    let reasoning = "";
    let answer = "";
    let toolEvents: ToolEvent[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let estCostUsd = 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: text,
          useTools: activePluginCount > 0,
          selectedTools: ["calculator", "solvency_ratio_checker", "insurance_knowledge_search", "currency_converter"],
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

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
              reasoning += event.delta as string;
              break;
            case "content":
              answer += event.delta as string;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  next[next.length - 1] = { ...last, content: answer };
                }
                return next;
              });
              break;
            case "tool_call":
              toolEvents = [
                ...toolEvents,
                {
                  type: "call",
                  name: String(event.name),
                  data: JSON.stringify(event.args, null, 2),
                  timestamp: Date.now(),
                },
              ];
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  next[next.length - 1] = { ...last, toolEvents };
                }
                return next;
              });
              break;
            case "tool_result":
              toolEvents = [
                ...toolEvents,
                {
                  type: "result",
                  name: String(event.name),
                  data: String(event.result),
                  timestamp: Date.now(),
                },
              ];
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  next[next.length - 1] = { ...last, toolEvents };
                }
                return next;
              });
              break;
            case "usage": {
              const u = event.usage as {
                prompt_tokens: number;
                completion_tokens: number;
                total_cost_usd: number;
              };
              promptTokens = u.prompt_tokens;
              completionTokens = u.completion_tokens;
              estCostUsd = u.total_cost_usd;
              break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      answer = "⚠ An error occurred. Please try again.";
    } finally {
      const latencyMs = Date.now() - startTime;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          next[next.length - 1] = {
            role: "assistant",
            content: answer || "No response generated.",
            toolEvents,
            promptTokens,
            completionTokens,
            latencyMs,
            estCostUsd,
            isStreaming: false,
          };
        }
        return next;
      });
      setIsStreaming(false);
    }
  }, [input, isStreaming, selectedModel, activePluginCount]);

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  };

  // Auto-send initialPrompt (e.g. from Benchmark "Run in Arena" button)
  useEffect(() => {
    if (initialPrompt && !initialSentRef.current) {
      initialSentRef.current = true;
      onReady?.();
      // Small delay so component is fully mounted
      setTimeout(() => handleSend(initialPrompt), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  return (
    <div className="arena-layout">
      {/* Sidebar */}
      <aside className="arena-sidebar">
        {/* Active Model */}
        <div className="arena-sidebar-section">
          <div className="arena-active-model">
            <ModelSelectWidget
              label="Active Model"
              value={selectedModel}
              onChange={setSelectedModel}
            />

            <span className="arena-model-desc">
              Insurance domain system prompt active.
              <br />
              Responses calibrated to insurance workflows only.
            </span>
          </div>
        </div>

        {/* Insurance Plugins */}
        <div className="arena-sidebar-section">
          <div className="arena-sidebar-label">Insurance Plugins</div>
          {PLUGINS.map((plugin) => {
            const isOn = activePlugins.has(plugin.id);
            return (
              <div
                key={plugin.id}
                className={`arena-plugin-item${isOn ? " active" : ""}`}
              >
                <div className="arena-plugin-row">
                  <span className="arena-plugin-icon">{plugin.icon}</span>
                  <div className="arena-plugin-info">
                    <div className="arena-plugin-name">{plugin.name}</div>
                    <div className="arena-plugin-sub">{plugin.sub}</div>
                  </div>
                  <div
                    className={`arena-plugin-toggle${isOn ? " on" : ""}`}
                    onClick={() => togglePlugin(plugin.id)}
                    title={isOn ? "Disable plugin" : "Enable plugin"}
                  />
                </div>
                {isOn && (
                  <div className="arena-plugin-connection-tags">
                    {plugin.connections.map((c, i) => (
                      <ConnTag key={i} type={c.type} label={c.label} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Context */}
        <div className="arena-sidebar-section">
          <div className="arena-sidebar-label">Context</div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.txt,.md,.json,.csv"
            style={{ display: "none" }}
            onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
          />
          {attachedFile ? (
            <div
              className="arena-active-model"
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <span style={{ fontSize: 18 }}>📎</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-main)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachedFile.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-subtle)" }}>
                  {(attachedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-subtle)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className="arena-context-drop"
              onClick={() => fileInputRef.current?.click()}
            >
              <span style={{ fontSize: 20 }}>🗂</span>
              <span>
                Attach policy doc,
                <br />
                claim form, or report
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="arena-main">
        {/* Header */}
        <div className="arena-header">
          <div className="arena-header-model">
            <div className="arena-header-model-icon">🤖</div>
            <div>
              <div className="arena-header-model-name">
                {modelInfo?.label ?? selectedModel}
              </div>
              <div className="arena-header-plugin-count">
                {activePluginCount} plugin
                {activePluginCount !== 1 ? "s" : ""} active
              </div>
            </div>
          </div>
          <div className="arena-header-actions">
            <button className="arena-header-btn" onClick={handleClear}>
              Clear
            </button>
            <button
              className="arena-header-btn"
              onClick={() => {
                const text = messages
                  .map(
                    (m) =>
                      `[${m.role.toUpperCase()}]\n${m.content}\n`
                  )
                  .join("\n---\n");
                navigator.clipboard.writeText(text);
              }}
            >
              Export
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="arena-messages">
          {messages.length === 0 ? (
            <div className="arena-welcome">
              <div className="arena-welcome-icon">🛡️</div>
              <div className="arena-welcome-title">
                Welcome to the Insurance Chat Arena
              </div>
              <div className="arena-welcome-desc">
                I&apos;m operating with an insurance-domain specialisation — I
                can assist with underwriting analysis, claims processing,
                regulatory compliance, actuarial calculations, and policy
                interpretation.
                <br />
                <br />
                {activePluginCount > 0 && (
                  <>
                    I have access to{" "}
                    <strong>
                      {Array.from(activePlugins)
                        .map(
                          (id) =>
                            PLUGINS.find((p) => p.id === id)?.name ?? id
                        )
                        .join(", ")}
                    </strong>{" "}
                    tools. Attach a document or describe your task to begin.
                  </>
                )}
              </div>
              {/* Use case chips */}
              <div className="arena-welcome-chips">
                {USE_CASE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className="arena-welcome-chip"
                    onClick={() => handleSend(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="arena-input-area">
          {/* Quick chips */}
          <div className="arena-quick-chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                className="arena-quick-chip"
                onClick={() => handleSend(chip)}
                disabled={isStreaming}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="arena-input-row">
            <button
              className="arena-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach document"
            >
              📎
            </button>
            <textarea
              className="arena-input-textarea"
              placeholder="Ask an insurance question or describe a task for the agent…"
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className="arena-send-btn"
              onClick={() => (isStreaming ? abortRef.current?.abort() : handleSend())}
              disabled={!isStreaming && !input.trim()}
              title={isStreaming ? "Stop" : "Send"}
            >
              {isStreaming ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

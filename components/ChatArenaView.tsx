"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ModelSelectWidget from "./ModelSelectWidget";
import { DocumentPreviewModal, ParsedDocument } from "./DocumentPreviewModal";
import { DocumentIngestModal } from "./DocumentIngestModal";

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
  attachedDoc?: ParsedDocument;
  toolEvents?: ToolEvent[];
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  estCostUsd?: number;
  isStreaming?: boolean;
}

function formatDocType(type?: string): string {
  if (!type) return "DOC";
  const upper = type.toUpperCase();
  if (upper.includes("OCR")) return "OCR";
  return type.replace(/\bAI\s*OCR\b/gi, "OCR");
}

/* ── Connection tag component ───────────────────────────────────────────────── */
const ConnTag = React.memo(function ConnTag({
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
});

/* ── Tool call display ─────────────────────────────────────────────────────── */
const ToolCallBlock = React.memo(function ToolCallBlock({ events }: { events: ToolEvent[] }) {
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
});

/* ── Message bubble ─────────────────────────────────────────────────────────── */
// React.memo prevents re-rendering completed messages when only the last
// streaming message changes. This is the single biggest re-render win during
// long AI streaming responses.
const MessageBubble = React.memo(function MessageBubble({
  msg,
  onPreviewDoc,
}: {
  msg: ChatMessage;
  onPreviewDoc?: (doc: ParsedDocument) => void;
}) {
  return (
    <div className={`arena-msg ${msg.role}`}>
      <div className="arena-msg-avatar">
        {msg.role === "user" ? "👤" : "🤖"}
      </div>
      <div className="arena-msg-body">
        {msg.toolEvents && msg.toolEvents.length > 0 && (
          <ToolCallBlock events={msg.toolEvents} />
        )}
        {msg.attachedDoc && (
          <div className="arena-msg-doc-pill">
            <span
              className={`doc-badge doc-badge-${formatDocType(msg.attachedDoc.type)
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "-")}`}
            >
              {formatDocType(msg.attachedDoc.type)}
            </span>
            <span className="arena-msg-doc-name" title={msg.attachedDoc.name}>
              {msg.attachedDoc.name}
            </span>
            <span className="arena-msg-doc-meta">
              {msg.attachedDoc.formattedSize} · {msg.attachedDoc.wordCount.toLocaleString()} words
            </span>
            {onPreviewDoc && (
              <button
                type="button"
                className="arena-msg-doc-view-btn"
                onClick={() => onPreviewDoc(msg.attachedDoc!)}
                title="Preview document content"
              >
                👁️ View
              </button>
            )}
          </div>
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
});

/* ── Main Component ─────────────────────────────────────────────────────────── */
interface ChatArenaProps {
  initialPrompt?: string;
  onReady?: () => void;
}

export default function ChatArenaView({ initialPrompt, onReady }: ChatArenaProps = {}) {
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [activePlugins, setActivePlugins] = useState<Set<string>>(
    new Set(["premium-calculator", "solvency-ii-checker"])
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<ParsedDocument | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ParsedDocument | null>(null);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const initialSentRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleDocUpload = async (file: File) => {
    setIsUploadingDoc(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse document");
      }

      // If server signals that it needs client-side page rendering (e.g. deployed on Vercel without poppler)
      if (data.needsClientOcr && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        try {
          const { renderPdfPagesToImages } = await import("@/lib/client-pdf-renderer");
          const renderedPages = await renderPdfPagesToImages(file, 5);
          if (renderedPages.length > 0) {
            const ocrFormData = new FormData();
            ocrFormData.append("file", file);
            ocrFormData.append("pageImages", JSON.stringify(renderedPages));
            const ocrRes = await fetch("/api/documents/parse", {
              method: "POST",
              body: ocrFormData,
            });
            const ocrData = await ocrRes.json();
            if (ocrData.success && ocrData.document) {
              setAttachedDoc({
                ...ocrData.document,
                type: formatDocType(ocrData.document.type),
              });
              return;
            }
          }
        } catch (clientOcrErr) {
          console.warn("Client-side PDF rendering fallback failed:", clientOcrErr);
        }
      }

      setAttachedDoc({
        ...data.document,
        type: formatDocType(data.document.type),
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleDocUpload(files[0]);
    }
  };

  const handleSend = useCallback(async (overridePrompt?: string) => {
    let text = (overridePrompt ?? input).trim();
    if ((!text && !attachedDoc) || isStreaming || isUploadingDoc) return;

    const currentDoc = attachedDoc;
    let effectivePrompt = text;

    if (currentDoc) {
      const docHeader = `[ATTACHED POLICY / DOCUMENT: ${currentDoc.name} | Type: ${currentDoc.type} | Size: ${currentDoc.formattedSize}]\n--- DOCUMENT CONTENT START ---\n${currentDoc.text}\n--- DOCUMENT CONTENT END ---\n\n`;
      effectivePrompt =
        docHeader +
        (text ||
          "Please analyze this attached insurance document, extract key terms, coverage limits, deductibles, conditions, and exclusions.");
    }

    setAttachedDoc(null);
    setInput("");

    // Add user message
    const userMsg: ChatMessage = {
      role: "user",
      content:
        text ||
        (currentDoc
          ? `Please analyze this attached policy document: **${currentDoc.name}**`
          : ""),
      attachedDoc: currentDoc ?? undefined,
    };
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
          prompt: effectivePrompt,
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
            case "error": {
              const errMsg = String(event.error || "Inference error");
              answer = answer ? `${answer}\n\n⚠ ${errMsg}` : `⚠ ${errMsg}`;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  next[next.length - 1] = { ...last, content: answer };
                }
                return next;
              });
              break;
            }
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
  }, [input, isStreaming, selectedModel, activePluginCount, attachedDoc, isUploadingDoc]);

  const canSend =
    (input.trim().length > 0 || attachedDoc !== null) &&
    !isStreaming &&
    !isUploadingDoc;

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  };

  // Paste initialPrompt into input (e.g. from Benchmark "Open in Arena" button)
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 50);
      onReady?.();
    }
  }, [initialPrompt, onReady]);

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
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleDocUpload(f);
              e.target.value = "";
            }}
          />
          {isUploadingDoc ? (
            <div className="arena-context-drop parsing">
              <div className="arena-btn-spinner" />
              <span>Parsing & running OCR...</span>
            </div>
          ) : attachedDoc ? (
            <div className="arena-context-attached-card">
              <div className="arena-context-attached-header">
                <span
                  className={`doc-badge doc-badge-${formatDocType(attachedDoc.type)
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "-")}`}
                >
                  {formatDocType(attachedDoc.type)}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedDoc(null)}
                  className="attached-remove-btn"
                  title="Detach document"
                >
                  ✕
                </button>
              </div>
              <div className="arena-context-attached-title" title={attachedDoc.name}>
                {attachedDoc.name}
              </div>
              <div className="arena-context-attached-meta">
                {attachedDoc.formattedSize} · {attachedDoc.wordCount.toLocaleString()} words · ~{attachedDoc.tokenCount.toLocaleString()} tokens
              </div>
              <div className="arena-context-attached-actions">
                <button
                  type="button"
                  className="arena-context-btn"
                  onClick={() => setPreviewDoc(attachedDoc)}
                >
                  👁️ Preview
                </button>
                <button
                  type="button"
                  className="arena-context-btn highlight"
                  onClick={() => setShowIngestModal(true)}
                >
                  💾 Ingest
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`arena-context-drop${isDragging ? " dragging" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span style={{ fontSize: 20 }}>🗂</span>
              <span>
                Attach policy doc,
                <br />
                claim form, or report
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-subtle)", marginTop: "2px" }}>
                PDF, OCR, Images, TXT, CSV
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
              <div className="arena-welcome-logos">
                <div className="welcome-logo-card dil-card" title="DIL Knowledge Engine">
                  <img src="/dil-logo.png" alt="DIL Logo" className="welcome-logo-img" />
                </div>
                <span className="welcome-logo-divider">×</span>
                <div className="welcome-logo-card globe-card" title="Insurance AI Arena">
                  <img src="/arena-globe-logo.png" alt="Insurance AI Arena" className="welcome-logo-img" />
                </div>
              </div>
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
            messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                onPreviewDoc={(doc) => setPreviewDoc(doc)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className={`arena-input-area${isDragging ? " dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Quick chips */}
          <div className="arena-quick-chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                className="arena-quick-chip"
                onClick={() => handleSend(chip)}
                disabled={isStreaming || isUploadingDoc}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Upload progress indicator */}
          {isUploadingDoc && (
            <div className="arena-upload-status">
              <div className="arena-upload-spinner" />
              <div className="arena-upload-status-text">
                <span className="arena-upload-status-title">Parsing document & running OCR...</span>
                <span className="arena-upload-status-sub">Extracting policy terms, coverage limits, and clauses</span>
              </div>
            </div>
          )}

          {/* Upload error banner */}
          {uploadError && (
            <div className="doc-upload-error-banner">
              <span>⚠️ {uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Attached Document Card above input */}
          {attachedDoc && (
            <div className="attached-doc-card">
              <div className="attached-doc-left">
                <span className={`doc-badge doc-badge-${formatDocType(attachedDoc.type).toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`}>
                  {formatDocType(attachedDoc.type)}
                </span>
                <div className="attached-doc-details">
                  <span className="attached-doc-name" title={attachedDoc.name}>
                    {attachedDoc.name}
                  </span>
                  <span className="attached-doc-sub">
                    {attachedDoc.formattedSize} · {attachedDoc.wordCount.toLocaleString()} words · ~{attachedDoc.tokenCount.toLocaleString()} LLM tokens
                  </span>
                </div>
              </div>
              <div className="attached-doc-actions">
                <button
                  type="button"
                  className="attached-action-btn"
                  onClick={() => setPreviewDoc(attachedDoc)}
                  title="Preview extracted document text"
                >
                  👁️ Preview Text
                </button>
                <button
                  type="button"
                  className="attached-action-btn highlight"
                  onClick={() => setShowIngestModal(true)}
                  title="Ingest document to insurance data lake"
                >
                  💾 Ingest to Lake
                </button>
                <button
                  type="button"
                  className="attached-remove-btn"
                  onClick={() => setAttachedDoc(null)}
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="arena-input-row">
            <button
              type="button"
              className={`arena-attach-btn${attachedDoc ? " has-doc" : ""}${isUploadingDoc ? " loading" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDoc}
              title={
                isUploadingDoc
                  ? "Parsing document..."
                  : attachedDoc
                  ? `Attached: ${attachedDoc.name} (Click to replace)`
                  : "Attach policy document, claim form, or scan"
              }
            >
              {isUploadingDoc ? (
                <div className="arena-btn-spinner" />
              ) : attachedDoc ? (
                "📄"
              ) : (
                "📎"
              )}
            </button>
            <textarea
              ref={chatInputRef}
              className="arena-input-textarea"
              placeholder={
                attachedDoc
                  ? `Document "${attachedDoc.name}" attached. Ask any question, or press Send to evaluate policy terms...`
                  : "Ask an insurance question or describe a task for the agent…"
              }
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isStreaming && !isUploadingDoc) {
                  e.preventDefault();
                  if (canSend) {
                    handleSend();
                  }
                }
              }}
            />
            <button
              className="arena-send-btn"
              onClick={() => (isStreaming ? abortRef.current?.abort() : handleSend())}
              disabled={!isStreaming && !canSend}
              title={
                isStreaming
                  ? "Stop generation"
                  : isUploadingDoc
                  ? "Processing document..."
                  : attachedDoc && !input.trim()
                  ? "Send & analyze attached document"
                  : "Send message"
              }
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

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        onSaveToLake={() => {
          setShowIngestModal(true);
        }}
      />

      {/* Document Ingest Modal */}
      <DocumentIngestModal
        initialDocument={attachedDoc || previewDoc}
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onIngestSuccess={() => {
          setShowIngestModal(false);
        }}
      />
    </div>
  );
}

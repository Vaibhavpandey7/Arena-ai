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
    id: "regulatory-check",
    icon: "01",
    name: "Regulatory Check",
    sub: "Solvency II, CDR 2015/35 & EU AI Act RAG",
    connections: [
      { type: "db", label: "Regulatory RAG" },
      { type: "web", label: "EIOPA Rulebook" },
      { type: "agent", label: "Compliance Agent" },
    ],
  },
  {
    id: "premium-calculator",
    icon: "02",
    name: "Premium Calculator",
    sub: "Pure premium & risk margin",
    connections: [
      { type: "db", label: "Rate DB" },
      { type: "web", label: "Dashboard" },
    ],
  },
  {
    id: "policy-extractor",
    icon: "03",
    name: "Policy Extractor",
    sub: "Structured clause extraction",
    connections: [
      { type: "db", label: "Policy Lake" },
      { type: "mail", label: "Email Agent" },
    ],
  },
  {
    id: "fx-converter",
    icon: "04",
    name: "FX Converter",
    sub: "Multi-currency conversion",
    connections: [{ type: "web", label: "FX Feed" }],
  },
  {
    id: "fraud-signal",
    icon: "05",
    name: "Fraud Signal Checker",
    sub: "CFIT / SIU signal matrix",
    connections: [
      { type: "db", label: "Claims Intel" },
      { type: "agent", label: "SIU Agent" },
    ],
  },
  {
    id: "actuarial-tables",
    icon: "06",
    name: "Actuarial Tables",
    sub: "Ogden / mortality / dev factors",
    connections: [
      { type: "db", label: "Actuarial DB" },
      { type: "agent", label: "Calc Agent" },
    ],
  },
];

const CHAT_ARENA_SYSTEM_PROMPT =
  "Assign role to the model as an insurance expert and perform tasks as per insurance market. " +
  "You are a senior insurance AI specialist with deep expertise in underwriting, claims adjudication, " +
  "actuarial principles, policy extraction, and regulatory compliance (including Solvency II and EIOPA). " +
  "Analyze queries and documents according to standard insurance market practices, providing accurate, " +
  "evidence-grounded, and professional answers.";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface ToolEvent {
  type: "call" | "result";
  name: string;
  data: string;
  timestamp: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachedDocs?: ParsedDocument[];
  attachedDoc?: ParsedDocument; // Backward compatibility
  toolEvents?: ToolEvent[];
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  estCostUsd?: number;
  isStreaming?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  activePlugins: string[];
  messages: ChatMessage[];
  attachedDocs: ParsedDocument[]; // Staged in composer
  threadDocs: ParsedDocument[];   // All documents uploaded in this thread
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  status: "parsing" | "ocr" | "done" | "error";
  statusText?: string;
  error?: string;
}

const STORAGE_KEY_THREADS = "dil_chat_threads_v2";
const STORAGE_KEY_ACTIVE = "dil_active_thread_id_v2";
const STORAGE_KEY_SIDEBAR = "dil_gemini_sidebar_collapsed";

function formatDocType(type?: string): string {
  if (!type) return "DOC";
  const upper = type.toUpperCase();
  if (upper.includes("OCR")) return "OCR";
  return type.replace(/\bAI\s*OCR\b/gi, "OCR");
}

function createDefaultThread(initialTitle?: string): ChatThread {
  const id = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: initialTitle || "New Insurance Thread",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: "openrouter/free",
    activePlugins: ["regulatory-check", "premium-calculator"],
    messages: [],
    attachedDocs: [],
    threadDocs: [],
  };
}

function loadSavedThreads(): { threads: ChatThread[]; activeId: string } {
  if (typeof window === "undefined") {
    const t = createDefaultThread();
    return { threads: [t], activeId: t.id };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THREADS);
    if (raw) {
      const parsed: ChatThread[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
        const activeId = parsed.some((t) => t.id === savedActive)
          ? (savedActive as string)
          : parsed[0].id;
        return { threads: parsed, activeId };
      }
    }
  } catch (err) {
    console.warn("Failed to load threads from localStorage:", err);
  }
  const defaultT = createDefaultThread();
  return { threads: [defaultT], activeId: defaultT.id };
}

/* ── Gemini Sparkle Icon (4-point gradient star) ──────────────────────────── */
function GeminiSparkleIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill="url(#gemini_sparkle_gradient)"
      />
      <defs>
        <linearGradient
          id="gemini_sparkle_gradient"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4285F4" />
          <stop offset="0.33" stopColor="#9B72CB" />
          <stop offset="0.66" stopColor="#D96570" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Tool / Extension call display ────────────────────────────────────────── */
const GeminiExtensionBlock = React.memo(function GeminiExtensionBlock({ events }: { events: ToolEvent[] }) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const toggle = (idx: number) => {
    setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
      {events.map((ev, i) => {
        const isOpen = openMap[i] ?? false;
        return (
          <div key={i} className="gemini-extension-call-card">
            <div className="gemini-extension-call-header" onClick={() => toggle(i)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--accent-light)" }}>⚙️</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {ev.name}()
                </span>
                <span style={{ fontSize: "10.5px", color: "var(--text-subtle)", padding: "1px 6px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.05)" }}>
                  {ev.type === "call" ? "Invoking Extension" : "Result Ready"}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                ▼
              </span>
            </div>
            {isOpen && ev.data && (
              <div className="gemini-extension-call-body">
                {ev.data}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

/* ── Message bubble ─────────────────────────────────────────────────────────── */
const GeminiMessageRow = React.memo(function GeminiMessageRow({
  msg,
  onPreviewDoc,
}: {
  msg: ChatMessage;
  onPreviewDoc?: (doc: ParsedDocument) => void;
}) {
  const [copied, setCopied] = useState(false);
  const docs = msg.attachedDocs && msg.attachedDocs.length > 0
    ? msg.attachedDocs
    : msg.attachedDoc
    ? [msg.attachedDoc]
    : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (msg.role === "user") {
    return (
      <div className="gemini-msg-row user">
        <div className="gemini-user-bubble">
          {docs.length > 0 && (
            <div className="arena-msg-docs-wrap" style={{ marginBottom: "10px" }}>
              {docs.map((doc, idx) => (
                <div key={doc.id || idx} className="arena-msg-doc-pill">
                  <span
                    className={`doc-badge doc-badge-${formatDocType(doc.type)
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "-")}`}
                  >
                    {formatDocType(doc.type)}
                  </span>
                  <span className="arena-msg-doc-name" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="arena-msg-doc-meta">
                    {doc.formattedSize}
                  </span>
                  {onPreviewDoc && (
                    <button
                      type="button"
                      className="arena-msg-doc-view-btn"
                      onClick={() => onPreviewDoc(doc)}
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        </div>
      </div>
    );
  }

  // Assistant Turn
  return (
    <div className="gemini-msg-row assistant">
      <div className="gemini-assistant-row">
        <div className="gemini-assistant-avatar" title="Insurance AI Assistant">
          <GeminiSparkleIcon size={18} />
        </div>
        <div className="gemini-assistant-body">
          {msg.toolEvents && msg.toolEvents.length > 0 && (
            <GeminiExtensionBlock events={msg.toolEvents} />
          )}

          {msg.isStreaming && !msg.content ? (
            <div className="arena-typing" style={{ marginTop: 8 }}>
              <div className="arena-typing-dot" />
              <div className="arena-typing-dot" />
              <div className="arena-typing-dot" />
            </div>
          ) : (
            <div className="gemini-markdown-container">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}

          {/* Metrics & Copy Footer */}
          {!msg.isStreaming && msg.content && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                {msg.promptTokens != null && msg.promptTokens > 0 && (
                  <span>{msg.promptTokens.toLocaleString()} in</span>
                )}
                {msg.completionTokens != null && msg.completionTokens > 0 && (
                  <span>{msg.completionTokens.toLocaleString()} out</span>
                )}
                {msg.latencyMs != null && msg.latencyMs > 0 && (
                  <span>{(msg.latencyMs / 1000).toFixed(2)}s</span>
                )}
                {msg.estCostUsd != null && msg.estCostUsd > 0 && (
                  <span>
                    {msg.estCostUsd < 0.0001
                      ? `$${msg.estCostUsd.toExponential(2)}`
                      : `$${msg.estCostUsd.toFixed(4)}`}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: "transparent",
                  border: "none",
                  color: copied ? "var(--accent-light)" : "var(--text-subtle)",
                  fontSize: "11.5px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
                title="Copy response text"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          )}
        </div>
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
  const [threads, setThreads] = useState<ChatThread[]>(() => loadSavedThreads().threads);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => loadSavedThreads().activeId);

  // Collapsible sidebar state (persisted)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_SIDEBAR) === "true";
    }
    return false;
  });

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals state
  const [previewDocs, setPreviewDocs] = useState<ParsedDocument[]>([]);
  const [previewActiveId, setPreviewActiveId] = useState<string | undefined>(undefined);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [ingestDocs, setIngestDocs] = useState<ParsedDocument[]>([]);
  const [showIngestModal, setShowIngestModal] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Active Thread Reference
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || createDefaultThread();
  const messages = activeThread.messages || [];
  const attachedDocs = activeThread.attachedDocs || [];
  const threadDocs = activeThread.threadDocs || [];
  const selectedModel = activeThread.model || "openrouter/free";
  const activePlugins = new Set(activeThread.activePlugins || ["regulatory-check", "premium-calculator"]);

  const modelInfo = MODELS.find((m) => m.id === selectedModel);
  const activePluginCount = activePlugins.size;

  const totalAttachedTokens = attachedDocs.reduce((acc, d) => acc + (d.tokenCount || 0), 0);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Persist threads to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || threads.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeThreadId);
    } catch (err) {
      console.warn("Failed to save threads to localStorage:", err);
    }
  }, [threads, activeThreadId]);

  // Persist sidebar collapsed state
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SIDEBAR, String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed]);

  // Helper to update active thread
  const updateActiveThread = useCallback(
    (updater: (prev: ChatThread) => ChatThread) => {
      setThreads((prevThreads) => {
        const found = prevThreads.some((t) => t.id === activeThreadId);
        if (!found) {
          const newT = updater(createDefaultThread());
          return [newT, ...prevThreads];
        }
        return prevThreads.map((t) => (t.id === activeThreadId ? updater(t) : t));
      });
    },
    [activeThreadId]
  );

  const setSelectedModel = (model: string) => {
    updateActiveThread((t) => ({ ...t, model, updatedAt: Date.now() }));
  };

  const togglePlugin = (id: string) => {
    updateActiveThread((t) => {
      const nextPlugins = new Set(t.activePlugins);
      nextPlugins.has(id) ? nextPlugins.delete(id) : nextPlugins.add(id);
      return { ...t, activePlugins: Array.from(nextPlugins), updatedAt: Date.now() };
    });
  };

  /* ── Thread Actions ────────────────────────────────────────────────────────── */
  const createNewThread = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    const newT = createDefaultThread();
    setThreads((prev) => [newT, ...prev]);
    setActiveThreadId(newT.id);
    setInput("");
    setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const switchThread = (id: string) => {
    if (id === activeThreadId) return;
    abortRef.current?.abort();
    setIsStreaming(false);
    setActiveThreadId(id);
    setInput("");
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        const fallback = createDefaultThread();
        setActiveThreadId(fallback.id);
        return [fallback];
      }
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });
  };

  const startRenameThread = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  const saveRenameThread = (id: string) => {
    const trimmed = editingTitle.trim() || "Untitled Thread";
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: trimmed, updatedAt: Date.now() } : t))
    );
    setEditingThreadId(null);
  };

  /* ── Multi-File Upload Handler ─────────────────────────────────────────────── */
  const handleMultiDocUpload = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setUploadError(null);
    const queueItems: UploadingFile[] = fileList.map((f, i) => ({
      id: `upload_${Date.now()}_${i}_${f.name}`,
      name: f.name,
      size: f.size,
      status: "parsing",
    }));
    setUploadingFiles(queueItems);

    const parsedResults: ParsedDocument[] = [];
    const errors: string[] = [];

    await Promise.all(
      fileList.map(async (file, idx) => {
        const qId = queueItems[idx].id;
        const localFileUrl = URL.createObjectURL(file);
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff)$/i.test(file.name);

        try {
          let clientExtractedText = "";
          let clientDetectedType = isPdf ? "PDF" : isImage ? "OCR" : "text";

          // STEP 1: For PDFs, try fast client-side digital text extraction (all pages in milliseconds!)
          if (isPdf) {
            try {
              const { extractAllDigitalTextFromPdf } = await import("@/lib/client-pdf-renderer");
              const digitalRes = await extractAllDigitalTextFromPdf(file);
              if (digitalRes.hasDigitalText && digitalRes.text.length > 40) {
                clientExtractedText = digitalRes.text;
                clientDetectedType = "PDF";
              }
            } catch (digitalErr) {
              console.warn("Client digital text extraction pre-check:", digitalErr);
            }
          }

          const formData = new FormData();
          formData.append("file", file);
          if (clientExtractedText) {
            formData.append("extractedText", clientExtractedText);
            formData.append("detectedType", clientDetectedType);
          }

          const res = await fetch("/api/documents/parse", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to parse document");
          }

          let doc: ParsedDocument = {
            ...data.document,
            id: data.document.id || `doc_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            fileUrl: localFileUrl || data.document.fileUrl,
            mimeType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
            type: formatDocType(data.document.type),
          };

          // STEP 2: Dedicated Free OCR (Tesseract.js) for true Scanned PDFs or Images
          if (data.needsClientOcr) {
            setUploadingFiles((prev) =>
              prev.map((item) => (item.id === qId ? { ...item, status: "ocr" } : item))
            );

            if (isPdf) {
              const { ocrPdfWithTesseract } = await import("@/lib/client-pdf-renderer");
              const ocrRes = await ocrPdfWithTesseract(file, 0, (info) => {
                setUploadingFiles((prev) =>
                  prev.map((item) =>
                    item.id === qId
                      ? { ...item, status: "ocr", statusText: info.status }
                      : item
                  )
                );
              });

              if (ocrRes.text && ocrRes.text.length > 10) {
                // Post OCR text to server so it is cached and saved
                const saveFormData = new FormData();
                saveFormData.append("file", file);
                saveFormData.append("extractedText", ocrRes.text);
                saveFormData.append("detectedType", "OCR");
                const saveRes = await fetch("/api/documents/parse", {
                  method: "POST",
                  body: saveFormData,
                });
                const saveData = await saveRes.json();
                if (saveData.success && saveData.document) {
                  doc = {
                    ...saveData.document,
                    id: doc.id,
                    fileUrl: localFileUrl || saveData.document.fileUrl,
                    mimeType: "application/pdf",
                    type: "OCR",
                  };
                } else {
                  doc = {
                    ...doc,
                    text: ocrRes.text,
                    wordCount: ocrRes.wordCount,
                    charCount: ocrRes.charCount,
                    type: "OCR",
                    preview: ocrRes.text.slice(0, 350) + "…",
                  };
                }
              }
            } else if (isImage) {
              const { ocrImageWithTesseract } = await import("@/lib/client-pdf-renderer");
              const imageText = await ocrImageWithTesseract(file, (percent, status) => {
                setUploadingFiles((prev) =>
                  prev.map((item) =>
                    item.id === qId
                      ? { ...item, status: "ocr", statusText: status }
                      : item
                  )
                );
              });

              if (imageText && imageText.length > 5) {
                const saveFormData = new FormData();
                saveFormData.append("file", file);
                saveFormData.append("extractedText", imageText);
                saveFormData.append("detectedType", "OCR");
                const saveRes = await fetch("/api/documents/parse", {
                  method: "POST",
                  body: saveFormData,
                });
                const saveData = await saveRes.json();
                if (saveData.success && saveData.document) {
                  doc = {
                    ...saveData.document,
                    id: doc.id,
                    fileUrl: localFileUrl || saveData.document.fileUrl,
                    mimeType: file.type || "image/png",
                    type: "OCR",
                  };
                }
              }
            }
          }

          setUploadingFiles((prev) =>
            prev.map((item) => (item.id === qId ? { ...item, status: "done", statusText: "Done" } : item))
          );
          parsedResults.push(doc);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to parse";
          errors.push(`${file.name}: ${msg}`);
          setUploadingFiles((prev) =>
            prev.map((item) => (item.id === qId ? { ...item, status: "error", error: msg } : item))
          );
        }
      })
    );

    if (parsedResults.length > 0) {
      updateActiveThread((t) => {
        const existingAttachedKeys = new Set(t.attachedDocs.map((d) => `${d.name}_${d.size}`));
        const newAttached = parsedResults.filter((d) => !existingAttachedKeys.has(`${d.name}_${d.size}`));

        const existingThreadKeys = new Set(t.threadDocs.map((d) => `${d.name}_${d.size}`));
        const newThreadDocs = parsedResults.filter((d) => !existingThreadKeys.has(`${d.name}_${d.size}`));

        return {
          ...t,
          attachedDocs: [...t.attachedDocs, ...newAttached],
          threadDocs: [...t.threadDocs, ...newThreadDocs],
          updatedAt: Date.now(),
        };
      });
    }

    if (errors.length > 0) {
      setUploadError(errors.join(" | "));
    }

    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((p) => p.status === "error"));
    }, 1500);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachedDoc = (docId: string) => {
    updateActiveThread((t) => ({
      ...t,
      attachedDocs: t.attachedDocs.filter((d) => d.id !== docId),
      updatedAt: Date.now(),
    }));
  };

  const clearAttachedDocs = () => {
    updateActiveThread((t) => ({
      ...t,
      attachedDocs: [],
      updatedAt: Date.now(),
    }));
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
      handleMultiDocUpload(files);
    }
  };

  /* ── Send Message in Thread with Context Maintenance ───────────────────────── */
  const handleSend = useCallback(
    async (overridePrompt?: string) => {
      const text = (overridePrompt ?? input).trim();
      const currentDocs = activeThread.attachedDocs;
      if ((!text && currentDocs.length === 0) || isStreaming || uploadingFiles.length > 0) return;

      // Format current turn user prompt with attached documents
      let promptWithDocs = text;
      if (currentDocs.length > 0) {
        const docsHeader = `[ATTACHED INSURANCE DOCUMENTS (${currentDocs.length} file${currentDocs.length > 1 ? "s" : ""})]\n\n` +
          currentDocs
            .map(
              (doc, idx) =>
                `=== DOCUMENT ${idx + 1} OF ${currentDocs.length}: ${doc.name} (Type: ${doc.type} | Size: ${doc.formattedSize} | ~${doc.tokenCount.toLocaleString()} tokens) ===\n--- DOCUMENT CONTENT START ---\n${doc.text}\n--- DOCUMENT CONTENT END ---`
            )
            .join("\n\n") +
          `\n\n[USER INQUIRY / TASK]\n` +
          (text ||
            "Please analyze the attached insurance documents in detail. Identify and compare key terms, coverage limits, deductibles, conditions, exclusions, and legal/underwriting implications.");
        promptWithDocs = docsHeader;
      }

      // Auto-compute thread title if first message
      const isFirstMessage = activeThread.messages.length === 0;
      const computedTitle = isFirstMessage
        ? text
          ? text.slice(0, 32) + (text.length > 32 ? "…" : "")
          : currentDocs.length === 1
          ? `${currentDocs[0].name.slice(0, 26)} Analysis`
          : `${currentDocs.length} Policies Analysis`
        : activeThread.title;

      // Create new user turn message
      const userMsg: ChatMessage = {
        role: "user",
        content:
          text ||
          (currentDocs.length > 0
            ? `Please analyze the attached ${currentDocs.length} document${currentDocs.length > 1 ? "s" : ""}: ${currentDocs.map((d) => d.name).join(", ")}`
            : ""),
        attachedDocs: currentDocs.length > 0 ? [...currentDocs] : undefined,
      };

      const nextMessagesWithUser: ChatMessage[] = [...activeThread.messages, userMsg];

      // Placeholder streaming assistant message
      const streamingAssistantMsg: ChatMessage = {
        role: "assistant",
        content: "",
        isStreaming: true,
        toolEvents: [],
      };

      updateActiveThread((t) => ({
        ...t,
        title: computedTitle,
        messages: [...nextMessagesWithUser, streamingAssistantMsg],
        attachedDocs: [], // Clear attachments from composer as they are now sent in the message
        updatedAt: Date.now(),
      }));

      setInput("");
      setIsStreaming(true);

      const startTime = Date.now();
      abortRef.current = new AbortController();

      // Build full conversation history for OpenRouter
      const openRouterMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

      for (let i = 0; i < nextMessagesWithUser.length; i++) {
        const m = nextMessagesWithUser[i];
        if (m.role === "user") {
          if (i === nextMessagesWithUser.length - 1) {
            openRouterMessages.push({ role: "user", content: promptWithDocs });
          } else if (m.attachedDocs && m.attachedDocs.length > 0) {
            const pastDocBlock = `[ATTACHED INSURANCE DOCUMENTS (${m.attachedDocs.length} file${m.attachedDocs.length > 1 ? "s" : ""})]\n\n` +
              m.attachedDocs
                .map(
                  (doc, idx) =>
                    `=== DOCUMENT ${idx + 1} OF ${m.attachedDocs!.length}: ${doc.name} (Type: ${doc.type} | Size: ${doc.formattedSize}) ===\n--- DOCUMENT CONTENT START ---\n${doc.text}\n--- DOCUMENT CONTENT END ---`
                )
                .join("\n\n") +
              `\n\n[USER INQUIRY / TASK]\n` +
              m.content;
            openRouterMessages.push({ role: "user", content: pastDocBlock });
          } else {
            openRouterMessages.push({ role: "user", content: m.content });
          }
        } else if (m.role === "assistant") {
          openRouterMessages.push({ role: "assistant", content: m.content });
        }
      }

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
            model: activeThread.model,
            messages: openRouterMessages,
            systemPrompt: CHAT_ARENA_SYSTEM_PROMPT,
            useTools: activeThread.activePlugins.length > 0,
            activePlugins: activeThread.activePlugins,
            selectedTools: [
              "calculator",
              "regulatory_check_rag",
              "solvency_ratio_checker",
              "insurance_knowledge_search",
              "currency_converter",
            ],
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
                updateActiveThread((t) => {
                  const msgs = [...t.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant" && last.isStreaming) {
                    msgs[msgs.length - 1] = { ...last, content: answer };
                  }
                  return { ...t, messages: msgs };
                });
                break;
              case "error": {
                const errMsg = String(event.error || "Inference error");
                answer = answer ? `${answer}\n\n[Error: ${errMsg}]` : `[Error: ${errMsg}]`;
                updateActiveThread((t) => {
                  const msgs = [...t.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant" && last.isStreaming) {
                    msgs[msgs.length - 1] = { ...last, content: answer };
                  }
                  return { ...t, messages: msgs };
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
                updateActiveThread((t) => {
                  const msgs = [...t.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant" && last.isStreaming) {
                    msgs[msgs.length - 1] = { ...last, toolEvents };
                  }
                  return { ...t, messages: msgs };
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
                updateActiveThread((t) => {
                  const msgs = [...t.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant" && last.isStreaming) {
                    msgs[msgs.length - 1] = { ...last, toolEvents };
                  }
                  return { ...t, messages: msgs };
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
        answer = "[Error] An error occurred. Please try again.";
      } finally {
        const latencyMs = Date.now() - startTime;
        updateActiveThread((t) => {
          const msgs = [...t.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            msgs[msgs.length - 1] = {
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
          return { ...t, messages: msgs, updatedAt: Date.now() };
        });
        setIsStreaming(false);
      }
    },
    [input, isStreaming, uploadingFiles.length, activeThread, updateActiveThread]
  );

  const canSend =
    (input.trim().length > 0 || attachedDocs.length > 0) &&
    !isStreaming &&
    uploadingFiles.length === 0;

  const handleClearCurrentThread = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    updateActiveThread((t) => ({ ...t, messages: [], attachedDocs: [], updatedAt: Date.now() }));
  };

  // Open Preview Modal helpers
  const openPreviewForDocs = (docs: ParsedDocument[], activeId?: string) => {
    setPreviewDocs(docs);
    setPreviewActiveId(activeId || docs[0]?.id);
    setIsPreviewOpen(true);
  };

  const openIngestForDocs = (docs: ParsedDocument[]) => {
    setIngestDocs(docs);
    setShowIngestModal(true);
  };

  // Paste initialPrompt into input (e.g. from Benchmark view)
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
    <div className="gemini-layout">
      {/* ── Collapsible Left Sidebar Drawer ───────────────────────────── */}
      <aside className={`gemini-sidebar${isSidebarCollapsed ? " collapsed" : ""}`}>
        {/* Header with Hamburger */}
        <div className="gemini-sidebar-header">
          <button
            type="button"
            className="gemini-icon-btn"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {!isSidebarCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <GeminiSparkleIcon size={20} />
              <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-main)" }}>
                Insurance <span style={{ color: "var(--accent-light)" }}>Arena</span>
              </span>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="gemini-new-chat-wrap">
          <button
            type="button"
            className="gemini-new-chat-pill"
            onClick={createNewThread}
            title="Start new conversation thread"
          >
            <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--accent-light)" }}>+</span>
            {!isSidebarCollapsed && <span>New chat</span>}
          </button>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="gemini-sidebar-scroll">
          {/* Recent Threads List */}
          <div>
            {!isSidebarCollapsed && (
              <div className="gemini-sidebar-group-label">
                <span>Recent</span>
                <span className="arena-threads-badge">{threads.length}</span>
              </div>
            )}
            <div className="gemini-threads-nav">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isEditing = editingThreadId === thread.id;

                if (isSidebarCollapsed) {
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      className={`gemini-icon-btn${isActive ? " active" : ""}`}
                      onClick={() => switchThread(thread.id)}
                      title={thread.title}
                      style={{
                        margin: "2px auto",
                        background: isActive ? "rgba(66, 133, 244, 0.15)" : "transparent",
                        color: isActive ? "var(--accent-light)" : "var(--text-subtle)",
                      }}
                    >
                      💬
                    </button>
                  );
                }

                return (
                  <div
                    key={thread.id}
                    className={`gemini-thread-pill${isActive ? " active" : ""}`}
                    onClick={() => switchThread(thread.id)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        className="arena-thread-rename-input"
                        value={editingTitle}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRenameThread(thread.id);
                          if (e.key === "Escape") setEditingThreadId(null);
                        }}
                        onBlur={() => saveRenameThread(thread.id)}
                      />
                    ) : (
                      <>
                        <span style={{ fontSize: "12px", opacity: isActive ? 1 : 0.6 }}>💬</span>
                        <span className="gemini-thread-title-text" title={thread.title}>
                          {thread.title}
                        </span>
                        <div className="gemini-thread-actions">
                          <button
                            type="button"
                            className="gemini-thread-action-btn"
                            onClick={(e) => startRenameThread(thread, e)}
                            title="Rename"
                          >
                            ✎
                          </button>
                          {threads.length > 1 && (
                            <button
                              type="button"
                              className="gemini-thread-action-btn delete"
                              onClick={(e) => deleteThread(thread.id, e)}
                              title="Delete"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insurance Extensions (Plugins) */}
          {!isSidebarCollapsed && (
            <div>
              <div className="gemini-sidebar-group-label">
                <span>Extensions</span>
                <span className="meta-tag" style={{ fontSize: "10px" }}>{activePluginCount} on</span>
              </div>
              <div className="gemini-extensions-list">
                {PLUGINS.map((plugin) => {
                  const isOn = activePlugins.has(plugin.id);
                  return (
                    <div
                      key={plugin.id}
                      className={`gemini-extension-row${isOn ? " active" : ""}`}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="gemini-extension-name">{plugin.name}</div>
                        <div className="gemini-extension-sub" title={plugin.sub}>{plugin.sub}</div>
                      </div>
                      <div
                        className={`arena-plugin-toggle${isOn ? " on" : ""}`}
                        onClick={() => togglePlugin(plugin.id)}
                        title={isOn ? "Disable extension" : "Enable extension"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* ── Main Chat Viewport ────────────────────────────────────────── */}
      <div
        className="gemini-main"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden global multi-file picker wired to the + button in composer */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.csv,.docx"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleMultiDocUpload(e.target.files);
            }
          }}
        />

        {/* Drag & drop visual overlay */}
        {isDragging && (
          <div className="drag-drop-overlay">
            <span style={{ fontSize: "28px" }}>📎</span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
              Drop Insurance Documents Here
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
              Batch upload PDF policies, claims, schedules, and spreadsheets
            </span>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="gemini-top-bar">
          <div className="gemini-top-left">
            {isSidebarCollapsed && (
              <button
                type="button"
                className="gemini-icon-btn"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}

            {/* Gemini Model Selector Trigger Pill */}
            <div style={{ position: "relative" }}>
              <ModelSelectWidget
                label=""
                value={selectedModel}
                onChange={setSelectedModel}
                compact={true}
              />
            </div>
          </div>

          <div className="gemini-top-right">
            <div className="gemini-ext-badge-pill" title="Active insurance extensions">
              <span>🧩</span>
              <span>{activePluginCount} extensions active</span>
            </div>

            <button
              type="button"
              className="arena-header-btn"
              onClick={handleClearCurrentThread}
              title="Clear current thread conversation"
            >
              Clear
            </button>

            <button
              type="button"
              className="arena-header-btn"
              onClick={() => {
                const text = messages
                  .map((m) => `[${m.role.toUpperCase()}]\n${m.content}\n`)
                  .join("\n---\n");
                navigator.clipboard.writeText(text);
              }}
              title="Export conversation transcript"
            >
              Export
            </button>
          </div>
        </header>

        {/* Centered Scrollable Conversation */}
        <div
          className={`gemini-chat-scroll${isDragging ? " dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="gemini-chat-centered">
            {messages.length === 0 ? (
              /* Welcome Hero without predefined prompt cards */
              <div className="gemini-hero">
                <div className="gemini-hero-greeting">
                  Hello, Insurance Specialist
                </div>
                <div className="gemini-hero-sub">
                  How can I help you analyze policies, cross-examine clauses, or assess risk today?
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <GeminiMessageRow
                  key={i}
                  msg={msg}
                  onPreviewDoc={(doc) => openPreviewForDocs(threadDocs.length > 0 ? threadDocs : [doc], doc.id)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Floating Gemini Pill Composer ─────────────────────────────── */}
        <div className="gemini-floating-composer-anchor">
          <div className="gemini-composer-pill">
            {/* Upload Queue Banner */}
            {uploadingFiles.length > 0 && (
              <div className="arena-multi-upload-banner" style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="arena-upload-spinner" />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                    Processing {uploadingFiles.length} file{uploadingFiles.length > 1 ? "s" : ""} (parsing & OCR)…
                  </span>
                </div>
                <div className="arena-multi-upload-items">
                  {uploadingFiles.map((item) => (
                    <span key={item.id} className={`arena-multi-upload-item ${item.status}`} title={item.statusText || item.name}>
                      {item.status === "parsing" || item.status === "ocr" ? "⏳" : item.status === "done" ? "✓" : "✕"}
                      {" "}{item.name}
                      {item.statusText && item.status !== "done" && (
                        <span style={{ opacity: 0.85, fontSize: "11px", marginLeft: "4px", color: "var(--accent)" }}>
                          ({item.statusText})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="doc-upload-error-banner" style={{ marginBottom: "10px" }}>
                <span>{uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Attached Multi-Documents Tray Inside Composer */}
            {attachedDocs.length > 0 && (
              <div className="arena-multi-doc-tray" style={{ marginBottom: "10px" }}>
                <div className="arena-multi-doc-header">
                  <div className="arena-multi-doc-summary">
                    <span>📎 {attachedDocs.length} {attachedDocs.length === 1 ? "document" : "documents"} attached</span>
                    <span className="arena-multi-doc-token-pill">~{totalAttachedTokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="arena-multi-doc-actions">
                    <button
                      type="button"
                      className="arena-multi-doc-btn"
                      onClick={() => openPreviewForDocs(attachedDocs)}
                      title="Preview all attached documents"
                    >
                      Preview All
                    </button>
                    <button
                      type="button"
                      className="arena-multi-doc-btn highlight"
                      onClick={() => openIngestForDocs(attachedDocs)}
                      title="Ingest attached files into Data Lake"
                    >
                      Ingest All
                    </button>
                    <button
                      type="button"
                      className="arena-multi-doc-btn danger"
                      onClick={clearAttachedDocs}
                      title="Detach all documents"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="arena-multi-doc-chips">
                  {attachedDocs.map((doc) => (
                    <div key={doc.id} className="arena-multi-doc-chip">
                      <span
                        className={`doc-badge doc-badge-sm doc-badge-${formatDocType(doc.type)
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "-")}`}
                      >
                        {formatDocType(doc.type)}
                      </span>
                      <span className="arena-multi-doc-chip-name" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="arena-multi-doc-chip-meta">
                        {doc.formattedSize}
                      </span>
                      <button
                        type="button"
                        className="arena-multi-doc-chip-btn"
                        onClick={() => openPreviewForDocs(attachedDocs, doc.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="arena-multi-doc-chip-remove"
                        onClick={() => removeAttachedDoc(doc.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Composer Input Row */}
            <div className="gemini-composer-row">
              <button
                type="button"
                className={`gemini-attach-circle-btn${attachedDocs.length > 0 ? " has-docs" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles.length > 0}
                title="Attach multiple policy documents, claims, or endorsements"
              >
                {uploadingFiles.length > 0 ? (
                  <div className="arena-btn-spinner" />
                ) : (
                  <span style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1 }}>+</span>
                )}
              </button>

              <textarea
                ref={chatInputRef}
                className="gemini-composer-textarea"
                placeholder={
                  attachedDocs.length > 0
                    ? `${attachedDocs.length} ${attachedDocs.length === 1 ? "document" : "documents"} attached. Ask anything or press Send...`
                    : "Ask anything about insurance policies, claims, or attach files..."
                }
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isStreaming && uploadingFiles.length === 0) {
                    e.preventDefault();
                    if (canSend) {
                      handleSend();
                    }
                  }
                }}
              />

              <button
                type="button"
                className={`gemini-send-circle-btn${isStreaming ? " stop" : ""}`}
                onClick={() => (isStreaming ? abortRef.current?.abort() : handleSend())}
                disabled={!isStreaming && !canSend}
                title={
                  isStreaming
                    ? "Stop generation"
                    : uploadingFiles.length > 0
                    ? "Processing documents..."
                    : attachedDocs.length > 0 && !input.trim()
                    ? `Send & analyze attached ${attachedDocs.length} documents`
                    : "Send prompt"
                }
              >
                {isStreaming ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="gemini-disclaimer-text">
            Insurance AI Studio can make mistakes. Verify critical underwriting limits, policy wordings, and Solvency II regulatory articles.
          </div>
        </div>
      </div>

      {/* Multi-Document Tabbed Preview Modal */}
      <DocumentPreviewModal
        documents={previewDocs}
        initialActiveId={previewActiveId}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSaveToLake={(doc) => {
          if (doc) {
            setIngestDocs([doc]);
            setShowIngestModal(true);
          }
        }}
        onSaveAllToLake={(docs) => {
          setIngestDocs(docs);
          setShowIngestModal(true);
        }}
      />

      {/* Batch Document Ingest Modal */}
      <DocumentIngestModal
        initialDocuments={ingestDocs.length > 0 ? ingestDocs : attachedDocs}
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onIngestSuccess={() => {
          setShowIngestModal(false);
        }}
      />
    </div>
  );
}

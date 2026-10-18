"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ModelSelectWidget from "../ModelSelectWidget";
import StructuredMarkdown from "../StructuredMarkdown";
import GroundTruthPanel from "../GroundTruthPanel";
import { DocumentPreviewModal, ParsedDocument } from "../DocumentPreviewModal";
import ModelMaximizeModal from "./ModelMaximizeModal";
import HeadToHeadComparisonModal from "./HeadToHeadComparisonModal";
import {
  evaluateReferenceAnswer,
  calculateTokensPerSec,
  calculateWordCount,
  type ReferenceScoringPolicy,
  type ReferenceTaskResult,
} from "@/lib/benchmark-eval";
import {
  INSURANCE_BENCHMARKS,
  type InsuranceBenchmarkId,
  type InsuranceBenchmarkRecord,
} from "@/lib/insurance-benchmark-registry";
import {
  INSURANCE_USE_CASES,
  type InsuranceUseCaseId,
} from "@/lib/use-case-metrics";
import { BENCHMARK_GOLD_REGISTRY } from "@/lib/benchmark-gold-data";
import InsurancePluginSelector from "./InsurancePluginSelector";
import {
  INSURANCE_PLUGINS,
  type InsurancePluginId,
  type InsurancePluginDefinition,
  getInsurancePluginsForDataset,
} from "@/lib/insurance-plugins";

export interface SingleModelState {
  answer: string;
  reasoning: string;
  isRunning: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estCostUsd: number;
  startTime: number | null;
  elapsed: number;
  runStatus?: "success" | "failed" | "cancelled";
}

const emptyModelState = (): SingleModelState => ({
  answer: "",
  reasoning: "",
  isRunning: false,
  promptTokens: 0,
  completionTokens: 0,
  latencyMs: 0,
  estCostUsd: 0,
  startTime: null,
  elapsed: 0,
});

interface SampleItem {
  id: string;
  sourceRowNumber: number;
  preview: string;
  hasOptions: boolean;
}

interface Props {
  initialPrompt?: string;
  initialBenchmarkId?: InsuranceBenchmarkId;
  initialSampleId?: string;
  onClearInitialNavigation?: () => void;
}

const USE_CASES_LIST: { id: InsuranceUseCaseId; label: string; samplePrompt: string; goldKey: string }[] = [
  {
    id: "data-extraction",
    label: "Data Extraction",
    samplePrompt: "Extract all key commercial property policy terms from this insurance schedule: named insured, policy period, building replacement cost limit, deductible, and business interruption sub-limit.",
    goldKey: "SC-001",
  },
  {
    id: "policy-translation",
    label: "Policy Translation / Understanding",
    samplePrompt: "Explain how Section 4(c) 'Water Damage Exclusions' applies to a sudden pipe burst versus gradual seepage from an underground sewer line.",
    goldKey: "SC-002",
  },
  {
    id: "claim-assessment",
    label: "Claim Assessment",
    samplePrompt: "Adjudicate comprehensive auto coverage for stolen vehicle with recovery damages, calculating net payable indemnity after $500 deductible.",
    goldKey: "SC-004",
  },
  {
    id: "eiopa-regulatory",
    label: "EIOPA Regulatory Check",
    samplePrompt: "Review Solvency II Article 132 Prudent Person Principle compliance for life insurer allocating 18% of technical provisions into private credit funds.",
    goldKey: "SC-005",
  },
];

export default function SingleSampleEvaluation({
  initialPrompt,
  initialBenchmarkId = "accuracy-rigor",
  initialSampleId,
  onClearInitialNavigation,
}: Props) {
  // Insurance Plugin State
  const initialPlugin = getInsurancePluginsForDataset(initialBenchmarkId)[0] || INSURANCE_PLUGINS[0];
  const [activePluginId, setActivePluginId] = useState<InsurancePluginId>(initialPlugin.id);
  const activePlugin = INSURANCE_PLUGINS.find((p) => p.id === activePluginId) || INSURANCE_PLUGINS[0];

  // Source: Benchmark Dataset or Manual Question (Defaults to Attach Document / Custom Prompt)
  const [source, setSource] = useState<"benchmark" | "manual">("manual");

  // Models (defaults to fast, cost-efficient frontier models for sub-second responses)
  const [models, setModels] = useState<string[]>([
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
  ]);
  const [states, setStates] = useState<SingleModelState[]>([
    emptyModelState(),
    emptyModelState(),
  ]);

  // Layout Modes & Compact UI State
  const [layoutMode, setLayoutMode] = useState<"columns" | "stacked" | "tabbed">("columns");
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [activeTabModelIndex, setActiveTabModelIndex] = useState(0);
  const [syncScroll, setSyncScroll] = useState(true);
  const [maximizedModelIndex, setMaximizedModelIndex] = useState<number | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});

  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSyncingScroll = useRef(false);

  const handleBodyScroll = (idx: number, e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingScroll.current || layoutMode !== "columns") return;
    isSyncingScroll.current = true;
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    scrollContainerRefs.current.forEach((el, i) => {
      if (i !== idx && el) {
        el.scrollTop = scrollTop;
      }
    });
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Benchmark Dataset Selection
  const [benchmarkId, setBenchmarkId] = useState<InsuranceBenchmarkId>(initialBenchmarkId);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [currentBenchmarkRecord, setCurrentBenchmarkRecord] = useState<InsuranceBenchmarkRecord | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [sampleSearchQuery, setSampleSearchQuery] = useState("");

  // Manual Question Selection
  const [activeUseCase, setActiveUseCase] = useState<InsuranceUseCaseId>("data-extraction");
  const [manualPrompt, setManualPrompt] = useState(initialPrompt || "");

interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  status: "parsing" | "ocr" | "done" | "error";
  statusText?: string;
  error?: string;
}

function formatDocType(type: string): string {
  if (!type) return "Document";
  const upper = type.toUpperCase();
  if (upper.includes("OCR")) return "OCR";
  return type.replace(/\bAI\s*OCR\b/gi, "OCR");
}

  // Optional Context Documents (Multiple upload & drag-drop support)
  const [attachedDocs, setAttachedDocs] = useState<ParsedDocument[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ParsedDocument | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadQueueItem[]>([]);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // LLM Judge Audit State
  const [judgeAuditResults, setJudgeAuditResults] = useState<Record<string, any>>({});
  const [isJudging, setIsJudging] = useState<Record<string, boolean>>({});

  const handleRunJudge = async (modelId: string, modelAnswer: string) => {
    setIsJudging((prev) => ({ ...prev, [modelId]: true }));
    try {
      const res = await fetch("/api/benchmark/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: getEffectivePrompt(),
          correctAnswer: goldAnswer,
          options: currentOptions,
          modelAnswer,
          modelId,
          pluginId: activePlugin.id,
          pluginName: activePlugin.name,
          metrics: activePlugin.metrics.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Judge failed");
      setJudgeAuditResults((prev) => ({ ...prev, [modelId]: data }));
    } catch (err: any) {
      setJudgeAuditResults((prev) => ({
        ...prev,
        [modelId]: { error: err.message || "Judge failed" },
      }));
    } finally {
      setIsJudging((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  const handleRunJudgeAll = async () => {
    const promises = models.map((modelId, idx) => {
      const ans = states[idx]?.answer;
      if (ans) {
        return handleRunJudge(modelId, ans);
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  };

  const isAnyJudging = Object.values(isJudging).some(Boolean);

  // Chat Arena Hybrid Pipeline: pypdf (Python) on server + Mozilla PDF.js client pre-check + Tesseract.js WebAssembly OCR
  const uploadFileList = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    setDocUploadError(null);

    const fileList = Array.from(files);
    const queueItems: UploadQueueItem[] = fileList.map((f) => ({
      id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      status: "parsing",
      statusText: "Reading…",
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
              console.warn("Client digital text extraction pre-check in Head-to-Head:", digitalErr);
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
            throw new Error(data.error || `Failed to parse ${file.name}`);
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
                } else {
                  doc = {
                    ...doc,
                    text: imageText,
                    wordCount: imageText.split(/\s+/).filter(Boolean).length,
                    charCount: imageText.length,
                    type: "OCR",
                    preview: imageText.slice(0, 350) + "…",
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
      setAttachedDocs((prev) => [...prev, ...parsedResults]);
    }
    if (errors.length > 0) {
      setDocUploadError(errors.join(" | "));
    }
    setIsUploadingDoc(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => {
      setUploadingFiles([]);
    }, 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFileList(e.target.files);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Expanded reasoning traces
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const [showGroundTruth, setShowGroundTruth] = useState(false);

  const abortRefs = useRef<(AbortController | null)[]>([null, null, null, null]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAnyRunning = states.some((s) => s.isRunning);
  const hasCompletedInference = states.some((s) => Boolean(s.answer.trim()) && !s.isRunning);

  // Sync state length with models length
  useEffect(() => {
    setStates((prev) => {
      if (prev.length === models.length) return prev;
      if (prev.length < models.length) {
        const added = Array.from({ length: models.length - prev.length }, () => emptyModelState());
        return [...prev, ...added];
      }
      return prev.slice(0, models.length);
    });
  }, [models.length]);

  // Elapsed time ticker
  useEffect(() => {
    if (isAnyRunning) {
      tickerRef.current = setInterval(() => {
        setStates((prev) =>
          prev.map((s) =>
            s.isRunning && s.startTime ? { ...s, elapsed: Date.now() - s.startTime } : s
          )
        );
      }, 100);
    } else {
      if (tickerRef.current) clearInterval(tickerRef.current);
    }
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isAnyRunning]);

  // Load benchmark samples list when benchmarkId changes
  useEffect(() => {
    if (source !== "benchmark") return;
    const controller = new AbortController();
    setIsLoadingSamples(true);

    fetch(`/api/insurance-benchmarks?benchmarkId=${benchmarkId}&pageSize=50`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load samples");
        setSamples(body.samples || []);
        if (body.samples && body.samples.length > 0) {
          // If initialSampleId is specified, match it
          const matchIdx = initialSampleId
            ? body.samples.findIndex((s: SampleItem) => s.id === initialSampleId)
            : 0;
          setSelectedSampleIndex(matchIdx >= 0 ? matchIdx : 0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error loading benchmark samples:", err);
        }
      })
      .finally(() => {
        setIsLoadingSamples(false);
      });

    return () => controller.abort();
  }, [benchmarkId, source, initialSampleId]);

  // Fetch full sample record when selectedSampleIndex or samples change
  useEffect(() => {
    if (source !== "benchmark" || samples.length === 0) return;
    const sample = samples[selectedSampleIndex];
    if (!sample) return;

    const controller = new AbortController();
    fetch(`/api/insurance-benchmarks?benchmarkId=${benchmarkId}&sampleId=${sample.id}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to fetch sample record");
        setCurrentBenchmarkRecord(body.record);
        // Reset responses when question changes
        setStates(models.map(() => emptyModelState()));
        setShowGroundTruth(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load sample detail:", err);
        }
      });

    return () => controller.abort();
  }, [benchmarkId, selectedSampleIndex, samples, source]);

  // Clear initial external navigation
  useEffect(() => {
    if (initialPrompt) {
      setSource("manual");
      setManualPrompt(initialPrompt);
      onClearInitialNavigation?.();
    }
  }, [initialPrompt, onClearInitialNavigation]);

  // Add / Remove Model
  const handleAddModel = () => {
    if (models.length >= 4) return;
    const candidates = [
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-r1",
      "openai/gpt-4o",
      "deepseek/deepseek-chat",
      "dil/dil-v1",
      "nvidia/nemotron-3-super-120b-a12b:free",
    ];
    const nextModel = candidates.find((c) => !models.includes(c)) || candidates[0];
    setModels((prev) => [...prev, nextModel]);
    setStates((prev) => [...prev, emptyModelState()]);
  };

  const handleRemoveModel = (idx: number) => {
    if (models.length <= 1) return;
    abortRefs.current[idx]?.abort();
    setModels((prev) => prev.filter((_, i) => i !== idx));
    setStates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModelChange = (idx: number, newModelId: string) => {
    setModels((prev) => {
      const next = [...prev];
      next[idx] = newModelId;
      return next;
    });
    setStates((prev) => {
      const next = [...prev];
      next[idx] = emptyModelState();
      return next;
    });
  };

  // Derive current effective prompt
  const getEffectivePrompt = useCallback(() => {
    let questionText = "";
    if (source === "benchmark" && currentBenchmarkRecord) {
      const q = (currentBenchmarkRecord.fullQuestion || "").trim();
      const isCorrupted =
        !q ||
        q.includes("<think>") ||
        q.includes("</think>") ||
        (/^The core differences (between|of)/i.test(q) && q.length < 2000 && !q.includes("Question:")) ||
        (/[a-zA-Z0-9,\-]$/.test(q) &&
          !q.endsWith("A") &&
          !q.endsWith("B") &&
          !q.endsWith("C") &&
          !q.endsWith("D") &&
          !q.endsWith("E") &&
          ![".", "?", "!", "\"", "'", ")", "}", "]", ":"].includes(q.slice(-1)));

      if (isCorrupted && currentBenchmarkRecord.questionStem) {
        let healed = `You are a professional insurance expert. Please analyze and answer the following question thoroughly and accurately based on insurance principles:\n\n[QUESTION]\n${currentBenchmarkRecord.questionStem}`;
        if (currentBenchmarkRecord.options && Object.keys(currentBenchmarkRecord.options).length > 0) {
          healed +=
            `\n\nOptions:\n` +
            Object.entries(currentBenchmarkRecord.options)
              .map(([k, v]) => `${k}. ${v}`)
              .join("\n");
          healed += `\n\nAnswer:`;
        }
        questionText = healed;
      } else {
        questionText = currentBenchmarkRecord.fullQuestion || "";
      }
    } else {
      questionText = manualPrompt.trim();
    }

    if (attachedDocs.length === 0) return questionText;

    const docsContext = attachedDocs
      .map(
        (doc, idx) =>
          `[ATTACHED DOCUMENT ${idx + 1}: ${doc.name} | Type: ${doc.type}]\n--- DOCUMENT CONTENT START ---\n${doc.text || ""}\n--- DOCUMENT CONTENT END ---`
      )
      .join("\n\n");

    if (!questionText) {
      return `${docsContext}\n\n[TASK]\nPlease analyse these attached insurance documents according to standard insurance underwriting, claims assessment, and regulatory review principles. Summarise key findings, coverage limits, exclusions, deductibles, and risk indicators.`;
    }
    return `${docsContext}\n\n[QUESTION / INQUIRY]\n${questionText}`;
  }, [source, currentBenchmarkRecord, manualPrompt, attachedDocs]);

  // Stream a single model
  const streamSingleModel = useCallback(
    async (idx: number, modelId: string, promptText: string) => {
      abortRefs.current[idx] = new AbortController();
      const startTime = Date.now();

      const updateState = (updater: (curr: SingleModelState) => SingleModelState) => {
        setStates((prev) => {
          if (!prev[idx]) return prev;
          const next = [...prev];
          next[idx] = updater(next[idx]);
          return next;
        });
      };

      updateState((curr) => ({
        ...curr,
        ...emptyModelState(),
        isRunning: true,
        startTime,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            prompt: promptText,
            disableSystemPrompt: true,
            useTools: false,
            max_tokens: 1800,
          }),
          signal: abortRefs.current[idx]?.signal,
        });

        if (!res.ok || !res.body) {
          let errMsg = `Request failed (${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson.error) errMsg = errJson.error;
          } catch {
            // fallback
          }
          if (res.status === 504) {
            errMsg = `Upstream Gateway Timeout (504): Model "${modelId}" timed out on its upstream host. Switch to a fast model like GPT-4o Mini or Llama 3.3 70B for instant evaluation.`;
          }
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "failed",
            answer: `Inference Failed: ${errMsg}`,
            latencyMs: Date.now() - startTime,
          }));
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
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") {
              updateState((curr) => ({
                ...curr,
                isRunning: false,
                runStatus: curr.answer.trim() ? "success" : "failed",
                latencyMs: curr.latencyMs || Date.now() - startTime,
              }));
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "error" && parsed.error) {
                const errText = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
                updateState((curr) => ({
                  ...curr,
                  isRunning: false,
                  runStatus: "failed",
                  answer: `Inference Failed: ${errText}`,
                  latencyMs: curr.latencyMs || Date.now() - startTime,
                }));
                return;
              }

              if (parsed.type === "done" || parsed.t === "done") {
                updateState((curr) => ({
                  ...curr,
                  isRunning: false,
                  runStatus: curr.answer.trim() ? "success" : "failed",
                  latencyMs: curr.latencyMs || Date.now() - startTime,
                }));
                return;
              }

              // Reasoning chunk
              const reasoningChunk =
                parsed.delta && parsed.type === "reasoning"
                  ? parsed.delta
                  : parsed.t === "reasoning"
                  ? parsed.c
                  : null;
              if (reasoningChunk) {
                updateState((curr) => ({
                  ...curr,
                  reasoning: curr.reasoning + reasoningChunk,
                }));
              }

              // Content chunk
              const contentChunk =
                parsed.delta && (parsed.type === "content" || parsed.type === "text")
                  ? parsed.delta
                  : parsed.t === "text" || parsed.t === "content"
                  ? parsed.c
                  : null;
              if (contentChunk) {
                updateState((curr) => ({
                  ...curr,
                  answer: curr.answer + contentChunk,
                }));
              }

              // Usage / metrics
              const u = parsed.usage || (parsed.t === "metrics" ? parsed.data : null);
              if (u) {
                updateState((curr) => ({
                  ...curr,
                  promptTokens: u.prompt_tokens ?? curr.promptTokens,
                  completionTokens: u.completion_tokens ?? curr.completionTokens,
                  latencyMs: u.latency_ms ?? curr.latencyMs,
                  estCostUsd: u.total_cost_usd ?? u.cost ?? curr.estCostUsd,
                }));
              }
            } catch {
              // Ignore non-JSON lines
            }
          }
        }

        updateState((curr) => {
          const finalAnswer = curr.answer.trim() || curr.reasoning.trim();
          return {
            ...curr,
            answer: finalAnswer || curr.answer,
            isRunning: false,
            runStatus: finalAnswer ? "success" : "failed",
            latencyMs: curr.latencyMs || Date.now() - startTime,
          };
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "cancelled",
            latencyMs: Date.now() - startTime,
          }));
        } else {
          updateState((curr) => ({
            ...curr,
            isRunning: false,
            runStatus: "failed",
            answer: `[Error: ${(err as Error)?.message || "Network error"}]`,
            latencyMs: Date.now() - startTime,
          }));
        }
      }
    },
    []
  );

  // Run Comparison action
  const handleRunComparison = () => {
    const promptText = getEffectivePrompt();
    if (!promptText.trim() || isAnyRunning) return;

    setShowGroundTruth(false);
    setIsConfigCollapsed(true);
    setJudgeAuditResults({});

    // Initialize all model states simultaneously
    setStates(
      models.map(() => ({
        ...emptyModelState(),
        isRunning: true,
        startTime: Date.now(),
      }))
    );

    // Launch all model inferences in parallel simultaneously
    Promise.all(
      models.map((modelId, idx) => streamSingleModel(idx, modelId, promptText))
    ).catch((err) => {
      console.error("Error in simultaneous model evaluation:", err);
    });
  };

  const handleStopAll = () => {
    abortRefs.current.forEach((ref) => ref?.abort());
    setStates((prev) => prev.map((s) => ({ ...s, isRunning: false })));
  };

  const handleReset = () => {
    handleStopAll();
    setStates(models.map(() => emptyModelState()));
    setShowGroundTruth(false);
    setIsConfigCollapsed(false);
  };

  // Sample Navigation
  const handlePrevSample = () => {
    if (selectedSampleIndex > 0) {
      setSelectedSampleIndex((prev) => prev - 1);
    }
  };

  const handleNextSample = () => {
    if (selectedSampleIndex < samples.length - 1) {
      setSelectedSampleIndex((prev) => prev + 1);
    }
  };

  // Ground Truth reference determination (ONLY present for benchmark dataset samples, never for documents)
  const goldAnswer =
    source === "benchmark" ? currentBenchmarkRecord?.correctAnswer : undefined;

  const isDocumentOrManual = source === "manual" || attachedDocs.length > 0 || !goldAnswer;

  const currentOptions =
    source === "benchmark" ? currentBenchmarkRecord?.options || {} : {};

  const scoringPolicy: ReferenceScoringPolicy = {
    type: "auto",
    absoluteTolerance: 0,
    relativeTolerance: 0,
  };

  // Filtered samples for quick jump
  const filteredSamples = samples.filter((s) =>
    sampleSearchQuery
      ? s.id.toLowerCase().includes(sampleSearchQuery.toLowerCase()) ||
        s.preview.toLowerCase().includes(sampleSearchQuery.toLowerCase())
      : true
  );

  // Calculate Executive Verdict
  const answeredModels = models
    .map((mId, idx) => ({ idx, modelId: mId, state: states[idx] || emptyModelState() }))
    .filter((m) => !!m.state.answer);

  const hasVerdict = answeredModels.length >= 2;

  let speedVerdict: string | null = null;
  let accuracyVerdict: string | null = null;
  let tokenVerdict: string | null = null;

  if (hasVerdict) {
    // Latency comparison
    const sortedByLatency = [...answeredModels]
      .filter((m) => m.state.latencyMs > 0)
      .sort((a, b) => a.state.latencyMs - b.state.latencyMs);

    if (sortedByLatency.length >= 2) {
      const fastest = sortedByLatency[0];
      const second = sortedByLatency[1];
      const ratio = second.state.latencyMs / Math.max(fastest.state.latencyMs, 1);
      if (ratio >= 1.2) {
        speedVerdict = `Model ${String.fromCharCode(65 + fastest.idx)} (${fastest.modelId.split("/").pop()}) is ${ratio.toFixed(1)}x faster (${(fastest.state.latencyMs / 1000).toFixed(1)}s vs ${(second.state.latencyMs / 1000).toFixed(1)}s)`;
      } else {
        speedVerdict = `Comparable speeds (~${(fastest.state.latencyMs / 1000).toFixed(1)}s)`;
      }
    }

    // Token comparison
    const sortedTokens = [...answeredModels].sort((a, b) => b.state.completionTokens - a.state.completionTokens);
    if (sortedTokens.length >= 2) {
      const mostVerbose = sortedTokens[0];
      const mostConcise = sortedTokens[sortedTokens.length - 1];
      tokenVerdict = `Model ${String.fromCharCode(65 + mostVerbose.idx)}: ${mostVerbose.state.completionTokens} tokens vs Model ${String.fromCharCode(65 + mostConcise.idx)}: ${mostConcise.state.completionTokens} tokens`;
    }
  }

  const renderModelCard = (modelId: string, idx: number, isStacked = false) => {
    const state = states[idx] || emptyModelState();
    const tps = calculateTokensPerSec(state.latencyMs, state.completionTokens);
    const isCollapsed = isStacked && !!collapsedCards[idx];

    return (
      <div
        key={modelId + idx}
        className={isStacked ? "h2h-stacked-card" : undefined}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
          minWidth: !isStacked && layoutMode === "columns" && models.length > 2 ? "380px" : undefined,
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: isCollapsed ? "none" : "1px solid var(--border-default)",
            background: "var(--bg-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                Model {String.fromCharCode(65 + idx)}
              </span>
              <div style={{ minWidth: "160px" }}>
                <ModelSelectWidget
                  label=""
                  value={modelId}
                  disabled={isAnyRunning}
                  onChange={(newId) => handleModelChange(idx, newId)}
                  compact={true}
                />
              </div>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-subtle)",
                marginTop: "3px",
                fontFamily: "var(--font-mono)",
              }}
            >
              {state.isRunning ? (
                <span style={{ color: "var(--accent)" }}>
                  Running… {(state.elapsed / 1000).toFixed(1)}s
                </span>
              ) : state.latencyMs > 0 ? (
                `${(state.latencyMs / 1000).toFixed(2)}s · ${state.completionTokens} tokens · ${tps} t/s`
              ) : (
                "Ready to compare"
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Maximize Zen Reader Button */}
            {state.answer && (
              <button
                type="button"
                onClick={() => setMaximizedModelIndex(idx)}
                className="arena-header-btn"
                title="Open in distraction-free reader"
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                ⤢ Maximize
              </button>
            )}

            {/* Stacked Accordion Collapse/Expand Button */}
            {isStacked && (
              <button
                type="button"
                onClick={() =>
                  setCollapsedCards((prev) => ({
                    ...prev,
                    [idx]: !prev[idx],
                  }))
                }
                className="arena-header-btn"
                style={{ padding: "3px 8px", fontSize: "11px" }}
                title={isCollapsed ? "Expand card" : "Collapse card"}
              >
                {isCollapsed ? "▼ Expand" : "▲ Collapse"}
              </button>
            )}
          </div>
        </div>

        {/* Card Body (only rendered if not collapsed) */}
        {!isCollapsed && (
          <>
            {/* Reasoning trace toggle if present */}
            {state.reasoning && (
              <div
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-canvas-subtle)",
                  padding: "6px 14px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedReasoning((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-subtle)",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: 0,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: expandedReasoning[idx] ? "rotate(90deg)" : "none", transition: "transform 150ms" }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span>Thinking Trace ({state.reasoning.length} chars)</span>
                </button>

                {expandedReasoning[idx] && (
                  <div
                    style={{
                      marginTop: "6px",
                      maxHeight: "180px",
                      overflowY: "auto",
                      fontSize: "11.5px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {state.reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Response Body */}
            <div
              ref={(el) => {
                scrollContainerRefs.current[idx] = el;
              }}
              onScroll={(e) => handleBodyScroll(idx, e)}
              style={{
                padding: "16px",
                flex: 1,
                minHeight: isStacked ? "200px" : "260px",
                maxHeight: isStacked ? "600px" : "500px",
                overflowY: "auto",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "var(--text-main)",
              }}
            >
              {state.isRunning && !state.answer ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-subtle)" }}>
                  <span className="live-dot" />
                  Generating response…
                </div>
              ) : state.runStatus === "failed" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ color: "var(--rose)", fontSize: "12.5px" }}>
                    {state.answer || "Model failed to produce a valid response."}
                  </div>
                  {/504|timeout|timed out|gateway/i.test(state.answer) && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(59, 130, 246, 0.08)",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                        fontSize: "11.5px",
                        color: "var(--text-main)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span><strong>Tip:</strong> Upstream provider timed out. Switch to a high-throughput paid model for instant answers.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newModels = [...models];
                          newModels[idx] = "openai/gpt-4o-mini";
                          setModels(newModels);
                          setStates((prev) => {
                            const next = [...prev];
                            next[idx] = emptyModelState();
                            return next;
                          });
                        }}
                        style={{
                          background: "var(--emerald)",
                          color: "#fff",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "11px",
                        }}
                      >
                        Switch to GPT-4o Mini
                      </button>
                    </div>
                  )}
                </div>
              ) : state.answer ? (
                <StructuredMarkdown content={state.answer} />
              ) : (
                <div style={{ color: "var(--text-subtle)", fontStyle: "italic", textAlign: "center", marginTop: "80px" }}>
                  Model response will appear here after clicking <strong>Run Comparison</strong>.
                </div>
              )}
            </div>

            {/* Integrated In-Card LLM-as-a-Judge Audit (Columns & Stacked) */}
            {state.answer && (
              <div style={{ padding: "0 14px 12px 14px" }}>
                {judgeAuditResults[modelId] ? (
                  <div className="h2h-inline-judge-card">
                    {judgeAuditResults[modelId].error ? (
                      <div style={{ color: "var(--rose)", fontSize: "11px" }}>
                        Error: {judgeAuditResults[modelId].error}
                      </div>
                    ) : (
                      <>
                        <div className="h2h-inline-judge-header">
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "12px",
                              color: "var(--text-main)",
                            }}
                          >
                            LLM Judge Audit
                          </span>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: judgeAuditResults[modelId].complianceStatus === "compliant"
                                  ? "rgba(52, 168, 83, 0.15)"
                                  : judgeAuditResults[modelId].complianceStatus === "warning"
                                  ? "rgba(234, 179, 8, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                                color: judgeAuditResults[modelId].complianceStatus === "compliant"
                                  ? "var(--emerald)"
                                  : judgeAuditResults[modelId].complianceStatus === "warning"
                                  ? "#eab308"
                                  : "var(--rose)",
                                textTransform: "uppercase",
                                fontWeight: 700,
                              }}
                            >
                              {judgeAuditResults[modelId].complianceStatus}
                            </span>
                            <span
                              style={{
                                color:
                                  (judgeAuditResults[modelId].scoreOutOf100 ?? 0) >= 80
                                    ? "var(--emerald)"
                                    : (judgeAuditResults[modelId].scoreOutOf100 ?? 0) >= 60
                                    ? "var(--amber, #f59e0b)"
                                    : "var(--rose)",
                                fontWeight: 800,
                                fontSize: "12px",
                                background: "var(--bg-surface-elevated)",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                border: "1px solid var(--border-subtle)",
                              }}
                            >
                              Score: {judgeAuditResults[modelId].scoreOutOf100 ?? Math.round((judgeAuditResults[modelId].reasoningScore || 0) * 20)}/100
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRunJudge(modelId, state.answer)}
                              disabled={isJudging[modelId]}
                              style={{
                                background: "transparent",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-subtle)",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "10px",
                                cursor: isJudging[modelId] ? "not-allowed" : "pointer",
                              }}
                              title="Re-audit this model response"
                            >
                              Re-Audit
                            </button>
                          </div>
                        </div>

                        {/* Concise small message / verdict finding */}
                        {judgeAuditResults[modelId].rationale && (
                          <div className="h2h-inline-judge-verdict">
                            <strong style={{ color: "var(--text-main)" }}>Verdict: </strong>
                            <span>{judgeAuditResults[modelId].rationale}</span>
                          </div>
                        )}

                        {/* Metric Score Breakdown */}
                        {judgeAuditResults[modelId].metricScores &&
                          Object.keys(judgeAuditResults[modelId].metricScores).length > 0 && (
                            <div className="h2h-inline-judge-metrics">
                              <div
                                style={{
                                  fontSize: "9.5px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  color: "var(--text-subtle)",
                                  fontWeight: 700,
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>Insurance Metric Breakdown</span>
                                <span>Scale 0–100</span>
                              </div>
                              {Object.entries(judgeAuditResults[modelId].metricScores).map(
                                ([metName, metScore]: [string, any]) => {
                                  const num = typeof metScore === "number" ? metScore : 0;
                                  const barColor =
                                    num >= 80
                                      ? "var(--emerald)"
                                      : num >= 60
                                      ? "var(--amber, #f59e0b)"
                                      : "var(--rose)";
                                  return (
                                    <div
                                      key={metName}
                                      style={{ display: "flex", flexDirection: "column", gap: "2px" }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          fontSize: "10.5px",
                                        }}
                                      >
                                        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{metName}</span>
                                        <span style={{ fontWeight: 700, color: barColor }}>{num}/100</span>
                                      </div>
                                      <div
                                        style={{
                                          height: "5px",
                                          width: "100%",
                                          background: "rgba(255, 255, 255, 0.08)",
                                          borderRadius: "3px",
                                          overflow: "hidden",
                                          border: "1px solid rgba(255, 255, 255, 0.05)",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: `${Math.min(100, Math.max(0, num))}%`,
                                            height: "100%",
                                            background: barColor,
                                            borderRadius: "3px",
                                            transition: "width 0.3s ease",
                                          }}
                                        />
                                      </div>
                                      {judgeAuditResults[modelId].metricFindings?.[metName] && (
                                        <div
                                          style={{
                                            fontSize: "9.5px",
                                            color: "var(--text-subtle)",
                                            fontStyle: "italic",
                                            lineHeight: 1.3,
                                            marginTop: "1px",
                                          }}
                                        >
                                          {judgeAuditResults[modelId].metricFindings[metName]}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                ) : isJudging[modelId] ? (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      color: "#38bdf8",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span className="live-dot" style={{ background: "#38bdf8" }} />
                    Auditing response with LLM Judge against {activePlugin.name} metrics…
                  </div>
                ) : (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      id={`btn-audit-model-${idx}`}
                      type="button"
                      onClick={() => handleRunJudge(modelId, state.answer)}
                      disabled={isJudging[modelId]}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "5px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(56, 189, 248, 0.12)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Run LLM Judge evaluation on this model response"
                    >
                      Audit with LLM Judge
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Performance & Operational Metrics Footer */}
            {state.answer && (
              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid var(--border-default)",
                  background: "var(--bg-canvas)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--text-subtle)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div>
                  Tokens: {state.completionTokens} out / {state.promptTokens} in
                </div>
                <div>
                  {state.estCostUsd > 0
                    ? `Cost: $${state.estCostUsd.toFixed(5)}`
                    : "Cost: $0.00 (Free tier)"}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── STAGE 1: CONFIGURE ──────────────────────────────────────────────── */}
      {isConfigCollapsed ? (
        <div className="h2h-config-summary-bar">
          <div className="h2h-summary-chips">
            <span className="h2h-chip category">
              {source === "benchmark" ? (INSURANCE_BENCHMARKS.find((b) => b.id === benchmarkId)?.name || benchmarkId) : (USE_CASES_LIST.find((u) => u.id === activeUseCase)?.label || activeUseCase)}
            </span>
            <span className="h2h-chip sample">
              {source === "benchmark" ? (currentBenchmarkRecord?.id || `Sample #${selectedSampleIndex + 1}`) : "Manual Testing"}
            </span>
            <span className="h2h-chip models">
              {models.map((m, i) => `Model ${String.fromCharCode(65 + i)}: ${m.split("/").pop()}`).join(" vs ")}
            </span>
            {attachedDocs.length > 0 && (
              <span className="h2h-chip doc">
                {attachedDocs.length === 1 ? attachedDocs[0].name : `${attachedDocs.length} Docs Attached`}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsConfigCollapsed(false)}
              className="arena-header-btn"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
            >
              Edit Configuration
            </button>
            {isAnyRunning ? (
              <button
                type="button"
                onClick={handleStopAll}
                className="arena-header-btn"
                style={{ color: "var(--rose)", borderColor: "var(--rose)" }}
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={!getEffectivePrompt().trim()}
                className="arena-header-btn"
                style={{ background: "var(--accent)", color: "var(--text-inverted)" }}
              >
                Re-Run
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <section
          aria-label="Stage 1: Configure Evaluation"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--accent-border)",
                  }}
                >
                  Stage 1
                </span>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                  Configure Single-Sample Evaluation
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-subtle)" }}>
                Select evaluation source, domain category, and target models to inspect head-to-head.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsConfigCollapsed(true)}
                className="arena-header-btn"
                title="Collapse configuration panel to save space"
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                ▲ Collapse Config
              </button>
            </div>
          </div>

        {/* ── STAGE 1: 2-COLUMN SIDE PANEL LAYOUT ───────────────────────── */}
        <div className="h2h-stage1-layout" style={{ marginTop: "8px" }}>
          {/* LEFT SIDE PANEL (~330px): Models first, then Use Cases */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Card 1: Evaluation Models Selection */}
            <div className="h2h-sidepanel-card">
              <div className="h2h-sidepanel-header">
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Models ({models.length} of 4)</span>
                </span>
                {models.length < 4 && !isAnyRunning && (
                  <button
                    type="button"
                    onClick={handleAddModel}
                    className="h2h-add-model-btn"
                    style={{ fontSize: "10.5px", padding: "2px 8px" }}
                  >
                    + Add Model
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {models.map((mId, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-surface-elevated)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      padding: "8px 10px",
                    }}
                  >
                    <ModelSelectWidget
                      label={`Model ${String.fromCharCode(65 + idx)}`}
                      value={mId}
                      disabled={isAnyRunning}
                      onChange={(newId) => handleModelChange(idx, newId)}
                      onRemove={models.length > 2 && !isAnyRunning ? () => handleRemoveModel(idx) : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Insurance Use Cases */}
            <div className="h2h-sidepanel-card" style={{ padding: "12px 14px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>
                  Use Cases
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "8px",
                    background: "rgba(66, 133, 244, 0.12)",
                    color: "var(--accent)",
                    border: "1px solid rgba(66, 133, 244, 0.25)",
                  }}
                >
                  {INSURANCE_PLUGINS.length} Available
                </span>
              </div>

              <InsurancePluginSelector
                compact={true}
                hideDetails={true}
                hideHeader={true}
                activePluginId={activePluginId}
                onSelectPlugin={(plugin) => {
                  setActivePluginId(plugin.id);
                  setBenchmarkId(plugin.datasetIds[0]);
                  setSelectedSampleIndex(0);
                  handleReset();
                }}
                activeDatasetId={benchmarkId}
                onSelectDataset={(dsId) => {
                  setBenchmarkId(dsId);
                  setSelectedSampleIndex(0);
                  handleReset();
                }}
              />
            </div>
          </aside>

          {/* RIGHT MAIN PANEL (flex: 1) */}
          <main style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>

          {/* Dual Input Source Switch (Dataset Example vs Document Attachment) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              padding: "10px 14px",
              background: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-subtle)",
                }}
              >
                Evaluation Input Mode:
              </span>
              <div
                style={{
                  display: "flex",
                  background: "var(--bg-canvas)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px",
                  border: "1px solid var(--border-default)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isAnyRunning) {
                      setSource("benchmark");
                      handleReset();
                    }
                  }}
                  disabled={isAnyRunning}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "4px",
                    background: source === "benchmark" ? "var(--accent)" : "transparent",
                    color: source === "benchmark" ? "var(--text-inverted)" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "12px",
                    border: "none",
                    cursor: isAnyRunning ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  Example from Dataset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAnyRunning) {
                      setSource("manual");
                      handleReset();
                    }
                  }}
                  disabled={isAnyRunning}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "4px",
                    background: source === "manual" ? "var(--accent)" : "transparent",
                    color: source === "manual" ? "var(--text-inverted)" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "12px",
                    border: "none",
                    cursor: isAnyRunning ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  Attach Document / Custom Prompt
                </button>
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "6px" }}>
              {source === "benchmark" ? (
                <span>Plugin: <strong>{activePlugin.name}</strong> · Mapped Benchmark CSV</span>
              ) : (
                <span>Supports PDF, DOCX, CSV, TXT & Images with Multi-File Upload</span>
              )}
            </div>
          </div>

          {/* Mode 1: Benchmark Dataset Samples */}
          {source === "benchmark" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Selected Question Sample ({samples.length > 0 ? `${selectedSampleIndex + 1} of ${samples.length}` : "Loading..."})
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handlePrevSample}
                      disabled={isAnyRunning || selectedSampleIndex <= 0}
                      style={{
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        color: selectedSampleIndex > 0 ? "var(--text-main)" : "var(--text-subtle)",
                        cursor: selectedSampleIndex > 0 ? "pointer" : "not-allowed",
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSample}
                      disabled={isAnyRunning || selectedSampleIndex >= samples.length - 1}
                      style={{
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        color: selectedSampleIndex < samples.length - 1 ? "var(--text-main)" : "var(--text-subtle)",
                        cursor: selectedSampleIndex < samples.length - 1 ? "pointer" : "not-allowed",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Inline attachment option in benchmark mode */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnyRunning || isUploadingDoc}
                    className="arena-header-btn"
                    style={{ fontSize: "11px", padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    title="Optionally attach insurance policy files to augment this sample"
                  >
                    <span>{isUploadingDoc ? "Parsing & Running OCR…" : attachedDocs.length > 0 ? `Docs Attached (${attachedDocs.length})` : "Attach Policy Document (Optional)"}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.csv,.txt,.json,.md,.png,.jpg,.jpeg,.webp"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Sample Selector Dropdown */}
              <select
                value={selectedSampleIndex}
                disabled={isAnyRunning || isLoadingSamples}
                onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {samples.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    [{s.id}] {s.preview}
                  </option>
                ))}
              </select>

              {/* Attached docs chips in benchmark mode if present */}
              {attachedDocs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-subtle)" }}>Context Docs:</span>
                  {attachedDocs.map((doc, dIdx) => {
                    const isDocPdf = doc.name.toLowerCase().endsWith(".pdf") || doc.type?.toLowerCase().includes("pdf") || doc.mimeType === "application/pdf";
                    return (
                      <div
                        key={doc.id || dIdx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-sm)",
                          padding: "2px 7px",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "var(--text-main)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.name}>
                          {doc.name}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: doc.type?.includes("OCR") ? "rgba(168, 85, 247, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: doc.type?.includes("OCR") ? "#c084fc" : "var(--accent)",
                            border: `1px solid ${doc.type?.includes("OCR") ? "rgba(168, 85, 247, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                            textTransform: "uppercase",
                          }}
                        >
                          {doc.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setShowDocPreview(true);
                          }}
                          style={{
                            background: "var(--accent-dim)",
                            border: "1px solid var(--accent-border)",
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontSize: "10.5px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            fontWeight: 600,
                          }}
                          title={isDocPdf ? "Open interactive Visual PDF Reader" : "Preview Document"}
                        >
                          {isDocPdf ? "📄 PDF Reader" : "👁 View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachedDocs((prev) => prev.filter((_, i) => i !== dIdx))}
                          style={{ background: "transparent", border: "none", color: "var(--rose)", cursor: "pointer", fontSize: "11px", padding: 0 }}
                          title="Remove attached doc"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Question Display Card */}
              {currentBenchmarkRecord && (
                <div
                  style={{
                    background: "var(--bg-canvas)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "var(--text-main)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "10.5px", fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700 }}>
                      QUESTION PROMPT · {currentBenchmarkRecord.id}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                      Source Row: {currentBenchmarkRecord.sourceRowNumber}
                    </span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {currentBenchmarkRecord.fullQuestion}
                  </div>

                  {Object.keys(currentBenchmarkRecord.options).length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid var(--border-subtle)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "6px",
                      }}
                    >
                      {Object.entries(currentBenchmarkRecord.options).map(([letter, text]) => (
                        <div key={letter} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          <strong style={{ color: "var(--accent)" }}>{letter}:</strong> {text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Multi-File Drag & Drop Upload + Custom Prompt */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? "2px dashed var(--accent)" : "1.5px dashed var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  background: isDragging ? "rgba(66, 133, 244, 0.08)" : "var(--bg-canvas)",
                  padding: "16px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.csv,.txt,.json,.md,.png,.jpg,.jpeg,.webp"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: "13px", fontWeight: 700, color: isUploadingDoc ? "var(--accent)" : "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  {isUploadingDoc && <span className="live-dot" />}
                  {isUploadingDoc ? "Running Hybrid pypdf & Tesseract OCR Pipeline…" : "Drop insurance documents here, or click to browse"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                  {isUploadingDoc
                    ? "Hybrid Engine Active: Python pypdf + Mozilla PDF.js + Tesseract.js WebAssembly OCR"
                    : "Supports PDF policy wordings (Digital & Scanned), inspection images (PNG/JPG), DOCX, CSV, and TXT"}
                </div>
              </div>

              {/* Upload Queue Banner (Chat Arena parity) */}
              {uploadingFiles.length > 0 && (
                <div className="arena-multi-upload-banner" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="arena-upload-spinner" />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                      Processing {uploadingFiles.length} file{uploadingFiles.length > 1 ? "s" : ""} (pypdf & Free OCR)…
                    </span>
                  </div>
                  <div className="arena-multi-upload-items" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {uploadingFiles.map((item) => (
                      <span key={item.id} className={`arena-multi-upload-item ${item.status}`} title={item.statusText || item.name}>
                        {item.status === "parsing" || item.status === "ocr" ? "…" : item.status === "done" ? "Done" : "Error"}
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
              {docUploadError && (
                <div className="doc-upload-error-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{docUploadError}</span>
                  <button
                    type="button"
                    onClick={() => setDocUploadError(null)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "14px" }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Uploaded Documents Chip Tray */}
              {attachedDocs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Attached Docs ({attachedDocs.length}):
                  </span>
                  {attachedDocs.map((doc, dIdx) => {
                    const isDocPdf = doc.name.toLowerCase().endsWith(".pdf") || doc.type?.toLowerCase().includes("pdf") || doc.mimeType === "application/pdf";
                    return (
                      <div
                        key={doc.id || dIdx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-sm)",
                          padding: "4px 9px",
                          fontSize: "11.5px",
                        }}
                      >
                        <strong style={{ color: "var(--text-main)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.name}>
                          {doc.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: doc.type?.includes("OCR") ? "rgba(168, 85, 247, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: doc.type?.includes("OCR") ? "#c084fc" : "var(--accent)",
                            border: `1px solid ${doc.type?.includes("OCR") ? "rgba(168, 85, 247, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                            textTransform: "uppercase",
                          }}
                        >
                          {doc.type}
                        </span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                          ({doc.formattedSize || `${doc.wordCount}w`})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDoc(doc);
                            setShowDocPreview(true);
                          }}
                          style={{
                            background: "var(--accent-dim)",
                            border: "1px solid var(--accent-border)",
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                          title={isDocPdf ? "Open interactive Visual PDF Reader" : "Preview Document"}
                        >
                          {isDocPdf ? "📄 PDF Reader" : "👁 View"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedDocs((prev) => prev.filter((_, i) => i !== dIdx));
                          }}
                          style={{ background: "transparent", border: "none", color: "var(--rose)", cursor: "pointer", fontSize: "13px", padding: "0 2px" }}
                          title="Remove Document"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setAttachedDocs([])}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              {docUploadError && (
                <div style={{ fontSize: "11.5px", color: "var(--rose)" }}>
                  {docUploadError}
                </div>
              )}

              {/* Clean Custom Prompt / Task Instructions Input (Inquiry prompt replaced with clean prompt input) */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                  Custom Prompt / Task Instructions (Optional)
                </label>
                <textarea
                  value={manualPrompt}
                  onChange={(e) => setManualPrompt(e.target.value)}
                  rows={4}
                  placeholder="Type your insurance query, claim review question, coverage interpretation task, or specific instructions for analyzing the document(s)..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-canvas)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
                  If left blank, models will automatically perform a comprehensive standard insurance analysis on the attached document(s).
                </div>
              </div>
            </div>
          )}

          {/* Target Evaluation Metrics Card inside Main Panel */}
          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                LLM Judge Target Metrics (Scored 0–100):
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                Active Use Case: <strong>{activePlugin.name}</strong>
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {activePlugin.metrics.map((metric, mIdx) => (
                <div
                  key={metric.id}
                  title={metric.description}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "var(--emerald)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ fontSize: "9px", opacity: 0.8 }}>M{mIdx + 1}</span>
                  <span>{metric.name}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </section>

      {/* ── STAGE 2: RUN ────────────────────────────────────────────────────── */}
      <section
        aria-label="Stage 2: Run Comparison"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--emerald)",
              background: "var(--emerald-dim)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(52, 168, 83, 0.3)",
            }}
          >
            Stage 2
          </span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
              Run Head-to-Head Comparison
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "1px" }}>
              All {models.length} selected models receive the exact same prompt and permitted context.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAnyRunning ? (
            <button
              type="button"
              onClick={handleStopAll}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(217, 101, 112, 0.15)",
                border: "1px solid var(--rose)",
                color: "var(--rose)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Stop Inference
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={isAnyRunning || !getEffectivePrompt().trim()}
              style={{
                padding: "8px 22px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                border: "1px solid var(--accent-border)",
                color: "var(--text-inverted)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: getEffectivePrompt().trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(66, 133, 244, 0.25)",
              }}
            >
              Run Comparison
            </button>
          )}

          {hasCompletedInference && !isAnyRunning && (
            <button
              type="button"
              onClick={handleReset}
              className="arena-header-btn"
            >
              Clear Results
            </button>
          )}
        </div>
      </section>
      </>
      )}

      {/* ── STAGE 3: INSPECT ────────────────────────────────────────────────── */}
      <section
        aria-label="Stage 3: Inspect Model Responses"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Executive Verdict Banner */}
        {hasVerdict && (
          <div
            className="h2h-verdict-strip"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                }}
              >
                Executive Comparison Verdict:
              </span>
              {speedVerdict && (
                <span className="h2h-verdict-badge speed-win">
                  {speedVerdict}
                </span>
              )}
              {tokenVerdict && (
                <span className="h2h-verdict-badge tie">
                  {tokenVerdict}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--cyan)",
                background: "var(--cyan-dim)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--cyan-border)",
              }}
            >
              Stage 3
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
              Inspect Model Responses & Evaluation
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Unified 1-Click LLM Judge Audit Trigger */}
            <button
              type="button"
              onClick={handleRunJudgeAll}
              disabled={isAnyJudging || isAnyRunning || !states.some((s) => !!s.answer)}
              className="arena-header-btn"
              style={{
                fontSize: "11px",
                padding: "5px 12px",
                color: "#38bdf8",
                borderColor: "rgba(56, 189, 248, 0.35)",
                background: "rgba(56, 189, 248, 0.08)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              id="btn-audit-all-judge"
              title="Run LLM Judge evaluation across all model responses simultaneously"
            >
              {isAnyJudging && <span className="live-dot" style={{ background: "#38bdf8" }} />}
              {isAnyJudging ? "Auditing with LLM Judge…" : "Audit All with LLM Judge"}
            </button>

            {/* 3-Way Layout Switcher */}
            <div className="h2h-segmented-control" role="group" aria-label="Layout mode">
              <button
                id="btn-layout-columns"
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "columns" ? "active" : ""}`}
                onClick={() => setLayoutMode("columns")}
                title="Side-by-side columns with horizontal scroll rail"
              >
                Columns
              </button>
              <button
                id="btn-layout-stacked"
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "stacked" ? "active" : ""}`}
                onClick={() => setLayoutMode("stacked")}
                title="Full-width stacked rows with collapsible cards"
              >
                Stacked
              </button>
              <button
                id="btn-layout-tabbed"
                type="button"
                className={`h2h-segmented-btn ${layoutMode === "tabbed" ? "active" : ""}`}
                onClick={() => setLayoutMode("tabbed")}
                title="Single-model focus reader with tabs"
              >
                Tabbed Focus
              </button>
            </div>

            {/* Auxiliary controls */}
            {layoutMode === "columns" && (
              <button
                type="button"
                onClick={() => setSyncScroll(!syncScroll)}
                className="arena-header-btn"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                title="Synchronize vertical scrolling across columns"
              >
                {syncScroll ? "Sync Scroll: ON" : "Sync Scroll: OFF"}
              </button>
            )}

            {layoutMode === "stacked" && (
              <button
                type="button"
                onClick={() => {
                  const allCollapsed =
                    models.length > 0 &&
                    models.every((_, i) => !!collapsedCards[i]);
                  if (allCollapsed) {
                    setCollapsedCards({});
                  } else {
                    const all: Record<number, boolean> = {};
                    models.forEach((_, i) => (all[i] = true));
                    setCollapsedCards(all);
                  }
                }}
                className="arena-header-btn"
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                {models.length > 0 && models.every((_, i) => !!collapsedCards[i])
                  ? "Expand All"
                  : "Collapse All"}
              </button>
            )}

            {source === "benchmark" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={handlePrevSample}
                  disabled={isAnyRunning || selectedSampleIndex <= 0}
                  className="arena-header-btn"
                  title="Go to previous benchmark sample"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextSample}
                  disabled={isAnyRunning || selectedSampleIndex >= samples.length - 1}
                  className="arena-header-btn"
                  title="Go to next benchmark sample"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Model Output View */}
        {layoutMode === "columns" && (
          <div
            className="h2h-columns-rail"
            style={{
              gridTemplateColumns:
                models.length > 2
                  ? `repeat(${models.length}, minmax(380px, 1fr))`
                  : `repeat(${models.length}, minmax(0, 1fr))`,
            }}
          >
            {models.map((modelId, idx) => renderModelCard(modelId, idx, false))}
          </div>
        )}

        {layoutMode === "stacked" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {models.map((modelId, idx) => renderModelCard(modelId, idx, true))}
          </div>
        )}

        {layoutMode === "tabbed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="h2h-tab-bar" role="tablist">
              {models.map((mId, idx) => {
                const state = states[idx] || emptyModelState();
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activeTabModelIndex === idx}
                    className={`h2h-model-tab ${activeTabModelIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveTabModelIndex(idx)}
                  >
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      }}
                    >
                      Model {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{mId.split("/").pop()}</span>
                    {state.isRunning && <span className="live-dot" />}
                    {state.answer && !state.isRunning && (
                      <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                        ({(state.latencyMs / 1000).toFixed(1)}s)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Single active model card at 100% full width */}
            {renderModelCard(models[activeTabModelIndex] || models[0], activeTabModelIndex, false)}
          </div>
        )}

        {/* Post-Inference Ground Truth Reference Panel */}
        {hasCompletedInference && goldAnswer && (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--emerald)",
                    background: "rgba(52, 168, 83, 0.12)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(52, 168, 83, 0.3)",
                  }}
                >
                  Reference Details
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  Ground Truth & Scoring Integrity
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGroundTruth(!showGroundTruth)}
                className="arena-header-btn"
              >
                {showGroundTruth ? "▲ Collapse Reference Details" : "▼ Expand Reference Details"}
              </button>
            </div>

            {/* Expected Answer snippet */}
            <div
              style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "4px" }}>
                EXPECTED GROUND TRUTH ANSWER:
              </div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>
                {goldAnswer}
              </div>
            </div>

            {/* Expanded Detailed Comparison */}
            {showGroundTruth && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {models.map((modelId, idx) => {
                  const state = states[idx];
                  if (!state.answer) return null;
                  const res = evaluateReferenceAnswer(state.answer, goldAnswer, currentOptions, scoringPolicy);
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                          Model {String.fromCharCode(65 + idx)} ({modelId.split("/").pop()}):
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--text-main)",
                          }}
                        >
                          {res.metricName}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>
                        <strong>Scoring Method:</strong> {res.metricName}
                      </div>
                      {res.reason && (
                        <div style={{ color: "var(--rose)", marginTop: "2px" }}>
                          <strong>Mismatch explanation:</strong> {res.reason}
                        </div>
                      )}
                      {res.tokenF1 !== undefined && (
                        <div style={{ color: "var(--text-subtle)", marginTop: "2px" }}>
                          Lexical F1: {(res.tokenF1 * 100).toFixed(1)}% (Precision: {((res.tokenPrecision ?? 0) * 100).toFixed(1)}%, Recall: {((res.tokenRecall ?? 0) * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Head-to-Head Comparison Scorecard Modal */}
      {showComparisonModal && (
        <HeadToHeadComparisonModal
          models={models}
          states={states}
          goldAnswer={goldAnswer}
          options={currentOptions}
          scoringPolicy={scoringPolicy}
          onClose={() => setShowComparisonModal(false)}
        />
      )}

      {/* Document Preview Modal with Full Visual PDF Reader Parity */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={showDocPreview}
          onClose={() => {
            setShowDocPreview(false);
            setPreviewDoc(null);
          }}
          document={previewDoc}
          documents={attachedDocs}
          initialActiveId={previewDoc.id}
        />
      )}

      {/* Maximize Zen Reader Modal */}
      {maximizedModelIndex !== null && (
        <ModelMaximizeModal
          modelId={models[maximizedModelIndex]}
          modelLetter={String.fromCharCode(65 + maximizedModelIndex)}
          answer={states[maximizedModelIndex]?.answer || ""}
          reasoning={states[maximizedModelIndex]?.reasoning}
          promptTokens={states[maximizedModelIndex]?.promptTokens || 0}
          completionTokens={states[maximizedModelIndex]?.completionTokens || 0}
          latencyMs={states[maximizedModelIndex]?.latencyMs || 0}
          estCostUsd={states[maximizedModelIndex]?.estCostUsd || 0}
          onClose={() => setMaximizedModelIndex(null)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";

export interface ParsedDocument {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  text: string;
  wordCount: number;
  charCount: number;
  tokenCount: number;
  preview: string;
  hash?: string;
  fileUrl?: string;
  mimeType?: string;
}

interface Props {
  document?: ParsedDocument | null;
  documents?: ParsedDocument[];
  initialActiveId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveToLake?: (doc?: ParsedDocument) => void;
  onSaveAllToLake?: (docs: ParsedDocument[]) => void;
}

export function DocumentPreviewModal({
  document,
  documents,
  initialActiveId,
  isOpen,
  onClose,
  onSaveToLake,
  onSaveAllToLake,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");

  const allDocs: ParsedDocument[] =
    documents && documents.length > 0 ? documents : document ? [document] : [];

  const [activeDocId, setActiveDocId] = useState<string | null>(
    initialActiveId || document?.id || allDocs[0]?.id || null
  );

  useEffect(() => {
    if (initialActiveId) {
      setActiveDocId(initialActiveId);
    } else if (document?.id) {
      setActiveDocId(document.id);
    } else if (allDocs.length > 0 && (!activeDocId || !allDocs.some((d) => d.id === activeDocId))) {
      setActiveDocId(allDocs[0].id);
    }
  }, [initialActiveId, document?.id, allDocs]);

  const activeDoc: ParsedDocument | null =
    allDocs.find((d) => d.id === activeDocId) || allDocs[0] || null;

  const isPdf =
    activeDoc?.name.toLowerCase().endsWith(".pdf") ||
    activeDoc?.type?.toLowerCase().includes("pdf") ||
    activeDoc?.mimeType === "application/pdf" ||
    activeDoc?.fileUrl?.toLowerCase().includes(".pdf");

  const isImage =
    activeDoc?.mimeType?.startsWith("image/") ||
    activeDoc?.name.match(/\.(jpe?g|png|webp|gif|svg)$/i) ||
    activeDoc?.type?.toLowerCase().includes("image");

  // Determine effective file URL for iframe or download
  const resolvedFileUrl =
    activeDoc?.fileUrl ||
    (activeDoc?.hash
      ? `/api/documents/raw?hash=${activeDoc.hash}&name=${encodeURIComponent(activeDoc.name)}`
      : undefined);

  const hasVisual = !!resolvedFileUrl && (isPdf || isImage);

  // Set default view mode based on availability of visual file
  useEffect(() => {
    if (activeDoc) {
      setViewMode(hasVisual ? "visual" : "text");
      setSearchTerm("");
    }
  }, [activeDoc?.id, hasVisual]);

  if (!isOpen || !activeDoc) return null;

  function handleCopy() {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.name.replace(/\.[^/.]+$/, "")}_extracted_ocr.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenInNewTab() {
    if (resolvedFileUrl) {
      window.open(resolvedFileUrl, "_blank");
    }
  }

  const lines = activeDoc.text ? activeDoc.text.split("\n") : [];
  const filteredLines = searchTerm.trim()
    ? lines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
    : lines;

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div
        className="doc-modal-content doc-modal-pdf-expanded"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-wrap">
            <span
              className={`doc-badge doc-badge-${(activeDoc.type?.toUpperCase().includes("OCR") ? "ocr" : activeDoc.type.toLowerCase()).replace(/[^a-z0-9_-]/g, "-")}`}
            >
              {activeDoc.type?.toUpperCase().includes("OCR") ? "OCR" : activeDoc.type}
            </span>
            <div className="doc-modal-title-text">
              <h3>{activeDoc.name}</h3>
              <p className="doc-modal-subtitle">
                {activeDoc.formattedSize} · {activeDoc.wordCount?.toLocaleString() ?? 0} words · ~{activeDoc.tokenCount?.toLocaleString() ?? 0} LLM tokens
                {allDocs.length > 1 && (
                  <span className="doc-modal-counter-pill">
                    File {allDocs.findIndex((d) => d.id === activeDoc.id) + 1} of {allDocs.length}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* View Mode Segmented Switcher */}
            {hasVisual && (
              <div className="doc-view-mode-tabs">
                <button
                  type="button"
                  className={`doc-mode-tab ${viewMode === "visual" ? "active" : ""}`}
                  onClick={() => setViewMode("visual")}
                  title="View original visual PDF layout"
                >
                  Visual PDF
                </button>
                <button
                  type="button"
                  className={`doc-mode-tab ${viewMode === "text" ? "active" : ""}`}
                  onClick={() => setViewMode("text")}
                  title="View line-by-line extracted OCR text"
                >
                  Extracted Text & OCR
                </button>
              </div>
            )}

            <button className="modal-close" onClick={onClose} title="Close preview">
              ✕
            </button>
          </div>
        </div>

        {/* Multi-Document Tab Switcher (if more than 1 file) */}
        {allDocs.length > 1 && (
          <div className="doc-modal-doc-tabs">
            {allDocs.map((doc, idx) => {
              const isSelected = doc.id === activeDoc.id;
              const typeLabel = doc.type?.toUpperCase().includes("OCR") ? "OCR" : doc.type || "DOC";
              return (
                <button
                  key={doc.id || idx}
                  type="button"
                  className={`doc-modal-doc-tab${isSelected ? " active" : ""}`}
                  onClick={() => setActiveDocId(doc.id)}
                  title={`${doc.name} (${doc.formattedSize})`}
                >
                  <span
                    className={`doc-badge doc-badge-sm doc-badge-${typeLabel.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`}
                  >
                    {typeLabel}
                  </span>
                  <span className="doc-modal-tab-name">{doc.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="doc-modal-toolbar">
          {viewMode === "text" ? (
            <div className="doc-search-box">
              <span className="doc-search-icon" style={{ fontSize: "10px", fontWeight: 700 }}>FIND</span>
              <input
                type="text"
                placeholder="Search within extracted text…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="doc-search-input"
              />
              {searchTerm && (
                <button className="doc-search-clear" onClick={() => setSearchTerm("")}>
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
                {isPdf ? "Interactive Native PDF Viewer" : "Image Preview Mode"}
              </span>
              <span className="meta-tag" style={{ fontSize: "11px" }}>
                High Fidelity Layout
              </span>
            </div>
          )}

          <div className="doc-toolbar-actions">
            {resolvedFileUrl && (
              <>
                <button
                  className="doc-btn-secondary"
                  onClick={handleOpenInNewTab}
                  title="Open original document in a new browser tab for full screen reading"
                >
                  ⤢ Open in Full Tab
                </button>
                <a
                  href={resolvedFileUrl}
                  download={activeDoc.name}
                  className="doc-btn-secondary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                  title="Download original file"
                >
                  Download Original
                </a>
              </>
            )}

            <button
              className="doc-btn-secondary"
              onClick={handleDownloadTxt}
              title="Download extracted plain text file"
            >
              Download .TXT
            </button>

            <button className="doc-btn-secondary" onClick={handleCopy}>
              {copied ? "Copied to Clipboard" : "Copy Text"}
            </button>

            {onSaveToLake && (
              <button
                className="doc-btn-primary"
                onClick={() => {
                  onClose();
                  onSaveToLake(activeDoc);
                }}
                title="Save this document to Insurance Data Lake"
              >
                Save to Lake
              </button>
            )}

            {onSaveAllToLake && allDocs.length > 1 && (
              <button
                className="doc-btn-primary highlight"
                onClick={() => {
                  onClose();
                  onSaveAllToLake(allDocs);
                }}
                title={`Batch ingest all ${allDocs.length} documents into Insurance Data Lake`}
              >
                Save All to Lake ({allDocs.length})
              </button>
            )}
          </div>
        </div>

        {/* Document Body */}
        {viewMode === "visual" && hasVisual ? (
          <div className="doc-modal-body doc-visual-body">
            {isPdf ? (
              <iframe
                src={`${resolvedFileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                title={activeDoc.name}
                className="doc-pdf-iframe"
              />
            ) : isImage ? (
              <div className="doc-image-viewer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolvedFileUrl} alt={activeDoc.name} className="doc-preview-img" />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="doc-modal-body">
            {searchTerm && (
              <div className="doc-search-notice">
                Showing {filteredLines.length} matching lines out of {lines.length} total lines
              </div>
            )}
            <pre className="doc-text-viewer">
              {filteredLines.map((line, idx) => (
                <div key={idx} className="doc-text-line">
                  <span className="doc-line-number">{idx + 1}</span>
                  <span className="doc-line-content">{line || "\u00A0"}</span>
                </div>
              ))}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="doc-modal-footer">
          <div className="doc-modal-meta-tags">
            <span className="meta-tag">Character Count: {activeDoc.charCount?.toLocaleString() ?? 0}</span>
            <span className="meta-tag">Estimated Context Window: ~{activeDoc.tokenCount?.toLocaleString() ?? 0} tokens</span>
            <span className="meta-tag">
              Engine: {activeDoc.type?.toUpperCase().includes("OCR") ? "Vision AI OCR + Poppler" : "Poppler PDF Layout"}
            </span>
            {resolvedFileUrl && <span className="meta-tag">Visual Layer: Active</span>}
          </div>
          <button className="doc-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

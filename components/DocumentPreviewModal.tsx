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
  document: ParsedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToLake?: () => void;
}

export function DocumentPreviewModal({ document, isOpen, onClose, onSaveToLake }: Props) {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");

  const isPdf =
    document?.name.toLowerCase().endsWith(".pdf") ||
    document?.type?.toLowerCase().includes("pdf") ||
    document?.mimeType === "application/pdf" ||
    document?.fileUrl?.toLowerCase().includes(".pdf");

  const isImage =
    document?.mimeType?.startsWith("image/") ||
    document?.name.match(/\.(jpe?g|png|webp|gif|svg)$/i) ||
    document?.type?.toLowerCase().includes("image");

  // Determine effective file URL for iframe or download
  const resolvedFileUrl =
    document?.fileUrl ||
    (document?.hash
      ? `/api/documents/raw?hash=${document.hash}&name=${encodeURIComponent(document.name)}`
      : undefined);

  const hasVisual = !!resolvedFileUrl && (isPdf || isImage);

  // Set default view mode based on availability of visual file
  useEffect(() => {
    if (document) {
      setViewMode(hasVisual ? "visual" : "text");
      setSearchTerm("");
    }
  }, [document?.id, hasVisual]);

  if (!isOpen || !document) return null;

  function handleCopy() {
    if (!document) return;
    navigator.clipboard.writeText(document.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    if (!document) return;
    const blob = new Blob([document.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.name.replace(/\.[^/.]+$/, "")}_extracted_ocr.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenInNewTab() {
    if (resolvedFileUrl) {
      window.open(resolvedFileUrl, "_blank");
    }
  }

  const lines = document.text ? document.text.split("\n") : [];
  const filteredLines = searchTerm.trim()
    ? lines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
    : lines;

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div
        className={`doc-modal-content doc-modal-pdf-expanded`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-wrap">
            <span
              className={`doc-badge doc-badge-${(document.type?.toUpperCase().includes("OCR") ? "ocr" : document.type.toLowerCase()).replace(/[^a-z0-9_-]/g, "-")}`}
            >
              {document.type?.toUpperCase().includes("OCR") ? "OCR" : document.type}
            </span>
            <div className="doc-modal-title-text">
              <h3>{document.name}</h3>
              <p className="doc-modal-subtitle">
                {document.formattedSize} · {document.wordCount?.toLocaleString() ?? 0} words · ~{document.tokenCount?.toLocaleString() ?? 0} LLM tokens
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
                  download={document.name}
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
                  onSaveToLake();
                }}
              >
                Save to Data Lake
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
                title={document.name}
                className="doc-pdf-iframe"
              />
            ) : isImage ? (
              <div className="doc-image-viewer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolvedFileUrl} alt={document.name} className="doc-preview-img" />
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
            <span className="meta-tag">Character Count: {document.charCount?.toLocaleString() ?? 0}</span>
            <span className="meta-tag">Estimated Context Window: ~{document.tokenCount?.toLocaleString() ?? 0} tokens</span>
            <span className="meta-tag">
              Engine: {document.type?.toUpperCase().includes("OCR") ? "Vision AI OCR + Poppler" : "Poppler PDF Layout"}
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

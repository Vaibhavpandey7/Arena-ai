"use client";

import React, { useState } from "react";

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

  if (!isOpen || !document) return null;

  function handleCopy() {
    if (!document) return;
    navigator.clipboard.writeText(document.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lines = document.text.split("\n");
  const filteredLines = searchTerm.trim()
    ? lines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
    : lines;

  return (
    <div className="doc-modal-backdrop" onClick={onClose}>
      <div className="doc-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-wrap">
            <span className={`doc-badge doc-badge-${document.type.toLowerCase()}`}>
              {document.type}
            </span>
            <div className="doc-modal-title-text">
              <h3>{document.name}</h3>
              <p className="doc-modal-subtitle">
                {document.formattedSize} · {document.wordCount.toLocaleString()} words · ~{document.tokenCount.toLocaleString()} LLM tokens
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Close preview">
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="doc-modal-toolbar">
          <div className="doc-search-box">
            <span className="doc-search-icon">🔍</span>
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

          <div className="doc-toolbar-actions">
            <button className="doc-btn-secondary" onClick={handleCopy}>
              {copied ? "✓ Copied to Clipboard" : "📋 Copy Text"}
            </button>
            {onSaveToLake && (
              <button
                className="doc-btn-primary"
                onClick={() => {
                  onClose();
                  onSaveToLake();
                }}
              >
                💾 Save to Data Lake
              </button>
            )}
          </div>
        </div>

        {/* Document Body */}
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

        {/* Footer */}
        <div className="doc-modal-footer">
          <div className="doc-modal-meta-tags">
            <span className="meta-tag">Character Count: {document.charCount.toLocaleString()}</span>
            <span className="meta-tag">Estimated Context Window: ~{document.tokenCount.toLocaleString()} tokens</span>
            <span className="meta-tag">Engine: Poppler PDF Layout</span>
          </div>
          <button className="doc-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

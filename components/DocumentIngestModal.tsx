"use client";

import React, { useState } from "react";
import { ParsedDocument } from "./DocumentPreviewModal";

const DOMAINS = [
  { id: "insurance_documents", label: "Policy Documents & Claims (Recommended)" },
  { id: "eu_regulatory_compliance", label: "EU Solvency II & Regulations" },
  { id: "insurance_knowledge", label: "Insurance Domain Knowledge" },
  { id: "actuarial_numerical_data", label: "Actuarial & Numerical Models" },
  { id: "tool_api_data", label: "Tool & API Calling Dataset" },
  { id: "agentic_trajectory_data", label: "Agentic Trajectories" },
  { id: "human_feedback_preferences", label: "Human Feedback / Preferences" },
];

interface Props {
  initialDocument?: ParsedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (result: { recordsIngested: number; domain: string; documentName: string }) => void;
}

export function DocumentIngestModal({ initialDocument, isOpen, onClose, onIngestSuccess }: Props) {
  const [document, setDocument] = useState<ParsedDocument | null>(initialDocument || null);
  const [domain, setDomain] = useState("insurance_documents");
  const [autoChunk, setAutoChunk] = useState(true);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ recordsIngested: number; domain: string } | null>(null);
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync initialDocument when modal opens
  React.useEffect(() => {
    if (initialDocument) {
      setDocument(initialDocument);
    }
  }, [initialDocument]);

  if (!isOpen) return null;

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setError(null);
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
      setDocument(data.document);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleIngest() {
    if (!document) return;
    setIsIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: {
            name: document.name,
            text: document.text,
            type: document.type,
          },
          domain,
          autoChunk,
          question: customQuestion.trim() || undefined,
          instruction: customInstruction.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ingestion failed");
      }

      setSuccessInfo({
        recordsIngested: data.recordsIngested,
        domain: data.domain,
      });

      onIngestSuccess({
        recordsIngested: data.recordsIngested,
        domain: data.domain,
        documentName: document.name,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ingestion failed");
    } finally {
      setIsIngesting(false);
    }
  }

  function handleResetAndClose() {
    setError(null);
    setSuccessInfo(null);
    onClose();
  }

  return (
    <div className="doc-modal-backdrop" onClick={handleResetAndClose}>
      <div className="doc-modal-content ingest-modal-width" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-wrap">
            <span className="doc-badge doc-badge-ingest">Data Lake Ingest</span>
            <div className="doc-modal-title-text">
              <h3>Ingest Document into DIL Knowledge Lake</h3>
              <p className="doc-modal-subtitle">
                Expand searchable knowledge base & synthetic benchmark records
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={handleResetAndClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="doc-modal-body ingest-body">
          {error && <div className="doc-alert-error">⚠ {error}</div>}

          {successInfo ? (
            <div className="doc-ingest-success">
              <div className="success-check-icon">✓</div>
              <h4>Document Successfully Ingested!</h4>
              <p>
                Created <strong>{successInfo.recordsIngested} verified records</strong> in domain{" "}
                <code>{successInfo.domain}</code>.
              </p>
              <p className="success-subtext">
                The document is now indexed and available for autonomous retrieval by the{" "}
                <code>search_knowledge_data_lake</code> tool across all arena models.
              </p>
              <div className="success-actions">
                <button className="doc-btn-primary" onClick={handleResetAndClose}>
                  View in Data Lake Studio
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Document Selection / Dropzone if no document */}
              {!document ? (
                <div className="doc-dropzone">
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    accept=".pdf,.txt,.md,.json,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div
                    className="dropzone-area"
                    onClick={() => modalFileInputRef.current?.click()}
                  >
                    <span className="dropzone-icon">📁</span>
                    <h4>{isUploading ? "Extracting document text…" : "Select or Drop a Document"}</h4>
                    <p>Supports PDF (insurance policies), TXT, MD, CSV, and JSON contracts</p>
                    <button className="doc-btn-secondary" type="button" disabled={isUploading}>
                      {isUploading ? "Processing..." : "Browse Files"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ingest-doc-card">
                  <div className="ingest-doc-info">
                    <span className={`doc-badge doc-badge-${document.type.toLowerCase()}`}>
                      {document.type}
                    </span>
                    <div>
                      <strong className="ingest-doc-name">{document.name}</strong>
                      <span className="ingest-doc-meta">
                        {document.formattedSize} · {document.wordCount.toLocaleString()} words · ~{document.tokenCount.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>
                  <button
                    className="doc-btn-change"
                    onClick={() => setDocument(null)}
                    title="Choose a different document"
                  >
                    Change File
                  </button>
                </div>
              )}

              {/* Form Options */}
              {document && (
                <div className="ingest-form-grid">
                  <div className="form-field">
                    <label className="field-label">Target Data Lake Domain</label>
                    <select
                      className="field-select"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    >
                      {DOMAINS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint">
                      Select which category will index this document in the benchmark knowledge base.
                    </span>
                  </div>

                  <div className="form-field checkbox-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={autoChunk}
                        onChange={(e) => setAutoChunk(e.target.checked)}
                      />
                      <span>
                        <strong>Intelligent Policy Chunking</strong> (Auto-split long policies into separate clause records for granular tool retrieval)
                      </span>
                    </label>
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      Custom Benchmark Query / Question <span className="field-optional">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder={`e.g. What are the key exclusions in ${document.name}?`}
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      Instruction / Context Header <span className="field-optional">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. Analyze coverage limits and underwriting conditions."
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!successInfo && (
          <div className="doc-modal-footer">
            <button className="doc-btn-secondary" onClick={handleResetAndClose}>
              Cancel
            </button>
            <button
              className="doc-btn-primary"
              onClick={handleIngest}
              disabled={!document || isIngesting || isUploading}
            >
              {isIngesting ? "Ingesting Records…" : "Ingest into Data Lake ⚡"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

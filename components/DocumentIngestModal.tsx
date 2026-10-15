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
  initialDocuments?: ParsedDocument[];
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (result: { recordsIngested: number; domain: string; documentName: string }) => void;
}

export function DocumentIngestModal({ initialDocument, initialDocuments, isOpen, onClose, onIngestSuccess }: Props) {
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [domain, setDomain] = useState("insurance_documents");
  const [autoChunk, setAutoChunk] = useState(true);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ recordsIngested: number; domain: string; documentNames: string[] } | null>(null);
  const modalFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync initialDocument or initialDocuments when modal opens
  React.useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      setDocuments(initialDocuments);
      setSelectedDocIds(new Set(initialDocuments.map((d) => d.id)));
    } else if (initialDocument) {
      setDocuments([initialDocument]);
      setSelectedDocIds(new Set([initialDocument.id]));
    } else {
      setDocuments([]);
      setSelectedDocIds(new Set());
    }
  }, [initialDocument, initialDocuments, isOpen]);

  if (!isOpen) return null;

  const targetDocs = documents.filter((d) => selectedDocIds.has(d.id));

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
      setDocuments((prev) => {
        const next = [...prev, data.document];
        setSelectedDocIds((s) => {
          const updated = new Set(s);
          updated.add(data.document.id);
          return updated;
        });
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map((d) => d.id)));
    }
  };

  async function handleIngest() {
    if (targetDocs.length === 0) return;
    setIsIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: targetDocs.map((d) => ({
            name: d.name,
            text: d.text,
            type: d.type,
          })),
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

      const docNames = targetDocs.map((d) => d.name);
      setSuccessInfo({
        recordsIngested: data.recordsIngested,
        domain: data.domain,
        documentNames: docNames,
      });

      onIngestSuccess({
        recordsIngested: data.recordsIngested,
        domain: data.domain,
        documentName: docNames.length === 1 ? docNames[0] : `${docNames.length} documents`,
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
              <h3>Ingest into DIL Knowledge Lake</h3>
              <p className="doc-modal-subtitle">
                Expand searchable knowledge base & benchmark records
                {documents.length > 1 && ` · ${documents.length} files queued`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={handleResetAndClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="doc-modal-body ingest-body">
          {error && <div className="doc-alert-error">Error: {error}</div>}

          {successInfo ? (
            <div className="doc-ingest-success">
              <div className="success-check-icon">✓</div>
              <h4>{successInfo.documentNames.length > 1 ? `${successInfo.documentNames.length} Documents` : "Document"} Successfully Ingested!</h4>
              <p>
                Created <strong>{successInfo.recordsIngested} verified records</strong> in domain{" "}
                <code>{successInfo.domain}</code>.
              </p>
              <p className="success-subtext">
                The documents are now indexed and available for autonomous retrieval by the{" "}
                <code>search_knowledge_data_lake</code> tool across all arena models.
              </p>
              <div className="success-actions">
                <button className="doc-btn-primary" onClick={handleResetAndClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Document Selection / List */}
              {documents.length === 0 ? (
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
                    <span className="dropzone-icon" style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>UPLOAD</span>
                    <h4>{isUploading ? "Extracting document text…" : "Select or Drop a Document"}</h4>
                    <p>Supports PDF (insurance policies), TXT, MD, CSV, and JSON contracts</p>
                    <button className="doc-btn-secondary" type="button" disabled={isUploading}>
                      {isUploading ? "Processing..." : "Browse Files"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ingest-batch-section">
                  <div className="ingest-batch-header">
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                      Documents to Ingest ({targetDocs.length}/{documents.length} selected)
                    </span>
                    {documents.length > 1 && (
                      <button
                        type="button"
                        className="ingest-toggle-all-btn"
                        onClick={toggleSelectAll}
                      >
                        {selectedDocIds.size === documents.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  <div className="ingest-batch-list">
                    {documents.map((doc) => {
                      const isChecked = selectedDocIds.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`ingest-batch-item${isChecked ? " selected" : ""}`}
                          onClick={() => toggleSelectDoc(doc.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectDoc(doc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            className={`doc-badge doc-badge-sm doc-badge-${(doc.type?.toUpperCase().includes("OCR") ? "ocr" : doc.type?.toLowerCase() || "doc").replace(/[^a-z0-9_-]/g, "-")}`}
                          >
                            {doc.type?.toUpperCase().includes("OCR") ? "OCR" : (doc.type || "DOC").toUpperCase().slice(0, 4)}
                          </span>
                          <span className="ingest-batch-name" title={doc.name}>
                            {doc.name}
                          </span>
                          <span className="ingest-batch-meta">
                            {doc.formattedSize} · ~{doc.tokenCount.toLocaleString()} tokens
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Options */}
              {targetDocs.length > 0 && (
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
                      Select which category will index these documents in the benchmark knowledge base.
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
                      placeholder={
                        targetDocs.length === 1
                          ? `e.g. What are the key exclusions in ${targetDocs[0].name}?`
                          : "e.g. Compare coverage limits and conditions across policies"
                      }
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
              disabled={targetDocs.length === 0 || isIngesting || isUploading}
            >
              {isIngesting
                ? `Ingesting ${targetDocs.length} ${targetDocs.length === 1 ? "Document" : "Documents"}…`
                : `Ingest ${targetDocs.length} ${targetDocs.length === 1 ? "Document" : "Documents"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

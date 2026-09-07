"use client";
import React, { useState, useEffect } from "react";
import { evaluateGoldAlignment, GoldEvaluationResult } from "@/lib/benchmark-eval";
import { DocumentIngestModal } from "./DocumentIngestModal";

export interface DILRecord {
  id: string;
  domain: string;
  split: string;
  task: string;
  question: string;
  context?: string;
  evidence?: string;
  response: string;
  quality_score: number;
  difficulty: string;
}

const DOMAINS: { id: string; label: string }[] = [
  { id: "", label: "All Domains" },
  { id: "insurance_knowledge", label: "Insurance Knowledge" },
  { id: "eu_regulatory_compliance", label: "EU Solvency II & Regulations" },
  { id: "insurance_documents", label: "Policy Documents & Claims" },
  { id: "actuarial_numerical_data", label: "Actuarial & Numerical" },
  { id: "tool_api_data", label: "Tool & API Calling" },
  { id: "agentic_trajectory_data", label: "Agentic Trajectories" },
  { id: "human_feedback_preferences", label: "Human Feedback / RLHF" },
];

const SPLITS = ["", "train", "validation", "test"];

interface Props {
  onLoadRecord: (prompt: string, record?: DILRecord) => void;
  modelAnswer?: string;
  activeRecord?: DILRecord | null;
  onSelectRecord?: (record: DILRecord) => void;
}

function DatasetBrowser({ onLoadRecord, modelAnswer, activeRecord: externalActiveRecord, onSelectRecord }: Props) {
  const [records, setRecords] = useState<DILRecord[]>([]);
  const [domain, setDomain] = useState("");
  const [split, setSplit] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [internalActiveRecord, setInternalActiveRecord] = useState<DILRecord | null>(null);
  const [showIngestModal, setShowIngestModal] = useState(false);

  const activeRecord = externalActiveRecord !== undefined ? externalActiveRecord : internalActiveRecord;

  useEffect(() => {
    loadRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, split]);

  async function loadRecords() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (domain) params.set("domain", domain);
    if (split) params.set("split", split);
    try {
      const res = await fetch(`/api/pipeline/records?${params}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(record: DILRecord) {
    setInternalActiveRecord(record);
    onSelectRecord?.(record);
    const prompt = record.context
      ? `Context:\n${record.context}\n\nQuestion: ${record.question}`
      : record.question;
    onLoadRecord(prompt, record);
  }

  function download(content: string, filename: string, mime: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const goldAlignment: GoldEvaluationResult | null =
    activeRecord && modelAnswer
      ? evaluateGoldAlignment(modelAnswer, activeRecord.response, activeRecord.evidence)
      : null;

  function exportBenchmarkCSV() {
    if (!activeRecord) return;
    const headers = [
      "record_id",
      "domain",
      "split",
      "difficulty",
      "dataset_curation_score",
      "gold_alignment_score",
      "gold_alignment_label",
      "evidence_verified",
      "question",
      "context",
      "model_answer",
      "gold_response",
      "evidence",
      "exported_at"
    ];
    const row = [
      activeRecord.id,
      activeRecord.domain,
      activeRecord.split,
      activeRecord.difficulty,
      (activeRecord.quality_score * 100).toFixed(0) + "%",
      goldAlignment ? `${goldAlignment.score}%` : "N/A",
      goldAlignment?.label ?? "N/A",
      goldAlignment ? (goldAlignment.evidenceMatched ? "Yes" : "No") : "N/A",
      activeRecord.question,
      activeRecord.context ?? "",
      modelAnswer ?? "",
      activeRecord.response,
      activeRecord.evidence ?? "",
      new Date().toISOString()
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",");

    download([headers.join(","), row].join("\n"), `benchmark-${activeRecord.id}-eval.csv`, "text/csv");
  }

  function exportBenchmarkJSON() {
    if (!activeRecord) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      record: activeRecord,
      modelAnswer: modelAnswer || null,
      alignmentEvaluation: goldAlignment ? {
        score: goldAlignment.score,
        label: goldAlignment.label,
        evidenceMatched: goldAlignment.evidenceMatched,
        keyTermsMatched: goldAlignment.keyTermsMatched,
      } : null,
    };
    download(JSON.stringify(payload, null, 2), `benchmark-${activeRecord.id}-eval.json`, "application/json");
  }

  const filtered = records.filter((r) =>
    search === "" ||
    r.question.toLowerCase().includes(search.toLowerCase()) ||
    r.task.toLowerCase().includes(search.toLowerCase()) ||
    (r.evidence && r.evidence.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="lake-studio-deck">
      {/* Studio Header & Filter Controls */}
      <div className="studio-hero">
        <div className="studio-hero-top">
          <div className="studio-hero-title-group">
            <div className="studio-hero-title">
              Insurance Data Lake & Ground Truth Studio
            </div>
            <div className="studio-hero-subtitle">
              38 Curated Synthetic Gold Records · 7 Regulatory & Actuarial Categories · Deterministic Train/Val/Test Split
            </div>
          </div>

          {/* Quick Stats Pill & Upload Action */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="lake-stats-bar">
              <div className="stat-segment">
                <span className="stat-label">Total Records</span>
                <span className="stat-val">{records.length}</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-segment">
                <span className="stat-label">Filtered</span>
                <span className="stat-val" style={{ color: "var(--cyan-light)" }}>{filtered.length}</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-segment">
                <span className="stat-label">Format</span>
                <span className="stat-val" style={{ color: "var(--accent)" }}>DIL Schema v1.0</span>
              </div>
            </div>

            <button
              className="lake-upload-btn"
              onClick={() => setShowIngestModal(true)}
              title="Upload an insurance policy or document to ingest into the Data Lake"
            >
              <span>📄 Ingest Document</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="studio-toolbar">
          <div className="toolbar-left">
            <div className="studio-search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="dataset-search-input"
                name="datasetSearch"
                type="text"
                className="studio-search-input"
                placeholder="Search across questions, tasks, regulatory citations, or keywords…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Split Switcher */}
            <div className="split-switcher">
              {SPLITS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSplit(s)}
                  className={`split-btn${split === s ? " active" : ""}`}
                >
                  {s || "All Splits"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Domain Filter Badges */}
        <div className="domain-filters-bar">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              className={`domain-chip${domain === d.id ? " active" : ""}`}
              onClick={() => setDomain(d.id)}
            >
              <span>{d.label}</span>
              {domain === d.id && <span className="chip-count">{filtered.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Gold Evaluation Side-by-Side Comparator */}
      {activeRecord && (
        <div className="gold-eval-deck">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "16px", color: "var(--text-main)" }}>
                Ground Truth Evaluation Benchmark
              </div>
              <span className="brand-tag" style={{ background: "var(--accent-dim)", color: "var(--accent)", borderColor: "var(--accent-border)", fontWeight: 700 }}>
                Active Record: {activeRecord.id}
              </span>
              <span className="brand-tag">{activeRecord.domain.replace(/_/g, " ")}</span>
              <span className="brand-tag" title="Benchmark record curation quality score">
                Dataset Curation: {(activeRecord.quality_score * 100).toFixed(0)}%
              </span>
              {goldAlignment && (
                <span
                  className={`eval-score-badge ${
                    goldAlignment.score >= 80
                      ? "high"
                      : goldAlignment.score >= 60
                      ? "moderate"
                      : goldAlignment.score >= 40
                      ? "partial"
                      : "divergent"
                  }`}
                >
                  {goldAlignment.score}% Model Alignment · {goldAlignment.label}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={exportBenchmarkCSV}
                style={{ fontSize: "11px", padding: "5px 12px" }}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={exportBenchmarkJSON}
                style={{ fontSize: "11px", padding: "5px 12px" }}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSelect(activeRecord)}
                style={{ fontSize: "11px", padding: "5px 14px" }}
              >
                {modelAnswer ? "Re-evaluate in Arena" : "Run in Single Arena"}
              </button>
            </div>
          </div>

          <div className="gold-eval-grid">
            {/* Model Generated Answer Column */}
            <div className="eval-col" style={{ borderColor: goldAlignment ? "var(--cyan-border)" : undefined }}>
              <div className="eval-col-header">
                <span>Model Generated Answer</span>
                {goldAlignment ? (
                  <span
                    className={`eval-score-badge ${
                      goldAlignment.score >= 80
                        ? "high"
                        : goldAlignment.score >= 60
                        ? "moderate"
                        : goldAlignment.score >= 40
                        ? "partial"
                        : "divergent"
                    }`}
                  >
                    {goldAlignment.score}% {goldAlignment.label}
                  </span>
                ) : (
                  <span className="brand-tag">Evaluated Model</span>
                )}
              </div>

              {goldAlignment && (
                <div className="gt-alignment-breakdown">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                    <span style={{ color: "var(--text-subtle)", fontWeight: 600, textTransform: "uppercase" }}>
                      Evidence Citation Check:
                    </span>
                    {goldAlignment.evidenceMatched ? (
                      <span className="gt-evidence-verified">✓ Verified Citation</span>
                    ) : (
                      <span className="gt-evidence-uncited">⚠ Uncited Evidence</span>
                    )}
                  </div>

                  {goldAlignment.keyTermsMatched.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                        Matched Domain Keywords ({goldAlignment.keyTermsMatched.length}):
                      </div>
                      <div className="gt-kw-chips">
                        {goldAlignment.keyTermsMatched.map((term, i) => (
                          <span key={i} className="gt-kw-chip">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="eval-col-content">
                {modelAnswer ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>{modelAnswer}</div>
                ) : (
                  <div style={{ color: "var(--text-subtle)", fontStyle: "italic", fontSize: "13px", padding: "12px 0" }}>
                    Inference not yet run for this record. Click "Run in Single Arena" to stream and evaluate model output.
                  </div>
                )}
              </div>
            </div>

            {/* Verified Gold Response Column */}
            <div className="eval-col" style={{ borderColor: "var(--accent-border)" }}>
              <div className="eval-col-header">
                <span>Verified Gold Response</span>
                <span className="quality-badge" title="Benchmark record curation score">
                  Verified Expert · {(activeRecord.quality_score * 100).toFixed(0)}% Curation Quality
                </span>
              </div>
              <div className="eval-col-content">
                {activeRecord.response}
              </div>

              {activeRecord.evidence && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", marginBottom: 4 }}>
                    Regulatory / Contractual Evidence
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    "{activeRecord.evidence}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Records Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "var(--text-subtle)" }}>
          <span className="live-dot cyan" style={{ display: "inline-block", marginRight: 8 }} />
          Loading verified dataset records…
        </div>
      ) : (
        <div className="records-grid">
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-subtle)" }}>
              No records match your filters.
            </div>
          )}

          {filtered.map((r) => {
            const isSelected = activeRecord?.id === r.id;
            return (
              <div
                key={r.id}
                className={`dil-record-card${isSelected ? " active" : ""}`}
                onClick={() => handleSelect(r)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span className="brand-tag" style={{ fontSize: 10 }}>
                    {r.domain.replace(/_/g, " ")}
                  </span>
                  <span className="quality-badge">
                    {(r.quality_score * 100).toFixed(0)}% Quality
                  </span>
                </div>

                <div className="dil-card-q">
                  {r.question}
                </div>

                {r.context && (
                  <div style={{ fontSize: "11.5px", color: "var(--text-subtle)", lineClamp: 2, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>
                    {r.context}
                  </div>
                )}

                <div className="dil-card-meta">
                  <span>Split: <b>{r.split}</b></span>
                  <span>Difficulty: <b>{r.difficulty}</b></span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>Click to Load ↵</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingest Document Modal */}
      <DocumentIngestModal
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onIngestSuccess={(res) => {
          loadRecords();
          setDomain(res.domain);
        }}
      />
    </div>
  );
}

export default React.memo(DatasetBrowser);

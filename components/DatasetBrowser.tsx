"use client";
import React, { useState, useEffect } from "react";

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

  function exportBenchmarkCSV() {
    if (!activeRecord) return;
    const headers = [
      "record_id",
      "domain",
      "split",
      "difficulty",
      "gold_quality_score",
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
              Insurance Domain Intelligence Lake
            </div>
            <div className="studio-hero-subtitle">
              38 Curated Synthetic Gold Records · 7 Regulatory & Actuarial Categories · Deterministic Train/Val/Test Split
            </div>
          </div>

          <div className="studio-search-split-bar">
            <div className="deck-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="dataset-search-input"
                name="datasetSearch"
                type="search"
                placeholder="Search domain questions…"
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
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={exportBenchmarkCSV}
                style={{ fontSize: "11px", padding: "5px 12px" }}
              >
                Export CSV
              </button>
              <button
                className="btn-secondary"
                onClick={exportBenchmarkJSON}
                style={{ fontSize: "11px", padding: "5px 12px" }}
              >
                Export JSON
              </button>
              <button
                className="btn-primary"
                onClick={() => handleSelect(activeRecord)}
                style={{ fontSize: "11px", padding: "5px 14px" }}
              >
                {modelAnswer ? "Re-evaluate in Arena" : "Run in Single Arena"}
              </button>
            </div>
          </div>

          <div className="gold-eval-grid">
            <div className="eval-col">
              <div className="eval-col-header">
                <span>Model Generated Answer</span>
                <span className="brand-tag">Evaluated Model</span>
              </div>
              <div className="eval-col-content">
                {modelAnswer ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>{modelAnswer}</div>
                ) : (
                  <div style={{ color: "var(--text-subtle)", fontStyle: "italic", fontSize: "13px", padding: "12px 0" }}>
                    Inference not yet run for this record. Click "Run Evaluation" in the Single Arena to stream model output here.
                  </div>
                )}
              </div>
            </div>

            <div className="eval-col" style={{ borderColor: "var(--accent-border)" }}>
              <div className="eval-col-header">
                <span>Verified Gold Response</span>
                <span className="quality-badge">
                  Score {(activeRecord.quality_score * 100).toFixed(0)}%
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
    </div>
  );
}

export default React.memo(DatasetBrowser);

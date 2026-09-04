"use client";
import { useState, useEffect } from "react";

interface DILRecord {
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

const DOMAINS = [
  "", "insurance_knowledge", "eu_regulatory_compliance", "insurance_documents",
  "actuarial_numerical_data", "tool_api_data", "agentic_trajectory_data",
  "human_feedback_preferences",
];

const SPLITS = ["", "train", "validation", "test"];

interface Props {
  onLoadRecord: (prompt: string) => void;
  modelAnswer?: string;
  activeRecordId?: string;
}

export default function DatasetBrowser({ onLoadRecord, modelAnswer, activeRecordId }: Props) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<DILRecord[]>([]);
  const [domain, setDomain] = useState("");
  const [split, setSplit] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState<DILRecord | null>(null);

  useEffect(() => {
    loadRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, split]);

  async function loadRecords() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (domain) params.set("domain", domain);
    if (split) params.set("split", split);
    const res = await fetch(`/api/pipeline/records?${params}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setLoading(false);
  }

  function handleSelect(record: DILRecord) {
    setActiveRecord(record);
    const prompt = record.context
      ? `Context:\n${record.context}\n\nQuestion: ${record.question}`
      : record.question;
    onLoadRecord(prompt);
  }

  return (
    <div className="panel">
      <div
        className={`panel-header${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="panel-title">
          <span className="badge badge-muted">Dataset</span>
          <span className="muted" style={{ fontSize: 11 }}>{records.length} records</span>
        </div>
        <span className={`chevron${open ? " open" : ""}`}>▶</span>
      </div>

      {open && (
        <div className="panel-body">
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d || "All domains"}</option>
              ))}
            </select>
            <select value={split} onChange={(e) => setSplit(e.target.value)} style={{ width: 120 }}>
              {SPLITS.map((s) => (
                <option key={s} value={s}>{s || "All splits"}</option>
              ))}
            </select>
          </div>

          {loading && <p className="muted empty-state">Loading…</p>}

          {!loading && (
            <div className="record-list">
              {records.length === 0 && <p className="empty-state">No records</p>}
              {records.map((r) => (
                <div
                  key={r.id}
                  className={`record-card${activeRecord?.id === r.id ? " active" : ""}`}
                  onClick={() => handleSelect(r)}
                >
                  <div className="record-q">{r.question}</div>
                  <div className="record-meta">
                    {r.domain} · {r.split} · {r.difficulty} · score {r.quality_score.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Gold comparison panel */}
          {activeRecord && modelAnswer && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div className="rail-label" style={{ marginBottom: 8 }}>Eval comparison</div>
              <div className="gold-panel">
                <div>
                  <div className="gold-col-label">Model answer</div>
                  <div className="gold-text">{modelAnswer}</div>
                </div>
                <div>
                  <div className="gold-col-label">
                    Gold response
                    <span className="badge badge-muted" style={{ marginLeft: 6 }}>
                      quality {activeRecord.quality_score.toFixed(2)}
                    </span>
                  </div>
                  <div className="gold-text">{activeRecord.response}</div>
                  {activeRecord.evidence && (
                    <>
                      <div className="gold-col-label" style={{ marginTop: 10 }}>Evidence</div>
                      <div className="gold-text" style={{ color: "var(--muted)", fontSize: 12 }}>
                        {activeRecord.evidence}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

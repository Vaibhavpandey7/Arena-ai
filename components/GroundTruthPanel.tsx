"use client";
import React, { useState, useMemo } from "react";
import { evaluateUseCaseMetrics, InsuranceUseCaseId, UseCaseEvaluation } from "@/lib/use-case-metrics";
import { evaluateGoldAlignment, GoldEvaluationResult } from "@/lib/benchmark-eval";

interface Props {
  modelAnswer: string;
  goldResponse: string;
  evidence?: string;
  useCaseId?: InsuranceUseCaseId;
  questionText?: string;
  modelName?: string;
  onUploadCustomGold?: (customGold: string, evidence?: string) => void;
}

export default function GroundTruthPanel({
  modelAnswer,
  goldResponse,
  evidence,
  useCaseId = "data-extraction",
  questionText,
  modelName = "Model Output",
  onUploadCustomGold,
}: Props) {
  const [activeGold, setActiveGold] = useState<string>(goldResponse);
  const [activeEvidence, setActiveEvidence] = useState<string>(evidence || "");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showGoldText, setShowGoldText] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadText, setUploadText] = useState<string>("");

  // Sync with prop updates if changed externally
  React.useEffect(() => {
    setActiveGold(goldResponse);
    if (evidence) setActiveEvidence(evidence);
  }, [goldResponse, evidence]);

  // Compute standard alignment
  const goldEval: GoldEvaluationResult = useMemo(() => {
    return evaluateGoldAlignment(modelAnswer, activeGold, activeEvidence);
  }, [modelAnswer, activeGold, activeEvidence]);

  // Compute use-case specific primary & secondary metrics
  const useCaseEval: UseCaseEvaluation = useMemo(() => {
    return evaluateUseCaseMetrics(useCaseId, modelAnswer, activeGold, activeEvidence);
  }, [useCaseId, modelAnswer, activeGold, activeEvidence]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--emerald)";
    if (score >= 60) return "var(--cyan)";
    if (score >= 40) return "var(--amber)";
    return "var(--rose)";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || "");
      try {
        // Try JSON
        const json = JSON.parse(content);
        const item = Array.isArray(json) ? json[0] : json;
        const gold = item.goldResponse || item.response || item.ground_truth || item.answer || (typeof item === "string" ? item : content);
        const ev = item.evidence || item.citation || "";
        setActiveGold(gold);
        if (ev) setActiveEvidence(ev);
        onUploadCustomGold?.(gold, ev);
        setShowUploadModal(false);
      } catch {
        // Check for CSV format
        if (content.includes(",") && content.includes("\n")) {
          const lines = content.split(/\r?\n/).filter(Boolean);
          if (lines.length > 1) {
            const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
            const values = lines[1].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
            const goldColIdx = headers.findIndex(h => /gold|response|ground_truth|answer|target/.test(h));
            const evColIdx = headers.findIndex(h => /evidence|citation|legal|article/.test(h));
            if (goldColIdx !== -1 && values[goldColIdx]) {
              const gold = values[goldColIdx];
              const ev = evColIdx !== -1 ? values[evColIdx] : "";
              setActiveGold(gold);
              if (ev) setActiveEvidence(ev);
              onUploadCustomGold?.(gold, ev);
              setShowUploadModal(false);
              return;
            }
          }
        }
        // Fallback: Raw text
        setActiveGold(content);
        onUploadCustomGold?.(content);
        setShowUploadModal(false);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!uploadText.trim()) return;
    setActiveGold(uploadText.trim());
    onUploadCustomGold?.(uploadText.trim());
    setShowUploadModal(false);
    setUploadText("");
  };

  return (
    <div
      style={{
        marginTop: "16px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "rgba(11, 22, 40, 0.75)",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(15, 30, 54, 0.9)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1rem" }}>🎯</span>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
              Ground Truth Alignment
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: `${getScoreColor(goldEval.score)}18`,
                  color: getScoreColor(goldEval.score),
                  border: `1px solid ${getScoreColor(goldEval.score)}44`,
                  fontWeight: 600,
                }}
              >
                {goldEval.score}% · {goldEval.label}
              </span>
              {goldEval.evidenceMatched && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 6px",
                    borderRadius: "12px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                  title="Official regulatory or evidentiary citation detected in response"
                >
                  ✓ Evidence Verified
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
              Matched against {activeEvidence ? "certified regulatory benchmark" : "verified gold reference"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              fontSize: "0.72rem",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(0, 212, 255, 0.08)",
              border: "1px solid rgba(0, 212, 255, 0.25)",
              color: "var(--cyan)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            📂 Upload Custom GT
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              fontSize: "0.72rem",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {isExpanded ? "▲ Hide Details" : "▼ Show Metrics"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "14px 16px" }}>
          {/* Primary Use Case Metric Highlight */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(0, 212, 255, 0.04)",
              border: "1px solid rgba(0, 212, 255, 0.15)",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--cyan)", fontWeight: 700 }}>
                  Primary Metric · {useCaseEval.useCaseTitle}
                </span>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>
                  {useCaseEval.primary.name}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: getScoreColor(useCaseEval.primary.score), fontFamily: "var(--font-mono)" }}>
                  {useCaseEval.primary.score}%
                </span>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {useCaseEval.primary.isEstimate ? "Heuristic Proxy" : "Ground Truth Aligned"}
                </div>
              </div>
            </div>

            {/* Primary progress bar */}
            <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${useCaseEval.primary.score}%`,
                  background: `linear-gradient(90deg, var(--cyan), ${getScoreColor(useCaseEval.primary.score)})`,
                  borderRadius: "3px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          {/* Secondary Metrics Grid */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Detailed Domain Metrics
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: "8px",
              }}
            >
              {useCaseEval.secondaries.map((sec) => (
                <div
                  key={sec.metricId}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 500 }} title={sec.detail}>
                      {sec.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: getScoreColor(sec.score),
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {sec.score}%
                    </span>
                  </div>
                  <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${sec.score}%`,
                        background: getScoreColor(sec.score),
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Term Chips */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {goldEval.keyTermsMatched.length > 0 && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--emerald)", fontWeight: 600, marginRight: "6px" }}>
                  ✓ Matched Entities ({goldEval.keyTermsMatched.length}):
                </span>
                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px" }}>
                  {goldEval.keyTermsMatched.slice(0, 10).map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.68rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(16, 185, 129, 0.1)",
                        color: "var(--emerald)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {goldEval.missingKeyTerms.length > 0 && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginRight: "6px" }}>
                  ⚠ Unmentioned Domain Terms ({goldEval.missingKeyTerms.length}):
                </span>
                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px" }}>
                  {goldEval.missingKeyTerms.slice(0, 8).map((t, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.68rem",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(255, 255, 255, 0.03)",
                        color: "var(--text-dim)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Collapsible Gold Standard Reference Text */}
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => setShowGoldText(!showGoldText)}
              style={{
                fontSize: "0.72rem",
                color: "var(--cyan)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 600,
              }}
            >
              {showGoldText ? "▼ Hide Expert Reference Text" : "▶ View Expert Reference Text & Legal Evidence"}
            </button>

            {showGoldText && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border)",
                  fontSize: "0.78rem",
                  lineHeight: 1.55,
                  color: "var(--text-dim)",
                }}
              >
                {activeEvidence && (
                  <div
                    style={{
                      marginBottom: "10px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      background: "rgba(0, 212, 255, 0.06)",
                      border: "1px solid rgba(0, 212, 255, 0.2)",
                      color: "var(--cyan-light)",
                      fontSize: "0.72rem",
                    }}
                  >
                    <strong>Regulatory / Actuarial Evidence Citation:</strong> {activeEvidence}
                  </div>
                )}
                <div style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                  {activeGold}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                Upload Custom Ground Truth
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "14px", lineHeight: 1.4 }}>
              Upload a verified JSON/CSV file or paste the gold standard expert answer. The alignment score and use-case evaluation metrics will be recalculated instantly.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Select File (.json, .csv, .txt):
              </label>
              <input
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileUpload}
                style={{
                  width: "100%",
                  fontSize: "0.78rem",
                  color: "var(--text)",
                  padding: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Or Paste Gold Response:
              </label>
              <textarea
                rows={5}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste expert insurance answer or expected extraction payload here..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "0.78rem",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-dim)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!uploadText.trim()}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--cyan)",
                  color: "#050b14",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: uploadText.trim() ? "pointer" : "not-allowed",
                  opacity: uploadText.trim() ? 1 : 0.5,
                }}
              >
                Apply Ground Truth
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

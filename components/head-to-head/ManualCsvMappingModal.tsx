"use client";

import React, { useState, useEffect } from "react";
import type { ManualCsvColumnMapping } from "@/lib/manual-insurance-csv";

interface Props {
  fileName: string;
  headers: string[];
  sampleRows: string[][];
  isOpen: boolean;
  onConfirm: (mapping: ManualCsvColumnMapping) => void;
  onClose: () => void;
}

export default function ManualCsvMappingModal({
  fileName,
  headers,
  sampleRows,
  isOpen,
  onConfirm,
  onClose,
}: Props) {
  const [questionCol, setQuestionCol] = useState("");
  const [answerCol, setAnswerCol] = useState("");
  const [stemCol, setStemCol] = useState("");
  const [hasOptions, setHasOptions] = useState(false);
  const [optionACol, setOptionACol] = useState("");
  const [optionBCol, setOptionBCol] = useState("");
  const [optionCCol, setOptionCCol] = useState("");
  const [optionDCol, setOptionDCol] = useState("");
  const [optionECol, setOptionECol] = useState("");

  // Auto-detect columns on mount or when headers change
  useEffect(() => {
    if (!headers.length) return;

    // Detect question
    const qMatch = headers.find((h) =>
      /full\s*question|question\s*text|question|prompt|inquiry|case_text|input/i.test(h)
    );
    setQuestionCol(qMatch || headers[0] || "");

    // Detect answer
    const aMatch = headers.find((h) =>
      /correct\s*answer|ground\s*truth|gold\s*answer|gold|reference|expected|answer|target/i.test(h)
    );
    setAnswerCol(aMatch || (headers[1] ? headers[1] : headers[0] || ""));

    // Detect stem
    const sMatch = headers.find((h) => /question\s*stem|stem|title/i.test(h));
    setStemCol(sMatch || "");

    // Detect options
    const aOpt = headers.find((h) => /^a$|option_?a|choice_?a/i.test(h));
    const bOpt = headers.find((h) => /^b$|option_?b|choice_?b/i.test(h));
    const cOpt = headers.find((h) => /^c$|option_?c|choice_?c/i.test(h));
    const dOpt = headers.find((h) => /^d$|option_?d|choice_?d/i.test(h));
    const eOpt = headers.find((h) => /^e$|option_?e|choice_?e/i.test(h));

    if (aOpt && bOpt) {
      setHasOptions(true);
      setOptionACol(aOpt);
      setOptionBCol(bOpt);
      setOptionCCol(cOpt || "");
      setOptionDCol(dOpt || "");
      setOptionECol(eOpt || "");
    } else {
      setHasOptions(false);
      setOptionACol("");
      setOptionBCol("");
      setOptionCCol("");
      setOptionDCol("");
      setOptionECol("");
    }
  }, [headers]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!questionCol || !answerCol) return;

    const optionColumns: Record<string, string> = {};
    if (hasOptions) {
      if (optionACol) optionColumns.A = optionACol;
      if (optionBCol) optionColumns.B = optionBCol;
      if (optionCCol) optionColumns.C = optionCCol;
      if (optionDCol) optionColumns.D = optionDCol;
      if (optionECol) optionColumns.E = optionECol;
    }

    onConfirm({
      questionColumn: questionCol,
      answerColumn: answerCol,
      stemColumn: stemCol || undefined,
      optionColumns: Object.keys(optionColumns).length > 0 ? optionColumns : undefined,
    });
  };

  const getColIndex = (colName: string) => headers.indexOf(colName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-mapping-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              id="csv-mapping-title"
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text-main)",
              }}
            >
              Map CSV Columns
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                color: "var(--text-subtle)",
              }}
            >
              File: <code style={{ color: "var(--accent)" }}>{fileName}</code> — specify which columns represent the question and reference answer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-subtle)",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Required Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "6px",
                }}
              >
                Question / Prompt Column <span style={{ color: "var(--rose)" }}>*</span>
              </label>
              <select
                value={questionCol}
                onChange={(e) => setQuestionCol(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  marginBottom: "6px",
                }}
              >
                Reference / Ground Truth Column <span style={{ color: "var(--rose)" }}>*</span>
              </label>
              <select
                value={answerCol}
                onChange={(e) => setAnswerCol(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Stem */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Question Stem / Short Preview (Optional)
            </label>
            <select
              value={stemCol}
              onChange={(e) => setStemCol(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-main)",
                fontSize: "13px",
              }}
            >
              <option value="">(None — derive from question text)</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Multiple Choice Options Toggle */}
          <div style={{ marginTop: "4px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-main)",
              }}
            >
              <input
                type="checkbox"
                checked={hasOptions}
                onChange={(e) => setHasOptions(e.target.checked)}
              />
              This dataset includes multiple-choice option columns (A, B, C, D, E)
            </label>

            {hasOptions && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  { label: "Option A", val: optionACol, set: setOptionACol },
                  { label: "Option B", val: optionBCol, set: setOptionBCol },
                  { label: "Option C", val: optionCCol, set: setOptionCCol },
                  { label: "Option D", val: optionDCol, set: setOptionDCol },
                  { label: "Option E", val: optionECol, set: setOptionECol },
                ].map((opt) => (
                  <div key={opt.label}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "var(--text-subtle)",
                        marginBottom: "4px",
                      }}
                    >
                      {opt.label}
                    </label>
                    <select
                      value={opt.val}
                      onChange={(e) => opt.set(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-main)",
                      }}
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data Preview */}
          {questionCol && answerCol && sampleRows.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-subtle)",
                  marginBottom: "8px",
                }}
              >
                Mapped Data Preview (First {sampleRows.length} rows)
              </div>
              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  overflowX: "auto",
                  background: "var(--bg-canvas)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11.5px",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg-surface-elevated)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "6px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
                        Row
                      </th>
                      <th style={{ padding: "6px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
                        Question ({questionCol})
                      </th>
                      <th style={{ padding: "6px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
                        Reference ({answerCol})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, idx) => {
                      const qVal = row[getColIndex(questionCol)] || "";
                      const aVal = row[getColIndex(answerCol)] || "";
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            color: "var(--text-main)",
                          }}
                        >
                          <td style={{ padding: "6px 10px", color: "var(--text-subtle)" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "6px 10px", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {qVal || <span style={{ color: "var(--rose)", fontStyle: "italic" }}>Empty</span>}
                          </td>
                          <td style={{ padding: "6px 10px", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {aVal || <span style={{ color: "var(--rose)", fontStyle: "italic" }}>Empty</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-default)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            background: "var(--bg-surface-elevated)",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="arena-header-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!questionCol || !answerCol}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              background: questionCol && answerCol ? "var(--accent)" : "var(--bg-surface)",
              color: questionCol && answerCol ? "var(--text-inverted)" : "var(--text-subtle)",
              border: "1px solid var(--accent-border)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: questionCol && answerCol ? "pointer" : "not-allowed",
              transition: "all var(--transition-fast)",
            }}
          >
            Confirm & Import Cases
          </button>
        </div>
      </div>
    </div>
  );
}

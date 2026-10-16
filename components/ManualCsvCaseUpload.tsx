"use client";

import { useRef, useState } from "react";
import {
  decodeManualInsuranceCsv,
  cancelManualInsuranceCsvUpload,
  MAX_MANUAL_CSV_BYTES,
  MAX_MANUAL_CSV_ROWS,
  removeInvalidManualCsvCase,
  type ManualInsuranceCsvCase,
  type ManualInsuranceCsvReport,
} from "@/lib/manual-insurance-csv";

interface Props {
  cases: ManualInsuranceCsvCase[];
  onCasesChange: (cases: ManualInsuranceCsvCase[]) => void;
  onFileNameChange: (fileName: string) => void;
  onRun: () => void;
  canRun: boolean;
  isRunning: boolean;
  runError?: string | null;
}

const PREVIEW_PAGE_SIZE = 20;

export default function ManualCsvCaseUpload({
  cases,
  onCasesChange,
  onFileNameChange,
  onRun,
  canRun,
  isRunning,
  runError,
}: Props) {
  const [report, setReport] = useState<ManualInsuranceCsvReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isReading, setIsReading] = useState(false);
  const uploadGeneration = useRef(0);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const generation = ++uploadGeneration.current;
    setReport(null);
    onCasesChange([]);
    onFileNameChange("");
    setError(null);
    setPage(1);
    setIsReading(false);

    if (file.size > MAX_MANUAL_CSV_BYTES) {
      setError(
        `${file.name}: file is ${(file.size / (1024 * 1024)).toFixed(2)} MB; the maximum is 5 MB.`
      );
      return;
    }

    setIsReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation !== uploadGeneration.current) return;
      const parsed = decodeManualInsuranceCsv(file.name, bytes);
      if (generation !== uploadGeneration.current) return;
      setReport(parsed);
      onCasesChange(parsed.cases);
      onFileNameChange(file.name);
    } catch (parseError) {
      if (generation !== uploadGeneration.current) return;
      setError(parseError instanceof Error ? parseError.message : String(parseError));
    } finally {
      if (generation === uploadGeneration.current) setIsReading(false);
    }
  };

  const removeInvalidCase = (sampleId: string) => {
    const nextCases = removeInvalidManualCsvCase(cases, sampleId);
    if (nextCases === cases) return;
    onCasesChange(nextCases);
    if (report) {
      setReport({
        ...report,
        rowCount: nextCases.length,
        validCount: nextCases.filter((item) => item.errors.length === 0).length,
        invalidCount: nextCases.filter((item) => item.errors.length > 0).length,
        cases: nextCases,
      });
    }
  };

  const cancelUpload = () => {
    uploadGeneration.current += 1;
    setIsReading(false);
    setReport(null);
    setError(null);
    setPage(1);
    onCasesChange(cancelManualInsuranceCsvUpload());
    onFileNameChange("");
  };

  const pageCount = Math.max(1, Math.ceil(cases.length / PREVIEW_PAGE_SIZE));
  const visibleCases = cases.slice(
    (page - 1) * PREVIEW_PAGE_SIZE,
    page * PREVIEW_PAGE_SIZE
  );
  const invalidCount = cases.filter((item) => item.errors.length > 0).length;
  const validCount = cases.length - invalidCount;

  return (
    <section
      aria-label="Manual CSV case upload"
      style={{
        padding: "16px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface-elevated)",
        border: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div>
        <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px" }}>
          Manual Upload
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--text-subtle)", fontSize: "12px", lineHeight: 1.5 }}>
          Upload a UTF-8 CSV using <code>full question</code> and <code>correct answer</code>.
          <code> Question stem</code> and A–E options are optional. No alternative column
          names are inferred.
        </p>
        <p style={{ margin: "6px 0 0", color: "var(--text-subtle)", fontSize: "11px", lineHeight: 1.5 }}>
          Uploads are parsed in this browser and kept only in page memory. They are not
          saved to server storage; closing or refreshing this page clears them. Questions
          are sent to the selected model service, but reference answers are not.
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ color: "var(--text-subtle)", fontSize: "12px" }}>
          CSV file (max 5 MB, {MAX_MANUAL_CSV_ROWS} rows)
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={isRunning || isReading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              void handleFile(file);
              event.currentTarget.value = "";
            }}
            style={{ display: "block", marginTop: "6px", color: "var(--text-main)" }}
          />
        </label>
        {(report || error || isReading) && (
          <button
            type="button"
            className="arena-header-btn"
            disabled={isRunning}
            onClick={cancelUpload}
          >
            Cancel / Remove upload
          </button>
        )}
        {isReading && (
          <span role="status" style={{ color: "var(--accent)", fontSize: "12px" }}>
            Validating CSV…
          </span>
        )}
      </div>

      {error && (
        <div role="alert" style={{ color: "var(--rose)", fontSize: "12px" }}>
          {error}
        </div>
      )}
      {runError && (
        <div role="alert" style={{ color: "var(--rose)", fontSize: "12px" }}>
          {runError}
        </div>
      )}

      {report && (
        <>
          <div
            role="status"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-subtle)",
              fontSize: "12px",
            }}
          >
            <strong style={{ color: "var(--text-main)" }}>{report.fileName}</strong>
            {" · "}{report.rowCount} rows
            {" · "}<span style={{ color: "var(--emerald)" }}>{validCount} valid</span>
            {" · "}<span style={{ color: invalidCount ? "var(--rose)" : "var(--text-subtle)" }}>
              {invalidCount} invalid
            </span>
            <div style={{ marginTop: "4px", fontSize: "11px" }}>
              Columns recognized: {report.headers.join(", ")}
            </div>
            {invalidCount > 0 && (
              <div style={{ marginTop: "5px", color: "var(--rose)" }}>
                Invalid rows must be reviewed and removed explicitly before running.
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-subtle)", background: "var(--bg-surface)" }}>
                  <th style={{ padding: "8px" }}>CSV row</th>
                  <th style={{ padding: "8px" }}>Question preview</th>
                  <th style={{ padding: "8px" }}>Options</th>
                  <th style={{ padding: "8px" }}>Validation</th>
                  <th style={{ padding: "8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleCases.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{item.sourceRowNumber}</td>
                    <td style={{ padding: "8px", minWidth: "240px" }}>
                      {item.questionStem || item.fullQuestion.replace(/\s+/g, " ").slice(0, 240) || "(empty)"}
                    </td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                      {Object.keys(item.options).join(", ") || "None"}
                    </td>
                    <td style={{ padding: "8px", color: item.errors.length ? "var(--rose)" : "var(--emerald)" }}>
                      {item.errors.length ? item.errors.join("; ") : "Valid"}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {item.errors.length > 0 && (
                        <button
                          type="button"
                          className="arena-header-btn"
                          disabled={isRunning}
                          onClick={() => removeInvalidCase(item.id)}
                        >
                          Remove invalid row
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>
              Preview {Math.min(PREVIEW_PAGE_SIZE, Math.max(0, cases.length - (page - 1) * PREVIEW_PAGE_SIZE))} of {cases.length} · Page {page} of {pageCount}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="arena-header-btn" disabled={page <= 1 || isRunning} onClick={() => setPage((value) => value - 1)}>
                Previous
              </button>
              <button type="button" className="arena-header-btn" disabled={page >= pageCount || isRunning} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-subtle)", fontSize: "12px" }}>
              Ready cases: {validCount} · unresolved invalid rows: {invalidCount}
            </span>
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun || isRunning}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                border: "none",
                color: "var(--text-inverted)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: canRun && !isRunning ? "pointer" : "not-allowed",
                opacity: canRun && !isRunning ? 1 : 0.5,
              }}
            >
              {isRunning ? "Running uploaded cases…" : `Run Manual Upload (${validCount} cases)`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

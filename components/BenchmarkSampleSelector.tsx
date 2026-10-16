"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  InsuranceBenchmarkDefinition,
  InsuranceBenchmarkId,
  InsuranceBenchmarkRecord,
} from "@/lib/insurance-benchmarks";
import {
  mergeBenchmarkSampleSelection,
  resetBenchmarkSelectionForDatasetChange,
  toggleBenchmarkSampleSelection,
} from "@/lib/benchmark-selection";

interface BenchmarkSampleSummary {
  id: string;
  benchmarkId: InsuranceBenchmarkId;
  sourceRowNumber: number;
  preview: string;
  hasOptions: boolean;
}

interface Props {
  benchmarkId: InsuranceBenchmarkId;
  selectedSampleIds: string[];
  models: string[];
  isRunning: boolean;
  onBenchmarkChange: (benchmarkId: InsuranceBenchmarkId) => void;
  onSelectionChange: (sampleIds: string[]) => void;
  onRun: () => void;
  canRun: boolean;
}

const PAGE_SIZE = 20;
const INLINE_STYLE: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-main)",
};

export default function BenchmarkSampleSelector({
  benchmarkId,
  selectedSampleIds,
  models,
  isRunning,
  onBenchmarkChange,
  onSelectionChange,
  onRun,
  canRun,
}: Props) {
  const [benchmarks, setBenchmarks] = useState<InsuranceBenchmarkDefinition[]>([]);
  const [samples, setSamples] = useState<BenchmarkSampleSummary[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [search, setSearch] = useState("");
  const [optionsFilter, setOptionsFilter] = useState("all");
  const [detail, setDetail] = useState<InsuranceBenchmarkRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/insurance-benchmarks", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load benchmark groups.");
        setBenchmarks(body.benchmarks);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      benchmarkId,
      search,
      options: optionsFilter,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    setLoading(true);
    setError(null);
    fetch(`/api/insurance-benchmarks?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load benchmark samples.");
        setSamples(body.samples);
        setAvailableCount(body.availableCount);
        setFilteredCount(body.filteredCount);
        setPageCount(Math.max(1, body.pageCount));
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [benchmarkId, optionsFilter, page, search]);

  const selectedSet = useMemo(() => new Set(selectedSampleIds), [selectedSampleIds]);

  const selectMatchingSamples = async (limit?: number) => {
    setError(null);
    try {
      const query = new URLSearchParams({
        benchmarkId,
        search,
        options: optionsFilter,
        idsOnly: "true",
      });
      const response = await fetch(`/api/insurance-benchmarks?${query}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to select matching samples.");
      const ids: string[] = limit ? body.ids.slice(0, limit) : body.ids;
      onSelectionChange(mergeBenchmarkSampleSelection(selectedSampleIds, ids));
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : String(selectionError));
    }
  };

  const openSample = async (sampleId: string) => {
    setDetail(null);
    setError(null);
    try {
      const query = new URLSearchParams({ benchmarkId, sampleId });
      const response = await fetch(`/api/insurance-benchmarks?${query}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to inspect sample.");
      setDetail(body.record);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : String(detailError));
    }
  };

  const changeBenchmark = (nextBenchmarkId: InsuranceBenchmarkId) => {
    setDetail(null);
    setPage(1);
    onBenchmarkChange(nextBenchmarkId);
    onSelectionChange(resetBenchmarkSelectionForDatasetChange());
  };

  return (
    <section
      aria-label="Benchmark sample selection"
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--text-subtle)", fontSize: "11px" }}>
          Benchmark group
          <select
            aria-label="Benchmark group"
            value={benchmarkId}
            disabled={isRunning}
            onChange={(event) => changeBenchmark(event.target.value as InsuranceBenchmarkId)}
            style={INLINE_STYLE}
          >
            {benchmarks.map((benchmark) => (
              <option key={benchmark.id} value={benchmark.id} disabled={!benchmark.available}>
                {benchmark.name}
              </option>
            ))}
          </select>
        </label>
        <div style={{ color: "var(--text-subtle)", fontSize: "12px" }}>
          Available samples: <strong style={{ color: "var(--text-main)" }}>{availableCount.toLocaleString()}</strong>
        </div>
        <div style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 700 }}>
          Selected: {selectedSampleIds.length}
        </div>
        <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>
          {models.length} model{models.length === 1 ? "" : "s"} will receive the same selected questions.
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <input
          type="search"
          aria-label="Search benchmark samples"
          placeholder="Search question text or options"
          value={search}
          disabled={isRunning}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          style={{ ...INLINE_STYLE, flex: "1 1 220px" }}
        />
        <select
          aria-label="Filter by answer options"
          value={optionsFilter}
          disabled={isRunning}
          onChange={(event) => {
            setOptionsFilter(event.target.value);
            setPage(1);
          }}
          style={INLINE_STYLE}
        >
          <option value="all">All samples</option>
          <option value="with-options">Samples with answer options</option>
          <option value="without-options">Samples without answer options</option>
        </select>
        <button type="button" className="arena-header-btn" disabled={isRunning} onClick={() => void selectMatchingSamples()}>
          Select filtered ({filteredCount})
        </button>
        <button type="button" className="arena-header-btn" disabled={isRunning} onClick={() => void selectMatchingSamples(5)}>
          Add 5-sample batch
        </button>
        <button type="button" className="arena-header-btn" disabled={isRunning} onClick={() => onSelectionChange([])}>
          Clear selection
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: "var(--rose)", fontSize: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-subtle)", background: "var(--bg-surface)" }}>
              <th style={{ padding: "8px" }}>Select</th>
              <th style={{ padding: "8px" }}>Sample ID</th>
              <th style={{ padding: "8px" }}>Group</th>
              <th style={{ padding: "8px" }}>Question preview</th>
              <th style={{ padding: "8px" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "8px" }}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${sample.id}`}
                    checked={selectedSet.has(sample.id)}
                    disabled={isRunning}
                    onChange={() => onSelectionChange(toggleBenchmarkSampleSelection(selectedSampleIds, sample.id))}
                  />
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                  {sample.id}
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {benchmarks.find((item) => item.id === sample.benchmarkId)?.name ?? sample.benchmarkId}
                </td>
                <td style={{ padding: "8px", minWidth: "240px" }}>{sample.preview}</td>
                <td style={{ padding: "8px" }}>
                  <button type="button" className="arena-header-btn" onClick={() => void openSample(sample.id)}>
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
            {!loading && samples.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "14px", color: "var(--text-subtle)", textAlign: "center" }}>
                  No samples match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>
          {loading ? "Loading samples…" : `${filteredCount.toLocaleString()} matching · Page ${page} of ${pageCount}`}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="arena-header-btn" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <button type="button" className="arena-header-btn" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </div>
      </div>

      {detail && (
        <div
          role="dialog"
          aria-label={`Inspect ${detail.id}`}
          style={{
            padding: "14px",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <strong style={{ color: "var(--accent)" }}>{detail.id} · source row {detail.sourceRowNumber}</strong>
            <button type="button" className="arena-header-btn" onClick={() => setDetail(null)}>Close</button>
          </div>
          {detail.questionStem && (
            <div><strong>Question stem:</strong> {detail.questionStem}</div>
          )}
          <div style={{ whiteSpace: "pre-wrap" }}><strong>Full question:</strong>{"\n"}{detail.fullQuestion}</div>
          {Object.keys(detail.options).length > 0 && (
            <div>
              <strong>Answer options:</strong>
              <ul style={{ margin: "6px 0", paddingLeft: "22px" }}>
                {Object.entries(detail.options).map(([label, value]) => (
                  <li key={label}><strong>{label}.</strong> {value}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ whiteSpace: "pre-wrap" }}>
            <strong>Reference answer (evaluation only; not sent to models):</strong>{"\n"}
            {detail.correctAnswer}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>
          Benchmark run version: cufe-inspired-csv-v1
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
          {isRunning ? "Running selected samples…" : `Run Comparison (${selectedSampleIds.length} samples)`}
        </button>
      </div>
    </section>
  );
}

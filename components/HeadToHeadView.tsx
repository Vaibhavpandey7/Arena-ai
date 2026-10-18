"use client";

import React, { useState, useEffect } from "react";
import SingleSampleEvaluation from "./head-to-head/SingleSampleEvaluation";
import BatchBenchmarkEvaluation from "./head-to-head/BatchBenchmarkEvaluation";
import type { BenchmarkNavigationSelection } from "@/lib/benchmark-selection";
import type { InsuranceBenchmarkId } from "@/lib/insurance-benchmark-registry";

export interface ModelState {
  reasoning: string;
  answer: string;
  isRunning: boolean;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estCostUsd: number;
  reasoningTokens: number;
  startTime: number | null;
  elapsed: number;
  runStatus?: "success" | "failed" | "cancelled";
  customGold?: string;
  customEvidence?: string;
}

interface HeadToHeadProps {
  initialPrompt?: string;
  initialBenchmarkSelection?: BenchmarkNavigationSelection;
  onReady?: () => void;
}

export default function HeadToHeadView({
  initialPrompt,
  initialBenchmarkSelection,
  onReady,
}: HeadToHeadProps = {}) {
  // Two Evaluation Modes
  const [evaluationMode, setEvaluationMode] = useState<"single" | "batch">(
    initialBenchmarkSelection && (initialBenchmarkSelection.sampleIds?.length ?? 0) > 1
      ? "batch"
      : "single"
  );

  useEffect(() => {
    if (initialBenchmarkSelection) {
      if ((initialBenchmarkSelection.sampleIds?.length ?? 0) > 1) {
        setEvaluationMode("batch");
      } else {
        setEvaluationMode("single");
      }
      onReady?.();
    } else if (initialPrompt) {
      setEvaluationMode("single");
      onReady?.();
    }
  }, [initialBenchmarkSelection, initialPrompt, onReady]);

  return (
    <div
      className="h2h-view-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 56px)",
        background: "var(--bg-canvas)",
        color: "var(--text-main)",
      }}
    >
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "19px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-main)",
              }}
            >
              Head-to-Head Evaluation
            </h1>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              Enterprise Studio
            </span>
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12.5px",
              color: "var(--text-subtle)",
              maxWidth: "680px",
            }}
          >
            Compare insurance AI models using consistent questions, reference answers, and measurable evaluation criteria.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface-elevated)",
            borderRadius: "var(--radius-md)",
            padding: "3px",
            border: "1px solid var(--border-default)",
          }}
        >
          <button
            id="btn-mode-single"
            type="button"
            onClick={() => setEvaluationMode("single")}
            style={{
              padding: "7px 18px",
              borderRadius: "var(--radius-sm)",
              background: evaluationMode === "single" ? "var(--accent)" : "transparent",
              color: evaluationMode === "single" ? "var(--text-inverted)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "12.5px",
              border: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Single-Sample Evaluation</span>
          </button>
          <button
            id="btn-mode-batch"
            type="button"
            onClick={() => setEvaluationMode("batch")}
            style={{
              padding: "7px 18px",
              borderRadius: "var(--radius-sm)",
              background: evaluationMode === "batch" ? "var(--accent)" : "transparent",
              color: evaluationMode === "batch" ? "var(--text-inverted)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "12.5px",
              border: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Batch Benchmark Evaluation</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace Body ─────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: "24px 28px 48px",
          maxWidth: "1440px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {evaluationMode === "single" ? (
          <SingleSampleEvaluation
            initialPrompt={initialPrompt}
            initialBenchmarkId={initialBenchmarkSelection?.benchmarkId}
            initialSampleId={initialBenchmarkSelection?.sampleIds?.[0]}
          />
        ) : (
          <BatchBenchmarkEvaluation />
        )}
      </main>
    </div>
  );
}

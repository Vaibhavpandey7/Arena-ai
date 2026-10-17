"use client";

import React, { useState, useMemo } from "react";
import {
  RADAR_CATEGORIES,
  type RadarCategoryId,
  computeRadarScores,
  type ModelRadarScore,
} from "@/lib/insurance-radar-taxonomy";
import { evaluateReferenceAnswer } from "@/lib/benchmark-eval";

interface RadarComparisonChartProps {
  modelIds: string[];
  items: Array<{
    sampleId: string;
    category?: string;
    fullQuestion: string;
    correctAnswer?: string;
    options?: Record<string, string>;
    scoringPolicy?: any;
    modelStates: Array<{
      modelId: string;
      answer: string;
      runStatus: string;
      latencyMs: number;
    }>;
  }>;
  activeCategory?: RadarCategoryId;
  availableCategories?: RadarCategoryId[];
}

const MODEL_PALETTE = [
  { stroke: "#06b6d4", fill: "rgba(6, 182, 212, 0.22)", name: "Model A", dot: "#22d3ee" },
  { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.22)", name: "Model B", dot: "#c084fc" },
  { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.22)", name: "Model C", dot: "#34d399" },
  { stroke: "#f43f5e", fill: "rgba(244, 63, 94, 0.22)", name: "Model D", dot: "#fb7185" },
];

export default function RadarComparisonChart({
  modelIds,
  items,
  activeCategory,
  availableCategories,
}: RadarComparisonChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<RadarCategoryId>(
    activeCategory || "overview"
  );
  const [hoveredDim, setHoveredDim] = useState<string | null>(null);
  const [activeModelToggles, setActiveModelToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    modelIds.forEach((m) => (init[m] = true));
    return init;
  });

  // Keep selectedCategory in sync when activeCategory prop changes
  React.useEffect(() => {
    if (activeCategory) {
      setSelectedCategory(activeCategory);
    }
  }, [activeCategory]);

  const displayedCategories = useMemo(() => {
    if (availableCategories && availableCategories.length > 0) {
      return RADAR_CATEGORIES.filter((c) => availableCategories.includes(c.id));
    }
    if (activeCategory) {
      return RADAR_CATEGORIES.filter((c) => c.id === activeCategory);
    }
    return RADAR_CATEGORIES;
  }, [availableCategories, activeCategory]);

  const currentCatDef = useMemo(
    () => RADAR_CATEGORIES.find((c) => c.id === selectedCategory) || RADAR_CATEGORIES[0],
    [selectedCategory]
  );

  const radarScores = useMemo(() => {
    return computeRadarScores(selectedCategory, modelIds, items, evaluateReferenceAnswer);
  }, [selectedCategory, modelIds, items]);

  const toggleModel = (id: string) => {
    setActiveModelToggles((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  // SVG Geometry
  const size = 560;
  const center = size / 2;
  const dimensions = currentCatDef.dimensions;
  const numDims = dimensions.length;
  const radius = numDims > 10 ? 165 : 180;

  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to compute (x, y) coordinates
  const getCoordinates = (index: number, scorePercent: number, customRadius = radius) => {
    const angle = (Math.PI * 2 / numDims) * index - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, scorePercent)) / 100) * customRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Compute polygons for each model
  const polygons = useMemo(() => {
    return modelIds.map((mId, idx) => {
      const scoreObj = radarScores[mId];
      if (!scoreObj) return null;

      const points = dimensions.map((d, dIdx) => {
        const val = scoreObj.dimensionScores[d.id] ?? 0;
        const { x, y } = getCoordinates(dIdx, val);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");

      return {
        modelId: mId,
        color: MODEL_PALETTE[idx % MODEL_PALETTE.length],
        points,
        overallScore: scoreObj.overallScore,
        dimensionScores: scoreObj.dimensionScores,
      };
    }).filter(Boolean);
  }, [modelIds, radarScores, dimensions]);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "20px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header and Category Selector Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>{currentCatDef.icon}</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
              {currentCatDef.name}
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#38bdf8",
                background: "rgba(56, 189, 248, 0.12)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid rgba(56, 189, 248, 0.25)",
              }}
            >
              {dimensions.length} Dimensions
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
            {currentCatDef.description}
          </p>
        </div>

        {/* Category switcher pills (only displayed if multiple categories are active in the dataset) */}
        {displayedCategories.length > 1 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {displayedCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: isSelected
                      ? "1px solid #38bdf8"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)"
                      : "rgba(30, 41, 59, 0.6)",
                    color: isSelected ? "#38bdf8" : "#cbd5e1",
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name.replace(" Detailed Comparison Radar Chart", "").replace("Insurance ", "").replace(" 5 Core Competencies", "")}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main SVG Radar Visual & Model Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: "20px", alignItems: "center" }}>
        {/* SVG Container */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: `${size}px`,
            margin: "0 auto",
            aspectRatio: "1 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            {/* Background circular web rings (non-interactive) */}
            {rings.map((fraction, rIdx) => {
              const r = fraction * radius;
              return (
                <g key={fraction} style={{ pointerEvents: "none" }}>
                  <circle
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke={rIdx === rings.length - 1 ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.07)"}
                    strokeDasharray={rIdx === rings.length - 1 ? "none" : "3,3"}
                    strokeWidth={1}
                  />
                  {/* Axis percentage marker */}
                  <text
                    x={center + 4}
                    y={center - r + 3}
                    fill="rgba(148, 163, 184, 0.6)"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="start"
                  >
                    {Math.round(fraction * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Model Radar Polygons (pointerEvents: none to avoid stealing hover from spokes) */}
            {polygons?.map((poly) => {
              if (!poly) return null;
              const isVisible = activeModelToggles[poly.modelId] ?? true;
              if (!isVisible) return null;

              return (
                <g key={poly.modelId} style={{ pointerEvents: "none" }}>
                  <polygon
                    points={poly.points}
                    fill={poly.color.fill}
                    stroke={poly.color.stroke}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    style={{
                      transition: "points 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      filter: `drop-shadow(0 0 6px ${poly.color.stroke}44)`,
                    }}
                  />
                  {/* Data points along vertices */}
                  {dimensions.map((d, dIdx) => {
                    const val = poly.dimensionScores[d.id] ?? 0;
                    const { x, y } = getCoordinates(dIdx, val);
                    const isHovered = hoveredDim === d.id;

                    return (
                      <circle
                        key={d.id}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={poly.color.dot}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        style={{
                          transition: "r 0.15s ease",
                          pointerEvents: "none",
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Interactive Spokes & Labels (rendered on top with generous hit target) */}
            {dimensions.map((dim, dIdx) => {
              const { x, y, angle } = getCoordinates(dIdx, 100);
              const isHovered = hoveredDim === dim.id;

              // Compute label position slightly outside outer ring
              const labelDistance = radius + (numDims > 10 ? 24 : 28);
              const labelX = center + labelDistance * Math.cos(angle);
              const labelY = center + labelDistance * Math.sin(angle);

              let textAnchor: "middle" | "start" | "end" = "middle";
              if (Math.cos(angle) > 0.3) textAnchor = "start";
              else if (Math.cos(angle) < -0.3) textAnchor = "end";

              return (
                <g
                  key={dim.id}
                  onMouseEnter={() => setHoveredDim(dim.id)}
                  onMouseLeave={() => setHoveredDim(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Invisible wide hit stroke to make hover smooth and prevent pixel-jitter */}
                  <line
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="transparent"
                    strokeWidth={24}
                    strokeLinecap="round"
                  />
                  {/* Visible Spoke Line */}
                  <line
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke={isHovered ? "rgba(56, 189, 248, 0.9)" : "rgba(255, 255, 255, 0.12)"}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ pointerEvents: "none", transition: "stroke 0.15s ease, stroke-width 0.15s ease" }}
                  />
                  {/* Dimension Label */}
                  <text
                    x={labelX}
                    y={labelY}
                    fill={isHovered ? "#38bdf8" : "#94a3b8"}
                    fontSize={numDims > 12 ? "9.5" : "11"}
                    fontWeight="600"
                    textAnchor={textAnchor}
                    dominantBaseline="central"
                    style={{
                      transition: "fill 0.15s ease",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {dim.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Model Toggles & Dimension Detail Card (fixed 280px width to prevent layout shift) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "280px", minWidth: "280px", maxWidth: "280px", flexShrink: 0, boxSizing: "border-box" }}>
          {/* Models Legend & Toggles */}
          <div
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              borderRadius: "8px",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              Active Models Overlay
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {modelIds.map((mId, idx) => {
                const color = MODEL_PALETTE[idx % MODEL_PALETTE.length];
                const isChecked = activeModelToggles[mId] ?? true;
                const scoreObj = radarScores[mId];
                const scoreVal = scoreObj?.overallScore ?? 0;

                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => toggleModel(mId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      background: isChecked ? "rgba(15, 23, 42, 0.7)" : "transparent",
                      border: `1px solid ${isChecked ? color.stroke : "rgba(255, 255, 255, 0.06)"}`,
                      cursor: "pointer",
                      opacity: isChecked ? 1 : 0.45,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: color.stroke,
                          boxShadow: `0 0 6px ${color.stroke}`,
                        }}
                      />
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>
                        {mId.split("/").pop()}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: color.stroke }}>
                      {scoreVal}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hovered Dimension Inspector with stable height */}
          <div
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              borderRadius: "8px",
              padding: "12px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              minHeight: "155px",
              maxHeight: "185px",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            {hoveredDim ? (
              (() => {
                const d = dimensions.find((x) => x.id === hoveredDim);
                if (!d) return null;
                return (
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }}>
                      {d.label}
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
                      {d.description}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {modelIds.map((mId, idx) => {
                        const scoreObj = radarScores[mId];
                        const val = scoreObj?.dimensionScores[d.id] ?? 0;
                        const color = MODEL_PALETTE[idx % MODEL_PALETTE.length];
                        return (
                          <div
                            key={mId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              color: "#cbd5e1",
                            }}
                          >
                            <span>{mId.split("/").pop()}</span>
                            <span style={{ fontWeight: 700, color: color.stroke }}>{val}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic", textAlign: "center", paddingTop: "28px" }}>
                Hover over any axis spoke or label to inspect dimension details & per-model scores.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

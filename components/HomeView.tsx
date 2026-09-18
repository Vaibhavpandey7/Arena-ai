"use client";

type Tab = "home" | "head-to-head" | "chat-arena" | "benchmark";

interface Props {
  onNavigate: (tab: Tab) => void;
}

const MODULES = [
  {
    tab: "head-to-head" as Tab,
    icon: "⚖️",
    title: "Head-to-Head",
    desc: "Compare two models side-by-side across 8 insurance use cases. Inspect reasoning traces, token usage, and domain-specific scoring criteria aligned to EIOPA and Solvency II.",
    tags: [
      { label: "Data Extraction", cyan: false },
      { label: "Claim Assessment", cyan: false },
      { label: "AI Triage", cyan: false },
      { label: "EIOPA Checks", cyan: true },
    ],
  },
  {
    tab: "chat-arena" as Tab,
    icon: "💬",
    title: "Chat Arena",
    desc: "An interactive agentic workspace for underwriters, claims handlers, and compliance officers. Select a model, activate insurance plugins, and run complex workflows conversationally.",
    tags: [
      { label: "Agentic", cyan: false },
      { label: "Plugins", cyan: false },
      { label: "Multimodal", cyan: true },
      { label: "Tool Use", cyan: true },
    ],
  },
  {
    tab: "benchmark" as Tab,
    icon: "📊",
    title: "Insurance Benchmark",
    desc: "Standardised evaluation across INS-MMBench, CuFE, and InsuranceQA datasets. Track ROUGE, BLEU, and domain reasoning scores across models. Explore curated benchmark questions.",
    tags: [
      { label: "INS-MMBench", cyan: false },
      { label: "CuFE", cyan: false },
      { label: "ROUGE / BLEU", cyan: true },
      { label: "Leaderboard", cyan: true },
    ],
  },
];

const STATS = [
  { value: "38+", label: "Verified ground-truth records" },
  { value: "5", label: "Insurance use-case categories" },
  { value: "Real-time", label: "SSE streaming" },
  { value: "EIOPA", label: "Regulatory alignment" },
];

export default function HomeView({ onNavigate }: Props) {
  return (
    <div className="studio-content" style={{ overflowY: "auto" }}>
      <div className="home-view">
        {/* Eyebrow */}
        <p className="home-eyebrow">Adrosonic · Insurance AI Division</p>

        {/* Hero headline */}
        <h1 className="home-hero-title">
          Digital <span className="accent-word">Insurance</span>
          <br />
          Intelligence Studio
        </h1>

        <p className="home-hero-subtitle">
          Evaluate, benchmark, and deploy large language models on
          insurance-specific tasks — from EIOPA regulatory compliance to
          actuarial reasoning and claims intelligence.
        </p>

        {/* 3 Module cards */}
        <div className="home-module-grid">
          {MODULES.map((mod) => (
            <button
              key={mod.tab}
              className="home-module-card"
              onClick={() => onNavigate(mod.tab)}
              style={{ border: "none", textAlign: "left" }}
            >
              <div className="home-card-icon">{mod.icon}</div>

              <h2 className="home-card-title">{mod.title}</h2>
              <p className="home-card-desc">{mod.desc}</p>

              <div className="home-card-tags">
                {mod.tags.map((t) => (
                  <span
                    key={t.label}
                    className={`home-card-tag${t.cyan ? " cyan" : ""}`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>

              <span className="home-card-arrow">→</span>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="home-stats-row">
          {STATS.map((s) => (
            <div key={s.label} className="home-stat">
              <div className="home-stat-value">{s.value}</div>
              <div className="home-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

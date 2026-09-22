"use client";
import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import HomeView from "@/components/HomeView";
import ThemeToggle from "@/components/ThemeToggle";

// ── Lazy-load heavy views (code-split into separate JS chunks) ────────────────
// HeadToHeadView ~39KB, BenchmarkView ~33KB, ChatArenaView ~24KB
// Each is loaded only when the user first navigates to that tab.

function ViewSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-subtle)",
        fontSize: 14,
        gap: 10,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid var(--accent)",
          borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite",
        }}
      />
      Loading…
    </div>
  );
}

const HeadToHeadView = dynamic(() => import("@/components/HeadToHeadView"), {
  loading: () => <ViewSkeleton />,
  ssr: false,
});

const ChatArenaView = dynamic(() => import("@/components/ChatArenaView"), {
  loading: () => <ViewSkeleton />,
  ssr: false,
});

const BenchmarkView = dynamic(() => import("@/components/BenchmarkView"), {
  loading: () => <ViewSkeleton />,
  ssr: false,
});


type Tab = "home" | "head-to-head" | "chat-arena" | "benchmark";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "⌂", label: "Home" },
  { id: "head-to-head", icon: "⚖️", label: "Head-to-Head" },
  { id: "chat-arena", icon: "💬", label: "Chat Arena" },
  { id: "benchmark", icon: "📊", label: "Insurance Benchmark" },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [arenaInitialPrompt, setArenaInitialPrompt] = useState<string | undefined>(undefined);
  const [h2hInitialPrompt, setH2hInitialPrompt] = useState<string | undefined>(undefined);

  const navigateTo = useCallback((tab: Tab, prompt?: string) => {
    setActiveTab(tab);
    if (prompt) {
      if (tab === "chat-arena") {
        setArenaInitialPrompt(prompt);
      } else if (tab === "head-to-head") {
        setH2hInitialPrompt(prompt);
      }
    }
  }, []);

  const clearH2hPrompt = useCallback(() => setH2hInitialPrompt(undefined), []);
  const clearArenaPrompt = useCallback(() => setArenaInitialPrompt(undefined), []);

  return (
    <div className="studio-shell">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="studio-navbar">
        {/* Brand */}
        <button
          className="studio-brand"
          onClick={() => setActiveTab("home")}
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <div className="studio-brand-logo">DI</div>
          <span className="studio-brand-name">
            Digital <span>Insurance</span> Intelligence Studio
          </span>
        </button>

        {/* Nav tabs */}
        <nav className="studio-nav-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`studio-nav-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="studio-navbar-right">
          <div className="studio-status-pill">
            <span className="live-dot" />
            OpenRouter Live
          </div>

          <div className="studio-tag-pills">
            <span className="studio-tag-pill">EIOPA</span>
            <span className="studio-tag-pill">Solvency II</span>
            <span className="studio-tag-pill">INS-MMBench</span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      {activeTab === "home" && (
        <HomeView onNavigate={navigateTo} />
      )}

      {activeTab === "head-to-head" && (
        <HeadToHeadView
          initialPrompt={h2hInitialPrompt}
          onReady={clearH2hPrompt}
        />
      )}

      {activeTab === "chat-arena" && (
        <ChatArenaView
          initialPrompt={arenaInitialPrompt}
          onReady={clearArenaPrompt}
        />
      )}

      {activeTab === "benchmark" && (
        <BenchmarkView onNavigate={navigateTo} />
      )}
    </div>
  );
}

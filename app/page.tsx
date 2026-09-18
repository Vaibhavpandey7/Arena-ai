"use client";
import { useState, useCallback } from "react";
import HomeView from "@/components/HomeView";
import HeadToHeadView from "@/components/HeadToHeadView";
import ChatArenaView from "@/components/ChatArenaView";
import BenchmarkView from "@/components/BenchmarkView";
import ThemeToggle from "@/components/ThemeToggle";

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

  const navigateTo = useCallback((tab: Tab, prompt?: string) => {
    setActiveTab(tab);
    if (prompt && tab === "chat-arena") {
      setArenaInitialPrompt(prompt);
    }
  }, []);

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
        <HeadToHeadView />
      )}

      {activeTab === "chat-arena" && (
        <ChatArenaView
          key={arenaInitialPrompt ?? "arena"}
          initialPrompt={arenaInitialPrompt}
          onReady={() => setArenaInitialPrompt(undefined)}
        />
      )}

      {activeTab === "benchmark" && (
        <BenchmarkView onNavigate={navigateTo} />
      )}
    </div>
  );
}

"use client";
import { useEffect } from "react";

export default function ThemeToggle() {
  function toggle() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme") ?? "dark";
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    try { localStorage.setItem("ai-arena-theme", next); } catch {}
  }

  useEffect(() => {
    // Sync on mount in case localStorage differs
    try {
      const stored = localStorage.getItem("ai-arena-theme");
      if (stored) document.documentElement.setAttribute("data-theme", stored);
    } catch {}
  }, []);

  return (
    <button className="btn-icon" onClick={toggle} title="Toggle light/dark theme" aria-label="Toggle theme">
      <span style={{ fontSize: 14 }}>◐</span>
    </button>
  );
}

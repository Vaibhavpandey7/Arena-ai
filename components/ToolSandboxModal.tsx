"use client";
import { useState, useEffect } from "react";
import { TOOL_CATALOG, ToolCatalogItem } from "@/lib/tools-catalog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendToPrompt?: (text: string) => void;
}

export default function ToolSandboxModal({ isOpen, onClose, onSendToPrompt }: Props) {
  const [selectedTool, setSelectedTool] = useState<ToolCatalogItem>(TOOL_CATALOG[0]);
  const [argsJson, setArgsJson] = useState<string>(
    JSON.stringify(TOOL_CATALOG[0].sampleArgs, null, 2)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Sync sample args when switching tool
  useEffect(() => {
    setArgsJson(JSON.stringify(selectedTool.sampleArgs, null, 2));
    setOutput("");
    setError("");
    setDurationMs(null);
  }, [selectedTool]);

  if (!isOpen) return null;

  async function handleExecute() {
    setError("");
    setOutput("");
    setDurationMs(null);
    setIsRunning(true);

    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(argsJson);
    } catch {
      setError("Invalid JSON parameters. Please verify syntax.");
      setIsRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedTool.name,
          args: parsedArgs,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Execution failed");
      } else {
        setOutput(data.result);
        setDurationMs(data.durationMs);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleInsertIntoPrompt() {
    if (!output || !onSendToPrompt) return;
    const promptText = `Based on the following ${selectedTool.title} execution output:\n\n${output}\n\nPlease analyze the insurance implications.`;
    onSendToPrompt(promptText);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card tool-sandbox-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 740 }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div className="modal-title">Direct Tool Sandbox</div>
              <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                Test and execute domain tools directly without invoking an LLM
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tool-sandbox-body">
          {/* Tool Selector Pills */}
          <div className="sandbox-tool-pills">
            {TOOL_CATALOG.map((tool) => {
              const isSel = selectedTool.name === tool.name;
              return (
                <button
                  key={tool.name}
                  type="button"
                  className={`sandbox-tool-tab${isSel ? " active" : ""}`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <span>{tool.icon}</span>
                  <span>{tool.title}</span>
                  <span className="sandbox-tag">{tool.category}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tool Info Banner */}
          <div className="sandbox-info-banner">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="sandbox-fn-badge">{selectedTool.name}()</span>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={() => setArgsJson(JSON.stringify(selectedTool.sampleArgs, null, 2))}
              >
                Reset to Sample Args
              </button>
            </div>
            <p className="sandbox-desc">{selectedTool.description}</p>
          </div>

          {/* Arguments Editor */}
          <div className="sandbox-editor-section">
            <div className="sandbox-section-label">Input Arguments (JSON):</div>
            <textarea
              className="sandbox-json-input"
              rows={5}
              value={argsJson}
              onChange={(e) => setArgsJson(e.target.value)}
              placeholder="Enter JSON parameters..."
              spellCheck={false}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
              {durationMs !== null && (
                <span style={{ color: "var(--emerald)", fontFamily: "var(--font-mono)" }}>
                  ✓ Executed in {durationMs}ms
                </span>
              )}
            </div>

            <button
              type="button"
              className={`btn-primary${isRunning ? " running" : ""}`}
              onClick={handleExecute}
              disabled={isRunning}
              style={{ minWidth: 140 }}
            >
              {isRunning ? (
                <>
                  <span className="live-dot" style={{ background: "#fff" }} />
                  <span>Executing…</span>
                </>
              ) : (
                <>
                  <span>Execute Tool</span>
                  <span>⚡</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="sandbox-error">
              ⚠ {error}
            </div>
          )}

          {/* Output Display */}
          {output && (
            <div className="sandbox-output-panel">
              <div className="sandbox-output-header">
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan-light)" }}>
                  Tool Return Value
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {onSendToPrompt && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: 10.5, padding: "2px 8px" }}
                      onClick={handleInsertIntoPrompt}
                      title="Insert this result into prompt console"
                    >
                      Insert into Prompt
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 10.5, padding: "2px 8px" }}
                    onClick={handleCopy}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <pre className="sandbox-output-content">
                <code>{output}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

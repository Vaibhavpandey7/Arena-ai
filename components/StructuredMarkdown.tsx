"use client";
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { sanitizeResponseText } from "@/lib/prompts";

interface StructuredMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Parses simple inline formatting within table cells (**bold**, `code`, *italic*)
 */
function renderInlineContent(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="table-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={`c-${match.index}`} className="table-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="table-em">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

function parseAlignment(col: string): "left" | "center" | "right" {
  const trimmed = col.trim();
  const startsWithColon = trimmed.startsWith(":");
  const endsWithColon = trimmed.endsWith(":");
  if (startsWithColon && endsWithColon) return "center";
  if (endsWithColon) return "right";
  return "left";
}

/**
 * Checks if a paragraph child is a markdown table block and renders an executive HTML table.
 */
function renderParagraphOrTable(children: React.ReactNode): React.ReactNode {
  const fullText = React.Children.toArray(children)
    .map((c) => (typeof c === "string" ? c : ""))
    .join("");

  const rawLines = fullText.trim().split("\n").map((l) => l.trim()).filter(Boolean);

  if (
    rawLines.length >= 2 &&
    rawLines[0].startsWith("|") &&
    rawLines[0].endsWith("|") &&
    rawLines.some((l) => /^[|\s-:]+$/.test(l))
  ) {
    const separatorIdx = rawLines.findIndex((l) => /^[|\s-:]+$/.test(l));
    if (separatorIdx >= 1) {
      const headerLine = rawLines[0];
      const sepLine = rawLines[separatorIdx];
      const headers = headerLine.split("|").slice(1, -1).map((h) => h.trim());
      const alignments = sepLine
        .split("|")
        .slice(1, -1)
        .map(parseAlignment);

      const bodyLines = rawLines.slice(separatorIdx + 1);

      return (
        <div className="markdown-table-wrapper">
          <table className="institutional-table">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    style={{ textAlign: alignments[i] || "left" }}
                  >
                    {renderInlineContent(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyLines.map((row, rIdx) => {
                const cells = row.split("|").slice(1, -1).map((c) => c.trim());
                return (
                  <tr key={rIdx}>
                    {cells.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{ textAlign: alignments[cIdx] || "left" }}
                      >
                        {renderInlineContent(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  }

  return <p>{children}</p>;
}

export function StructuredMarkdown({ content, className }: StructuredMarkdownProps) {
  // Sanitize content to ensure zero emojis and clean spacing
  const sanitized = useMemo(() => sanitizeResponseText(content), [content]);

  return (
    <div className={`structured-markdown-root ${className || ""}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => renderParagraphOrTable(children),
          h1: ({ children }) => (
            <h1 className="institutional-h1">
              <span className="h-indicator" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="institutional-h2">
              <span className="h-indicator" />
              {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="institutional-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="institutional-h4">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="institutional-callout">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="institutional-list">{children}</ul>,
          ol: ({ children }) => <ol className="institutional-ol">{children}</ol>,
          li: ({ children }) => <li className="institutional-li">{children}</li>,
          code: ({ children, className: codeClass }) => {
            const isInline = !codeClass || !codeClass.includes("language-");
            if (isInline) {
              return <code className="institutional-inline-code">{children}</code>;
            }
            return (
              <pre className="institutional-pre">
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}

export default StructuredMarkdown;

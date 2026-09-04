import { searchRecords } from "./data-lake";
import type { DomainType } from "./dil-schema";

// ── Tool Registry Types ───────────────────────────────────────────────────────

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

export interface Tool {
  schema: ToolSchema;
  run(args: Record<string, unknown>): Promise<string>;
}

// ── Tool 1: Calculator ────────────────────────────────────────────────────────

const SAFE_EXPR_RE = /^[\d\s+\-*/().]+$/;

function safeEval(expression: string): number {
  if (!SAFE_EXPR_RE.test(expression)) {
    throw new Error(
      `Unsafe expression. Only digits and operators (+ - * / ( ) .) are allowed. Got: "${expression}"`
    );
  }
  // Use Function constructor after character validation
  // eslint-disable-next-line no-new-func
  const result = new Function(`"use strict"; return (${expression})`)();
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error(`Expression did not evaluate to a finite number: ${expression}`);
  }
  return result;
}

const calculatorTool: Tool = {
  schema: {
    type: "function",
    function: {
      name: "calculator",
      description:
        "Evaluates a safe arithmetic expression. Supports +, -, *, /, parentheses, and decimal numbers. Use this for any numerical calculation.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              'The arithmetic expression to evaluate, e.g. "125000 * 0.023 / 12"',
          },
        },
        required: ["expression"],
      },
    },
  },
  async run(args) {
    const expression = String(args.expression ?? "").trim();
    if (!expression) return "Error: expression is required";
    try {
      const result = safeEval(expression);
      return `${expression} = ${result}`;
    } catch (err) {
      return `Error: ${(err as Error).message}`;
    }
  },
};

// ── Tool 2: Get Current Time ──────────────────────────────────────────────────

const getCurrentTimeTool: Tool = {
  schema: {
    type: "function",
    function: {
      name: "get_current_time",
      description:
        "Returns the current date and time, optionally in a specified IANA timezone (e.g. 'America/New_York', 'Europe/London', 'Asia/Kolkata').",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "IANA timezone name. Defaults to UTC if not provided.",
          },
        },
        required: [],
      },
    },
  },
  async run(args) {
    const timezone = typeof args.timezone === "string" ? args.timezone : "UTC";
    try {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }).format(now);
      return `Current time in ${timezone}: ${formatted} (ISO: ${now.toISOString()})`;
    } catch {
      return `Error: Invalid timezone '${timezone}'. Use an IANA timezone name like 'America/New_York'.`;
    }
  },
};

// ── Tool 3: Insurance Knowledge Search ───────────────────────────────────────

const insuranceKnowledgeSearchTool: Tool = {
  schema: {
    type: "function",
    function: {
      name: "insurance_knowledge_search",
      description:
        "Searches the insurance knowledge data lake for records matching a query. Returns the top 3 matches with question, evidence, and response. Use this to retrieve insurance domain knowledge, regulatory information, or actuarial data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query string",
          },
          domain: {
            type: "string",
            description:
              "Optional domain filter. One of: insurance_knowledge, eu_regulatory_compliance, insurance_documents, actuarial_numerical_data, tool_api_data, agentic_trajectory_data, human_feedback_preferences",
          },
        },
        required: ["query"],
      },
    },
  },
  async run(args) {
    const query = String(args.query ?? "").trim();
    if (!query) return "Error: query is required";

    const domain = typeof args.domain === "string" ? (args.domain as DomainType) : undefined;
    const results = await searchRecords(query, domain);

    if (results.length === 0) {
      return `No results found for query: "${query}"${domain ? ` in domain: ${domain}` : ""}`;
    }

    return results
      .map(
        (r, i) =>
          `[Result ${i + 1}]\nQuestion: ${r.question}\nEvidence: ${r.evidence ?? "N/A"}\nResponse: ${r.response}`
      )
      .join("\n\n---\n\n");
  },
};

// ── Tool Registry ─────────────────────────────────────────────────────────────
// To add a new tool: just append an entry here. No changes needed elsewhere.

export const TOOLS: Tool[] = [
  calculatorTool,
  getCurrentTimeTool,
  insuranceKnowledgeSearchTool,
];

export const TOOL_SCHEMAS: ToolSchema[] = TOOLS.map((t) => t.schema);

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const tool = TOOLS.find((t) => t.schema.function.name === name);
  if (!tool) {
    return `Error: Unknown tool '${name}'`;
  }
  try {
    return await tool.run(args);
  } catch (err) {
    return `Error running tool '${name}': ${(err as Error).message}`;
  }
}

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

// ── Tool 4: Currency Converter ────────────────────────────────────────────────

const EXCHANGE_RATES_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 1.085,
  GBP: 0.855,
  CHF: 0.955,
  JPY: 162.5,
};

const currencyConverterTool: Tool = {
  schema: {
    type: "function",
    function: {
      name: "currency_converter",
      description:
        "Converts financial amounts between major actuarial currencies (EUR, USD, GBP, CHF, JPY) using reference benchmark exchange rates for international reinsurance and cross-border policies.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "The numerical amount to convert (e.g. 250000)",
          },
          from: {
            type: "string",
            description: "Source currency ISO code: EUR, USD, GBP, CHF, or JPY",
            enum: ["EUR", "USD", "GBP", "CHF", "JPY"],
          },
          to: {
            type: "string",
            description: "Target currency ISO code: EUR, USD, GBP, CHF, or JPY",
            enum: ["EUR", "USD", "GBP", "CHF", "JPY"],
          },
        },
        required: ["amount", "from", "to"],
      },
    },
  },
  async run(args) {
    const amount = Number(args.amount);
    if (isNaN(amount)) return "Error: amount must be a valid number";

    const from = String(args.from ?? "").toUpperCase().trim();
    const to = String(args.to ?? "").toUpperCase().trim();

    if (!EXCHANGE_RATES_TO_EUR[from]) {
      return `Error: Unsupported source currency '${from}'. Supported: EUR, USD, GBP, CHF, JPY`;
    }
    if (!EXCHANGE_RATES_TO_EUR[to]) {
      return `Error: Unsupported target currency '${to}'. Supported: EUR, USD, GBP, CHF, JPY`;
    }

    if (from === to) {
      return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${from} = ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to} (Rate: 1.0000)`;
    }

    // Convert from source to EUR, then EUR to target
    const inEur = amount / EXCHANGE_RATES_TO_EUR[from];
    const converted = inEur * EXCHANGE_RATES_TO_EUR[to];
    const rate = EXCHANGE_RATES_TO_EUR[to] / EXCHANGE_RATES_TO_EUR[from];

    return [
      `[Currency Conversion]`,
      `Original: ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${from}`,
      `Converted: ${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`,
      `Effective Rate: 1 ${from} = ${rate.toFixed(4)} ${to}`,
      `Basis: Actuarial Benchmark Reference (ECB Triangulated)`,
    ].join("\n");
  },
};

// ── Tool 5: Solvency II Ratio Checker ─────────────────────────────────────────

const solvencyRatioCheckerTool: Tool = {
  schema: {
    type: "function",
    function: {
      name: "solvency_ratio_checker",
      description:
        "Evaluates the Solvency II Capital Coverage Ratio (Eligible Own Funds / SCR * 100%) and determines the regulatory solvency zone, supervisory ladder intervention status, and required actions under EU Solvency II Pillar 1 Directive.",
      parameters: {
        type: "object",
        properties: {
          eligible_own_funds: {
            type: "number",
            description: "Total Eligible Own Funds available to cover the SCR (in same currency/denomination as SCR)",
          },
          scr: {
            type: "number",
            description: "Solvency Capital Requirement (SCR) calculated under standard formula or internal model",
          },
          mcr: {
            type: "number",
            description: "Minimum Capital Requirement (MCR). If omitted, defaults to 45% of SCR.",
          },
        },
        required: ["eligible_own_funds", "scr"],
      },
    },
  },
  async run(args) {
    const ownFunds = Number(args.eligible_own_funds);
    const scr = Number(args.scr);
    const mcr = args.mcr !== undefined ? Number(args.mcr) : scr * 0.45;

    if (isNaN(ownFunds) || isNaN(scr) || scr <= 0) {
      return "Error: eligible_own_funds and scr must be positive numbers";
    }

    const scrRatio = (ownFunds / scr) * 100;
    const mcrRatio = mcr > 0 ? (ownFunds / mcr) * 100 : null;

    let status = "";
    let zone = "";
    let action = "";

    if (scrRatio >= 150) {
      zone = "Optimal Green Zone";
      status = "Substantially Capitalized";
      action = "Normal supervision. Capital buffer exceeds market median; eligible for standard dividend distributions.";
    } else if (scrRatio >= 120) {
      zone = "Standard Green Zone";
      status = "Adequately Capitalized";
      action = "Compliant with Solvency II Article 100. Continuous monitoring of ORSA sensitivity.";
    } else if (scrRatio >= 100) {
      zone = "Amber Watch Zone";
      status = "Capital Squeeze / Close to Breach";
      action = "Enhanced supervisory scrutiny. Capital preservation measures and stress test re-evaluation strongly advised.";
    } else {
      zone = "Red Intervention Zone";
      status = "SCR Breach (Solvency II Article 138)";
      action = "Mandatory supervisory notification. Insurer must submit a realistic recovery plan within 2 months to restore compliance within 6 months.";
    }

    let mcrWarning = "";
    if (mcrRatio !== null && mcrRatio < 100) {
      zone = "CRITICAL Red Zone (MCR Breach)";
      status = "Minimum Capital Requirement Breach (Article 139)";
      mcrWarning = "\nCRITICAL: MCR breach triggers potential withdrawal of insurance authorization. Short-term realistic finance scheme required within 1 month.";
    }

    return [
      `[Solvency II Pillar 1 Assessment]`,
      `Eligible Own Funds: ${ownFunds.toLocaleString()} | SCR: ${scr.toLocaleString()}${mcr > 0 ? ` | MCR: ${mcr.toLocaleString()}` : ""}`,
      `SCR Coverage Ratio: ${scrRatio.toFixed(2)}%`,
      mcrRatio !== null ? `MCR Coverage Ratio: ${mcrRatio.toFixed(2)}%` : "",
      `Regulatory Status: ${status}`,
      `Supervisory Zone: ${zone}`,
      `Required Supervisory Action: ${action}${mcrWarning}`,
    ].filter(Boolean).join("\n");
  },
};

// ── Tool Registry ─────────────────────────────────────────────────────────────

export { TOOL_CATALOG, type ToolCatalogItem } from "./tools-catalog";

export const TOOLS: Tool[] = [
  calculatorTool,
  solvencyRatioCheckerTool,
  insuranceKnowledgeSearchTool,
  currencyConverterTool,
  getCurrentTimeTool,
];

export const TOOL_SCHEMAS: ToolSchema[] = TOOLS.map((t) => t.schema);

export function getFilteredToolSchemas(toolNames?: string[]): ToolSchema[] {
  if (!toolNames || toolNames.length === 0) return TOOL_SCHEMAS;
  return TOOLS.filter((t) => toolNames.includes(t.schema.function.name)).map((t) => t.schema);
}

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

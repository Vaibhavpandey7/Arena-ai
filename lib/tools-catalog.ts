export interface ToolCatalogItem {
  name: string;
  title: string;
  description: string;
  category: "Actuarial" | "Regulatory" | "Knowledge" | "Utility";
  icon: string;
  sampleArgs: Record<string, unknown>;
}

export const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    name: "calculator",
    title: "Safe Actuarial Calculator",
    description: "Evaluates exact arithmetic expressions for actuarial models, loss ratios, and premiums.",
    category: "Actuarial",
    icon: "🧮",
    sampleArgs: { expression: "(125000 * 0.68) + (45000 / 12)" },
  },
  {
    name: "solvency_ratio_checker",
    title: "Solvency II Ratio Checker",
    description: "Assesses Own Funds vs SCR/MCR capital coverage and supervisory intervention ladders.",
    category: "Regulatory",
    icon: "⚖️",
    sampleArgs: { eligible_own_funds: 185000000, scr: 120000000, mcr: 54000000 },
  },
  {
    name: "insurance_knowledge_search",
    title: "Domain Insurance Lake Search",
    description: "Retrieves ground-truth insurance records, EIOPA compliance clauses, and policy text.",
    category: "Knowledge",
    icon: "🔍",
    sampleArgs: { query: "Solvency Capital Requirement SCR standard formula", domain: "eu_regulatory_compliance" },
  },
  {
    name: "currency_converter",
    title: "Actuarial Currency Converter",
    description: "Converts between EUR, USD, GBP, CHF, and JPY for international treaties and claims.",
    category: "Actuarial",
    icon: "💱",
    sampleArgs: { amount: 2500000, from: "EUR", to: "USD" },
  },
  {
    name: "get_current_time",
    title: "Current Time & Timezone",
    description: "Gets real-time ISO dates across IANA timezones for policy effective dates and cutoffs.",
    category: "Utility",
    icon: "⏱️",
    sampleArgs: { timezone: "Europe/Berlin" },
  },
];

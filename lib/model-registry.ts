/**
 * Central model registry — enriched metadata for all OpenRouter models used in the studio.
 * Includes tier, capability tags, context window, and free/paid status.
 */

export type ModelTier = "free" | "budget" | "standard" | "premium";
export type ModelTag =
  | "reasoning"
  | "extended-thinking"
  | "fast"
  | "multimodal"
  | "domain-specific"
  | "open-source"
  | "long-context";

export interface ModelDef {
  id: string;
  label: string;
  provider: string;
  providerInitial: string;
  tier: ModelTier;
  tags: ModelTag[];
  contextK: number;    // context window in thousands of tokens
  isFree: boolean;     // completely free on OpenRouter
  tooltip: string;
  badge: "reasoning" | "extended" | "fast" | "premium"; // legacy badge for col headers
}

export const MODEL_REGISTRY: ModelDef[] = [
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "free",
    tags: ["reasoning", "open-source"],
    contextK: 164,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "State-of-the-art open-source reasoning model from DeepSeek. Outputs full chain-of-thought. Excellent for actuarial and regulatory tasks. Free on OpenRouter.",
  },
  {
    id: "deepseek/deepseek-r1-0528",
    label: "DeepSeek R1 0528",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "free",
    tags: ["reasoning", "open-source"],
    contextK: 164,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "May 2025 update of DeepSeek R1 with improved reasoning and instruction following. Free on OpenRouter.",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    providerInitial: "AN",
    tier: "premium",
    tags: ["extended-thinking", "domain-specific"],
    contextK: 1000,
    isFree: false,
    badge: "extended",
    tooltip:
      "Anthropic's latest Sonnet 4.6 with extended thinking mode and 1M context. Best in class for multi-step insurance scenario analysis and EIOPA compliance tasks.",
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    label: "Claude Sonnet 3.5",
    provider: "Anthropic",
    providerInitial: "AN",
    tier: "premium",
    tags: ["fast", "domain-specific"],
    contextK: 200,
    isFree: false,
    badge: "premium",
    tooltip:
      "Anthropic's proven workhorse with exceptional instruction following and 200K context. Highly rated for policy translation and claim assessment.",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    providerInitial: "OA",
    tier: "standard",
    tags: ["fast", "multimodal"],
    contextK: 128,
    isFree: false,
    badge: "fast",
    tooltip:
      "OpenAI's flagship multimodal model. Handles text, images, and documents. Good all-rounder for insurance workflows. Supports vision for document analysis.",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    providerInitial: "OA",
    tier: "budget",
    tags: ["fast"],
    contextK: 128,
    isFree: false,
    badge: "fast",
    tooltip:
      "Fast, low-cost version of GPT-4o. Ideal for high-volume, lower-complexity tasks like data extraction or triage routing.",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    provider: "Google",
    providerInitial: "GG",
    tier: "budget",
    tags: ["fast", "multimodal"],
    contextK: 1000,
    isFree: false,
    badge: "fast",
    tooltip:
      "Google's fast multimodal model with a massive 1M token context window. Excellent for long-form policy document analysis at low cost.",
  },
  {
    id: "google/gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "Google",
    providerInitial: "GG",
    tier: "budget",
    tags: ["reasoning", "fast", "multimodal"],
    contextK: 1000,
    isFree: false,
    badge: "reasoning",
    tooltip:
      "Google's hybrid fast-reasoning model. Offers a thinking budget for complex tasks. Best price-to-performance ratio for regulatory tasks.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "Meta",
    providerInitial: "ML",
    tier: "free",
    tags: ["fast", "open-source"],
    contextK: 128,
    isFree: true,
    badge: "fast",
    tooltip:
      "Meta's best open-source instruction model. Strong general-purpose performance. Free on OpenRouter. Good baseline for benchmarking comparisons.",
  },
  {
    id: "qwen/qwq-32b",
    label: "QwQ 32B",
    provider: "Alibaba",
    providerInitial: "QB",
    tier: "free",
    tags: ["reasoning", "open-source"],
    contextK: 32,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "Alibaba's open-source reasoning model. Strong mathematical and logical reasoning. Free on OpenRouter. Excellent for actuarial calculations.",
  },
  {
    id: "mistralai/mistral-large-2407",
    label: "Mistral Large",
    provider: "Mistral AI",
    providerInitial: "MI",
    tier: "standard",
    tags: ["fast", "domain-specific"],
    contextK: 128,
    isFree: false,
    badge: "fast",
    tooltip:
      "EU-based Mistral AI's flagship model. Strong multilingual capability. Relevant for European insurance contexts (EIOPA, Solvency II, GDPR).",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "free",
    tags: ["fast", "open-source"],
    contextK: 64,
    isFree: true,
    badge: "fast",
    tooltip:
      "DeepSeek's fast chat model, well-suited for general insurance Q&A and policy translation. Free on OpenRouter with high throughput.",
  },
  {
    id: "deepseek/deepseek-v4-flash-0731:free",
    label: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "free",
    tags: ["reasoning", "fast", "open-source"],
    contextK: 128,
    isFree: true,
    badge: "fast",
    tooltip:
      "DeepSeek V4 Flash — high-throughput free reasoning model. Ideal for fast insurance data extraction and policy checks.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    provider: "Meta",
    providerInitial: "ML",
    tier: "free",
    tags: ["fast", "open-source"],
    contextK: 128,
    isFree: true,
    badge: "fast",
    tooltip:
      "Meta's best open-source instruction model. Strong general-purpose performance. Free on OpenRouter.",
  },
];

/** Lookup by ID with flexible suffix matching */
export function getModel(id: string): ModelDef | undefined {
  if (!id) return undefined;
  // 1. Direct match
  const exact = MODEL_REGISTRY.find((m) => m.id === id);
  if (exact) return exact;

  // 2. Base ID match (ignoring :free)
  const baseId = id.replace(/:free$/, "");
  const base = MODEL_REGISTRY.find((m) => m.id === baseId);
  if (base) {
    return {
      ...base,
      id,
      isFree: id.endsWith(":free") || base.isFree,
    };
  }

  // 3. Try appending :free
  const freeVariant = MODEL_REGISTRY.find((m) => m.id === `${id}:free`);
  if (freeVariant) return freeVariant;

  return undefined;
}

/** Groups for the model picker */
export const MODEL_GROUPS: {
  id: string;
  icon: string;
  label: string;
  filter: (m: ModelDef) => boolean;
}[] = [
  {
    id: "free",
    icon: "⭐",
    label: "Free & Open-Source",
    filter: (m) => m.isFree,
  },
  {
    id: "reasoning",
    icon: "🧠",
    label: "Reasoning Models",
    filter: (m) => m.tags.includes("reasoning") || m.tags.includes("extended-thinking"),
  },
  {
    id: "premium",
    icon: "💎",
    label: "Premium",
    filter: (m) => m.tier === "premium",
  },
  {
    id: "fast",
    icon: "⚡",
    label: "Fast & Efficient",
    filter: (m) => m.tags.includes("fast") && m.tier !== "premium",
  },
  {
    id: "multimodal",
    icon: "🌐",
    label: "Multimodal",
    filter: (m) => m.tags.includes("multimodal"),
  },
];

export const TIER_COLORS: Record<ModelTier, string> = {
  free: "var(--emerald)",
  budget: "var(--cyan-light)",
  standard: "var(--text-muted)",
  premium: "var(--accent)",
};

export const TAG_LABELS: Record<ModelTag, string> = {
  reasoning: "🧠 Reasoning",
  "extended-thinking": "🔭 Ext. Think",
  fast: "⚡ Fast",
  multimodal: "🌐 Multimodal",
  "domain-specific": "🛡 Domain",
  "open-source": "📖 Open",
  "long-context": "📜 Long Ctx",
};

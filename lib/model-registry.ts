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
  // ── Verified Free Models on OpenRouter ($0 prompt, $0 completion) ────────
  {
    id: "openrouter/free",
    label: "Free Models Router",
    provider: "OpenRouter",
    providerInitial: "OR",
    tier: "free",
    tags: ["fast", "open-source"],
    contextK: 200,
    isFree: true,
    badge: "fast",
    tooltip:
      "OpenRouter Free Models Router — automatically routes to the best available free model with zero token costs.",
  },
  {
    id: "qwen/qwen3.8-27b:free",
    label: "Qwen 3.8 27B (Free)",
    provider: "Qwen",
    providerInitial: "QW",
    tier: "free",
    tags: ["reasoning", "multimodal", "open-source"],
    contextK: 262,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "Open-weight dense vision-language model with reasoning capabilities from Qwen. 100% free on OpenRouter.",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super 120B (Free)",
    provider: "NVIDIA",
    providerInitial: "NV",
    tier: "free",
    tags: ["reasoning", "open-source"],
    contextK: 262,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "NVIDIA 120B-parameter open hybrid MoE model activating 12B tokens with frontier reasoning. 100% free on OpenRouter.",
  },
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B (Free)",
    provider: "Google",
    providerInitial: "GG",
    tier: "free",
    tags: ["reasoning", "multimodal", "open-source"],
    contextK: 262,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "Google DeepMind's 30.7B dense multimodal model with native reasoning and vision capabilities. 100% free on OpenRouter.",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B A4B (Free)",
    provider: "Google",
    providerInitial: "GG",
    tier: "free",
    tags: ["fast", "multimodal", "open-source"],
    contextK: 262,
    isFree: true,
    badge: "fast",
    tooltip:
      "Google DeepMind instruction-tuned MoE model with fast multimodal inference. 100% free on OpenRouter.",
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    label: "Dots3-Note Preview (Free)",
    provider: "Dots Studio",
    providerInitial: "DS",
    tier: "free",
    tags: ["reasoning", "open-source"],
    contextK: 512,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "Open-weight mixture-of-experts model from Dots Studio with a massive 512K context. 100% free on OpenRouter.",
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    label: "Liquid LFM 2.5 2.6B (Free)",
    provider: "LiquidAI",
    providerInitial: "LQ",
    tier: "free",
    tags: ["reasoning", "fast", "open-source"],
    contextK: 65,
    isFree: true,
    badge: "fast",
    tooltip:
      "Compact reasoning model from Liquid AI suited for agentic workflows and policy triage. 100% free on OpenRouter.",
  },
  {
    id: "inclusionai/ling-3.0-flash-sante:free",
    label: "Ling 3.0 Flash Santé (Free)",
    provider: "inclusionAI",
    providerInitial: "IA",
    tier: "free",
    tags: ["domain-specific", "open-source"],
    contextK: 262,
    isFree: true,
    badge: "fast",
    tooltip:
      "Health, claims, and underwriting-focused MoE model with domain knowledge. 100% free on OpenRouter.",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra 550B (Free)",
    provider: "NVIDIA",
    providerInitial: "NV",
    tier: "free",
    tags: ["reasoning", "open-source", "long-context"],
    contextK: 1000,
    isFree: true,
    badge: "reasoning",
    tooltip:
      "NVIDIA 550B frontier reasoning model with 1M context. 100% free on OpenRouter.",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    label: "Nemotron 3.5 Lightning (Free)",
    provider: "NVIDIA",
    providerInitial: "NV",
    tier: "free",
    tags: ["fast", "open-source", "long-context"],
    contextK: 1000,
    isFree: true,
    badge: "fast",
    tooltip:
      "NVIDIA 3.5 Lightning open MoE model with 1M context. 100% free on OpenRouter.",
  },

  // ── Standard & Premium Paid Models (Correctly Marked isFree: false) ───────
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "budget",
    tags: ["reasoning", "open-source"],
    contextK: 164,
    isFree: false,
    badge: "reasoning",
    tooltip:
      "State-of-the-art open reasoning model from DeepSeek. Outputs full chain-of-thought. Excellent for actuarial and regulatory tasks. Paid on OpenRouter ($0.70/$2.50 per M tokens).",
  },
  {
    id: "deepseek/deepseek-r1-0528",
    label: "DeepSeek R1 0528",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "budget",
    tags: ["reasoning", "open-source"],
    contextK: 164,
    isFree: false,
    badge: "reasoning",
    tooltip:
      "May 2025 update of DeepSeek R1 with improved reasoning and instruction following. Paid on OpenRouter ($0.50/$2.15 per M tokens).",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
    provider: "DeepSeek",
    providerInitial: "DS",
    tier: "budget",
    tags: ["fast", "open-source"],
    contextK: 64,
    isFree: false,
    badge: "fast",
    tooltip:
      "DeepSeek's fast V3 chat model, well-suited for general insurance Q&A and policy translation. Paid on OpenRouter ($0.26/$1.03 per M tokens).",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "Meta",
    providerInitial: "ML",
    tier: "budget",
    tags: ["fast", "open-source"],
    contextK: 128,
    isFree: false,
    badge: "fast",
    tooltip:
      "Meta's best open-source instruction model. Strong general-purpose performance across policy workflows. Paid on OpenRouter ($0.10/$0.32 per M tokens).",
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
      isFree: id.endsWith(":free") ? true : base.isFree,
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

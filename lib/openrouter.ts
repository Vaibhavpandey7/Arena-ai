// OpenRouter API wrapper — server-side only
// Never import this file from any client component.

export interface NormalizedModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };
  supportsTools: boolean;
  supportsReasoning: boolean;
  isCustom?: boolean;
  baseUrl?: string;
  apiKey?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface CustomEndpointConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
  systemPrompt?: string;
  customEndpoint?: CustomEndpointConfig;
}

export interface ChatResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

const OR_BASE = "https://openrouter.ai/api/v1";

function orHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_SITE_NAME ?? "AI Arena",
    "Content-Type": "application/json",
  };
}

const isMock = !process.env.OPENROUTER_API_KEY;

// ── Model list (cached ~1hr) ──────────────────────────────────────────────────

let _modelCache: NormalizedModel[] | null = null;
let _modelCacheAt = 0;
const MODEL_CACHE_TTL = 60 * 60 * 1000;

const MOCK_MODELS: NormalizedModel[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    context_length: 128000,
    pricing: { prompt: 0.000005, completion: 0.000015 },
    supportsTools: true,
    supportsReasoning: false,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    context_length: 65536,
    pricing: { prompt: 0.0000008, completion: 0.0000028 },
    supportsTools: true,
    supportsReasoning: true,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp (Free)",
    context_length: 1048576,
    pricing: { prompt: 0, completion: 0 },
    supportsTools: true,
    supportsReasoning: false,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct (Free)",
    context_length: 131072,
    pricing: { prompt: 0, completion: 0 },
    supportsTools: true,
    supportsReasoning: false,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 (Free)",
    context_length: 65536,
    pricing: { prompt: 0, completion: 0 },
    supportsTools: true,
    supportsReasoning: true,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    context_length: 200000,
    pricing: { prompt: 0.00000025, completion: 0.00000125 },
    supportsTools: true,
    supportsReasoning: false,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    context_length: 1048576,
    pricing: { prompt: 0.0000001, completion: 0.0000004 },
    supportsTools: true,
    supportsReasoning: false,
  },
  {
    id: "qwen/qwq-32b",
    name: "Qwen QwQ 32B",
    context_length: 32768,
    pricing: { prompt: 0.0000012, completion: 0.0000018 },
    supportsTools: false,
    supportsReasoning: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    context_length: 131072,
    pricing: { prompt: 0.00000059, completion: 0.00000079 },
    supportsTools: true,
    supportsReasoning: false,
  },
];

export async function listModels(): Promise<NormalizedModel[]> {
  // Auto-detect local Ollama models if running locally
  let localModels: NormalizedModel[] = [];
  try {
    const localRes = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(1200),
    });
    if (localRes.ok) {
      const localData = await localRes.json();
      localModels = (localData.models ?? []).map((m: { name: string; details?: { context_length?: number; family?: string; families?: string[] }; capabilities?: string[] }) => {
        const family = m.details?.family || "";
        const families = m.details?.families || [];
        const isGemma = family.includes("gemma") || families.some(f => f.includes("gemma")) || m.name.toLowerCase().includes("gemma");
        const hasTools = !isGemma && (Array.isArray(m.capabilities) ? m.capabilities.includes("tools") : true);
        return {
          id: m.name,
          name: `${m.name} (Local)`,
          context_length: m.details?.context_length ?? 32768,
          pricing: { prompt: 0, completion: 0 },
          supportsTools: hasTools,
          supportsReasoning: /deepseek|r1|qwq|nemotron|qwen3/.test(m.name.toLowerCase()) || (Array.isArray(m.capabilities) && m.capabilities.includes("thinking")),
          isCustom: true,
          baseUrl: "http://127.0.0.1:11434/v1",
        };
      });
    }
  } catch {
    // Ignore if Ollama is not active
  }

  if (isMock) return [...localModels, ...MOCK_MODELS];

  if (_modelCache && Date.now() - _modelCacheAt < MODEL_CACHE_TTL) {
    return [...localModels, ..._modelCache];
  }

  try {
    const res = await fetch(`${OR_BASE}/models`, { headers: orHeaders() });
    if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
    const json = await res.json();

    const models: NormalizedModel[] = (json.data ?? []).map((m: Record<string, unknown>) => {
      const params: string[] = (m.supported_parameters as string[]) ?? [];
      const id = String(m.id ?? "");
      const supportsReasoning =
        params.includes("reasoning") ||
        /r1|qwq|thinking/.test(id.toLowerCase());
      return {
        id,
        name: String(m.name ?? id),
        context_length: Number(m.context_length ?? 4096),
        pricing: {
          prompt: Number((m.pricing as Record<string, unknown>)?.prompt ?? 0),
          completion: Number((m.pricing as Record<string, unknown>)?.completion ?? 0),
        },
        supportsTools:
          params.includes("tools") || params.includes("tool_choice"),
        supportsReasoning,
      };
    });

    _modelCache = models;
    _modelCacheAt = Date.now();
    return [...localModels, ...models];
  } catch {
    return [...localModels, ...MOCK_MODELS];
  }
}

function formatEndpointUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim().replace(/\/$/, "");
  // Replace localhost with 127.0.0.1 to avoid IPv6 resolution issues (ECONNREFUSED) on local services
  trimmed = trimmed.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");

  // If already ends with /chat/completions, return as is
  if (trimmed.endsWith("/chat/completions")) return trimmed;

  // Ollama default port 11434 requires /v1
  if (trimmed.includes(":11434") && !trimmed.endsWith("/v1")) {
    trimmed = `${trimmed}/v1`;
  }

  return `${trimmed}/chat/completions`;
}

// ── Non-streaming chat (used by /api/compare) ─────────────────────────────────

export async function chatCompletion(params: ChatParams): Promise<ChatResponse> {
  if (isMock && !params.customEndpoint) return mockChatCompletion(params);

  const messages: ChatMessage[] = params.systemPrompt
    ? [{ role: "system", content: params.systemPrompt }, ...params.messages]
    : params.messages;

  const isGemmaOrNoTools = params.model.toLowerCase().includes("gemma");
  const effectiveTools = isGemmaOrNoTools ? undefined : (params.tools ?? undefined);

  const body = {
    model: params.model,
    messages,
    tools: effectiveTools,
    temperature: params.temperature ?? 0.7,
    usage: { include: true },
  };

  let endpointUrl = `${OR_BASE}/chat/completions`;
  if (params.customEndpoint?.baseUrl) {
    endpointUrl = formatEndpointUrl(params.customEndpoint.baseUrl);
  }

  const headers: Record<string, string> = params.customEndpoint?.baseUrl
    ? {
        "Content-Type": "application/json",
        ...(params.customEndpoint.apiKey ? { Authorization: `Bearer ${params.customEndpoint.apiKey}` } : {}),
      }
    : orHeaders();

  let res: Response;
  try {
    res = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok && body.tools && (res.status === 400 || res.status === 404)) {
      const errClone = res.clone();
      const errText = await errClone.text().catch(() => "");
      if (errText.toLowerCase().includes("support tools") || errText.toLowerCase().includes("tools")) {
        const bodyNoTools = { ...body, tools: undefined };
        res = await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyNoTools),
        });
      }
    }
  } catch (err) {
    if (body.tools) {
      try {
        const bodyNoTools = { ...body, tools: undefined };
        res = await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyNoTools),
        });
      } catch {
        throw new Error(`Unable to connect to model endpoint at ${endpointUrl}. Make sure your local server (e.g. Ollama) is running: ${(err as Error).message}`);
      }
    } else {
      throw new Error(`Unable to connect to model endpoint at ${endpointUrl}. Make sure your local server (e.g. Ollama) is running: ${(err as Error).message}`);
    }
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Model inference failed: ${res.status} — ${err}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0];
  const message = choice?.message;

  return {
    content: message?.content ?? "",
    tool_calls: message?.tool_calls,
    usage: json.usage
      ? {
          prompt_tokens: json.usage.prompt_tokens ?? 0,
          completion_tokens: json.usage.completion_tokens ?? 0,
          total_tokens: json.usage.total_tokens ?? 0,
          cost: json.usage.cost,
        }
      : undefined,
  };
}

// ── Streaming chat (used by /api/chat) ────────────────────────────────────────

export async function chatCompletionStream(params: ChatParams): Promise<Response> {
  if (isMock && !params.customEndpoint) return mockChatCompletionStream(params);

  const messages: ChatMessage[] = params.systemPrompt
    ? [{ role: "system", content: params.systemPrompt }, ...params.messages]
    : params.messages;

  const isGemmaOrNoTools = params.model.toLowerCase().includes("gemma");
  const effectiveTools = isGemmaOrNoTools ? undefined : (params.tools ?? undefined);

  const body = {
    model: params.model,
    messages,
    tools: effectiveTools,
    temperature: params.temperature ?? 0.7,
    stream: true,
    usage: { include: true },
  };

  let endpointUrl = `${OR_BASE}/chat/completions`;
  if (params.customEndpoint?.baseUrl) {
    endpointUrl = formatEndpointUrl(params.customEndpoint.baseUrl);
  }

  const headers: Record<string, string> = params.customEndpoint?.baseUrl
    ? {
        "Content-Type": "application/json",
        ...(params.customEndpoint.apiKey ? { Authorization: `Bearer ${params.customEndpoint.apiKey}` } : {}),
      }
    : orHeaders();

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok && body.tools && (res.status === 400 || res.status === 404)) {
      const errClone = res.clone();
      const errText = await errClone.text().catch(() => "");
      if (errText.toLowerCase().includes("support tools") || errText.toLowerCase().includes("tools")) {
        const bodyNoTools = { ...body, tools: undefined };
        return await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyNoTools),
        });
      }
    }
    return res;
  } catch (err) {
    if (body.tools) {
      try {
        const bodyNoTools = { ...body, tools: undefined };
        return await fetch(endpointUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyNoTools),
        });
      } catch {
        // Fall through to throw
      }
    }
    throw new Error(`Unable to connect to model endpoint at ${endpointUrl}. Make sure your local server (e.g. Ollama) is running: ${(err as Error).message}`);
  }
}

// ── Mock implementations ──────────────────────────────────────────────────────

function mockChatCompletion(params: ChatParams): ChatResponse {
  const prompt = params.messages.map((m) => m.content).join(" ");
  const hasNumber = /\d+/.test(prompt);

  if (hasNumber && params.tools && params.tools.length > 0) {
    return {
      content: "I calculated that for you using the calculator tool.",
      tool_calls: [
        {
          id: "mock-tc-1",
          type: "function",
          function: {
            name: "calculator",
            arguments: JSON.stringify({ expression: "42 * 100 / 12" }),
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 45,
        total_tokens: 165,
        cost: 0.000023,
      },
    };
  }

  return {
    content: `[Mock response for model: ${params.model}]\n\nThis is a synthetic answer generated because no OpenRouter API key is configured. The prompt was: "${prompt.slice(0, 100)}..."`,
    usage: {
      prompt_tokens: 85,
      completion_tokens: 62,
      total_tokens: 147,
      cost: 0.000012,
    },
  };
}

function mockChatCompletionStream(params: ChatParams): Response {
  const prompt = params.messages.map((m) => m.content).join(" ").toLowerCase();
  const hasNumber = /\d+/.test(prompt);
  const isReasoningModel = /r1|qwq|thinking|deepseek/.test(params.model.toLowerCase());

  const chunks: string[] = [];

  function sse(obj: unknown) {
    return `data: ${JSON.stringify(obj)}\n\n`;
  }

  // Reasoning chunks (for reasoning-capable models)
  if (isReasoningModel) {
    chunks.push(
      sse({ choices: [{ delta: { reasoning: "Let me think about this step by step..." } }] }),
      sse({ choices: [{ delta: { reasoning: "\n\nFirst, I need to understand the question about insurance..." } }] }),
      sse({ choices: [{ delta: { reasoning: "\n\nAfter careful consideration, I have my answer." } }] })
    );
  }

  // Tool call chunk (if tools enabled and prompt has numbers)
  if (hasNumber && params.tools && params.tools.length > 0) {
    chunks.push(
      sse({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: "mock-tc-stream-1",
              type: "function",
              function: { name: "calculator", arguments: '{"expression":"' },
            }]
          }
        }]
      }),
      sse({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: '42 * 100 / 12"}' },
            }]
          }
        }]
      })
    );
  } else {
    // Content chunks
    const answer = `[Mock response — no API key configured]\n\nThis is a synthetic streaming response for model \`${params.model}\`.\n\nTo get real responses, add your OpenRouter API key to \`.env.local\`.`;
    const words = answer.split(" ");
    for (let i = 0; i < words.length; i += 3) {
      const delta = words.slice(i, i + 3).join(" ") + " ";
      chunks.push(sse({ choices: [{ delta: { content: delta } }] }));
    }
  }

  // Usage chunk
  chunks.push(
    sse({
      usage: {
        prompt_tokens: 85,
        completion_tokens: 42,
        total_tokens: 127,
        cost: 0.000009,
      },
    })
  );

  // Done
  chunks.push("data: [DONE]\n\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 80));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

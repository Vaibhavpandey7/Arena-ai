// OpenRouter API wrapper — server-side only
// Never import this file from any client component.

export interface NormalizedModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };
  supportsTools: boolean;
  supportsReasoning: boolean;
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

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
  systemPrompt?: string;
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
  if (isMock) return MOCK_MODELS;

  if (_modelCache && Date.now() - _modelCacheAt < MODEL_CACHE_TTL) {
    return _modelCache;
  }

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
  return models;
}

// ── Non-streaming chat (used by /api/compare) ─────────────────────────────────

export async function chatCompletion(params: ChatParams): Promise<ChatResponse> {
  if (isMock) return mockChatCompletion(params);

  const messages: ChatMessage[] = params.systemPrompt
    ? [{ role: "system", content: params.systemPrompt }, ...params.messages]
    : params.messages;

  const body = {
    model: params.model,
    messages,
    tools: params.tools ?? undefined,
    temperature: params.temperature ?? 0.7,
    usage: { include: true },
  };

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: orHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter chat failed: ${res.status} — ${err}`);
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
  if (isMock) return mockChatCompletionStream(params);

  const messages: ChatMessage[] = params.systemPrompt
    ? [{ role: "system", content: params.systemPrompt }, ...params.messages]
    : params.messages;

  const body = {
    model: params.model,
    messages,
    tools: params.tools ?? undefined,
    temperature: params.temperature ?? 0.7,
    stream: true,
    usage: { include: true },
  };

  return fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: orHeaders(),
    body: JSON.stringify(body),
  });
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

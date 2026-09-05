import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, listModels, ChatMessage, ToolCall, ToolChoice } from "@/lib/openrouter";
import { TOOL_SCHEMAS, getFilteredToolSchemas, runTool } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

export interface CompareToolEvent {
  type: "call" | "result";
  name: string;
  data: string;
  timestamp: number;
}

interface CompareRequestBody {
  models: string[];
  prompt: string;
  systemPrompt?: string;
  useTools?: boolean;
  selectedTools?: string[];
  toolChoice?: string;
  modelSystemPrompts?: Record<string, string>;
  modelCustomEndpoints?: Record<string, { baseUrl?: string; apiKey?: string }>;
}

export interface CompareResult {
  model: string;
  ok: boolean;
  answer?: string;
  error?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  toolCallCount: number;
  toolEvents?: CompareToolEvent[];
}

async function runOneModel(
  modelId: string,
  prompt: string,
  systemPrompt: string | undefined,
  useTools: boolean,
  selectedTools: string[] | undefined,
  toolChoice: string | undefined,
  modelList: Awaited<ReturnType<typeof listModels>>,
  customEndpoint?: { baseUrl?: string; apiKey?: string }
): Promise<CompareResult> {
  const start = Date.now();
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const toolEvents: CompareToolEvent[] = [];

  let tools = useTools ? getFilteredToolSchemas(selectedTools) : undefined;
  let formattedToolChoice: ToolChoice | undefined = undefined;
  let forcedToolName: string | null = null;

  if (useTools && tools && tools.length > 0) {
    if (toolChoice === "none") {
      tools = undefined;
    } else if (toolChoice === "required") {
      formattedToolChoice = "required";
    } else if (toolChoice && toolChoice !== "auto") {
      const matched = tools.find((t) => t.function.name === toolChoice);
      if (matched) {
        formattedToolChoice = { type: "function", function: { name: toolChoice } };
        forcedToolName = toolChoice;
      }
    }
  }

  const effectiveSystemPrompt = forcedToolName
    ? `${systemPrompt ? systemPrompt + "\n\n" : ""}CRITICAL INSTRUCTION: You MUST invoke the '${forcedToolName}' tool to compute, evaluate, or retrieve the necessary data to answer the user prompt.`
    : systemPrompt;

  let promptTokens = 0;
  let completionTokens = 0;
  let toolCallCount = 0;
  let answer = "";

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await chatCompletion({
        model: modelId,
        messages,
        tools,
        toolChoice: round === 0 ? formattedToolChoice : "auto",
        systemPrompt: effectiveSystemPrompt,
        customEndpoint,
      });

      if (res.usage) {
        promptTokens += res.usage.prompt_tokens;
        completionTokens += res.usage.completion_tokens;
      }

      if (!res.tool_calls || res.tool_calls.length === 0) {
        answer = res.content ?? "";
        break;
      }

      const tcs: ToolCall[] = res.tool_calls;
      toolCallCount += tcs.length;

      messages.push({
        role: "assistant",
        content: res.content ?? null,
        tool_calls: tcs,
      });

      for (const tc of tcs) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        toolEvents.push({
          type: "call",
          name: tc.function.name,
          data: JSON.stringify(args, null, 2),
          timestamp: Date.now(),
        });

        const result = await runTool(tc.function.name, args);

        toolEvents.push({
          type: "result",
          name: tc.function.name,
          data: result,
          timestamp: Date.now(),
        });

        messages.push({ role: "tool", content: result, tool_call_id: tc.id });
      }
    }

    const latencyMs = Date.now() - start;
    const modelInfo = modelList.find((m) => m.id === modelId);
    const pricing = modelInfo?.pricing ?? { prompt: 0, completion: 0 };
    const estCostUsd =
      promptTokens * pricing.prompt + completionTokens * pricing.completion;

    return {
      model: modelId,
      ok: true,
      answer,
      latencyMs,
      promptTokens,
      completionTokens,
      estCostUsd,
      toolCallCount,
      toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
    };
  } catch (err) {
    return {
      model: modelId,
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - start,
      promptTokens,
      completionTokens,
      estCostUsd: 0,
      toolCallCount,
      toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
    };
  }
}

export async function POST(req: NextRequest) {
  let body: CompareRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    models,
    prompt,
    systemPrompt,
    useTools,
    selectedTools,
    toolChoice,
    modelSystemPrompts,
    modelCustomEndpoints,
  } = body;

  if (!models || models.length === 0 || !prompt) {
    return NextResponse.json(
      { error: "models (array) and prompt are required" },
      { status: 400 }
    );
  }

  if (models.length > 4) {
    return NextResponse.json({ error: "Maximum 4 models in compare mode" }, { status: 400 });
  }

  let modelList: Awaited<ReturnType<typeof listModels>> = [];
  try {
    modelList = await listModels();
  } catch {
    // Proceed without pricing data
  }

  const results = await Promise.all(
    models.map((modelId) =>
      runOneModel(
        modelId,
        prompt,
        modelSystemPrompts?.[modelId] ?? systemPrompt,
        useTools ?? false,
        selectedTools,
        toolChoice,
        modelList,
        modelCustomEndpoints?.[modelId]
      )
    )
  );

  return NextResponse.json({ results });
}

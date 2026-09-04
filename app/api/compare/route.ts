import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, listModels, ChatMessage, ToolCall } from "@/lib/openrouter";
import { TOOL_SCHEMAS, runTool } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

interface CompareRequestBody {
  models: string[];
  prompt: string;
  systemPrompt?: string;
  useTools?: boolean;
  modelSystemPrompts?: Record<string, string>;
}

interface CompareResult {
  model: string;
  ok: boolean;
  answer?: string;
  error?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estCostUsd: number;
  toolCallCount: number;
}

async function runOneModel(
  modelId: string,
  prompt: string,
  systemPrompt: string | undefined,
  useTools: boolean,
  modelList: Awaited<ReturnType<typeof listModels>>
): Promise<CompareResult> {
  const start = Date.now();
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const tools = useTools ? TOOL_SCHEMAS : undefined;

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
        systemPrompt,
      });

      if (res.usage) {
        promptTokens += res.usage.prompt_tokens;
        completionTokens += res.usage.completion_tokens;
      }

      if (!res.tool_calls || res.tool_calls.length === 0) {
        answer = res.content ?? "";
        break;
      }

      // Tool calls
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
        const result = await runTool(tc.function.name, args);
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

  const { models, prompt, systemPrompt, useTools, modelSystemPrompts } = body;

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
        modelList
      )
    )
  );

  return NextResponse.json({ results });
}

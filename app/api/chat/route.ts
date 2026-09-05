import { NextRequest } from "next/server";
import { chatCompletionStream, ChatMessage, ToolChoice } from "@/lib/openrouter";
import { TOOL_SCHEMAS, getFilteredToolSchemas, ToolSchema, runTool } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

function sseEvent(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  let body: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    useTools?: boolean;
    selectedTools?: string[];
    toolChoice?: string;
    customEndpoint?: { baseUrl?: string; apiKey?: string };
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      sseEvent({ type: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const { model, prompt, systemPrompt, useTools, selectedTools, toolChoice, customEndpoint } = body;

  if (!model || !prompt) {
    return new Response(
      sseEvent({ type: "error", error: "model and prompt are required" }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let tools: ToolSchema[] | undefined = undefined;
  let formattedToolChoice: ToolChoice | undefined = undefined;
  let forcedToolName: string | null = null;

  if (useTools) {
    tools = getFilteredToolSchemas(selectedTools);
    if (toolChoice === "none" || tools.length === 0) {
      tools = undefined;
    } else if (toolChoice === "required") {
      formattedToolChoice = "required";
    } else if (toolChoice && toolChoice !== "auto") {
      const matched = tools.find((t) => t.function.name === toolChoice);
      if (matched) {
        formattedToolChoice = { type: "function", function: { name: toolChoice } };
        forcedToolName = toolChoice;
      } else {
        formattedToolChoice = "auto";
      }
    } else {
      formattedToolChoice = "auto";
    }
  }

  const effectiveSystemPrompt = forcedToolName
    ? `${systemPrompt ? systemPrompt + "\n\n" : ""}CRITICAL INSTRUCTION: You MUST invoke the '${forcedToolName}' tool to compute, evaluate, or retrieve the necessary data to answer the user prompt.`
    : systemPrompt;

  const messages: ChatMessage[] = [{ role: "user", content: prompt }];

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(sseEvent(obj)));
      }

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const orResponse = await chatCompletionStream({
            model,
            messages,
            tools,
            toolChoice: round === 0 ? formattedToolChoice : "auto",
            systemPrompt: effectiveSystemPrompt,
            customEndpoint,
          });

          if (!orResponse.ok) {
            const errText = await orResponse.text();
            let errMsg = `Inference failed (${orResponse.status})`;
            try {
              const errJson = JSON.parse(errText);
              errMsg = errJson.error?.message || errJson.message || errMsg;
            } catch {
              if (errText) errMsg = errText;
            }
            send({ type: "error", error: errMsg });
            break;
          }

          // Parse SSE stream from OpenRouter
          const reader = orResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          // Accumulate tool calls across chunks (indexed by tool_call index)
          const toolCallAccum: Record<number, { id: string; name: string; args: string }> = {};
          let hasToolCalls = false;
          let assistantContent = "";
          let usage: unknown = null;
          let finishReason: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;

              let chunk: Record<string, unknown>;
              try {
                chunk = JSON.parse(data);
              } catch {
                continue;
              }

              // Usage chunk (may arrive at end)
              if (chunk.usage) {
                usage = chunk.usage;
                continue;
              }

              const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
              if (!choices || choices.length === 0) continue;

              const delta = choices[0].delta as Record<string, unknown> | undefined;
              if (!delta) continue;

              finishReason = (choices[0].finish_reason as string) ?? finishReason;

              // Reasoning delta
              if (delta.reasoning) {
                send({ type: "reasoning", delta: delta.reasoning });
              }

              // Content delta
              if (delta.content) {
                assistantContent += delta.content;
                send({ type: "content", delta: delta.content });
              }

              // Tool call deltas (accumulate by index)
              if (delta.tool_calls) {
                hasToolCalls = true;
                const tcs = delta.tool_calls as Array<Record<string, unknown>>;
                for (const tc of tcs) {
                  const idx = Number(tc.index ?? 0);
                  if (!toolCallAccum[idx]) {
                    toolCallAccum[idx] = { id: "", name: "", args: "" };
                  }
                  const fn = tc.function as Record<string, string> | undefined;
                  if (tc.id) toolCallAccum[idx].id = String(tc.id);
                  if (fn?.name) toolCallAccum[idx].name += fn.name;
                  if (fn?.arguments) toolCallAccum[idx].args += fn.arguments;
                }
              }
            }
          }

          // Emit usage if available
          if (usage) {
            const u = usage as Record<string, unknown>;
            const promptTokens = Number(u.prompt_tokens ?? 0);
            const completionTokens = Number(u.completion_tokens ?? 0);
            send({
              type: "usage",
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_cost_usd: Number(u.cost ?? 0),
              },
            });
          }

          // If no tool calls, we're done
          if (!hasToolCalls) break;

          // Process tool calls
          const tcEntries = Object.values(toolCallAccum);

          // Add assistant turn with tool_calls
          messages.push({
            role: "assistant",
            content: assistantContent || null,
            tool_calls: tcEntries.map((tc) => ({
              id: tc.id || `tc-${Date.now()}`,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.args },
            })),
          });

          // Run each tool and emit events
          for (const tc of tcEntries) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.args);
            } catch {
              args = {};
            }

            send({ type: "tool_call", name: tc.name, args });

            const result = await runTool(tc.name, args);

            send({ type: "tool_result", name: tc.name, result });

            messages.push({
              role: "tool",
              content: result,
              tool_call_id: tc.id || `tc-${Date.now()}`,
            });
          }

          // If finish_reason was "tool_calls", loop again
          if (finishReason !== "tool_calls" && !hasToolCalls) break;
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", error: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

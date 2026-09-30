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

interface ParsedOpenRouterError {
  message: string;
  isRateLimit: boolean;
  provider?: string;
  raw?: string;
}

function parseOpenRouterError(status: number, errText: string, modelName: string): ParsedOpenRouterError {
  let parsed: Record<string, any> | null = null;
  try {
    parsed = JSON.parse(errText);
  } catch {
    return {
      message: errText ? `Inference failed (${status}): ${errText}` : `Inference failed with status ${status}`,
      isRateLimit: status === 429,
    };
  }

  const errObj = parsed?.error || parsed;
  const rawMeta = errObj?.metadata;
  const provider = rawMeta?.provider_name;
  const raw = typeof rawMeta?.raw === "string" ? rawMeta.raw : (rawMeta?.raw ? JSON.stringify(rawMeta.raw) : "");
  const baseMessage = String(errObj?.message || parsed?.message || `Inference failed (${status})`);
  const code = Number(errObj?.code || status);

  const isRateLimit =
    code === 429 ||
    /rate[- ]limit|quota|exceeded|too many requests|capacity/i.test(raw + " " + baseMessage);

  if (baseMessage.includes("Provider returned error") || isRateLimit) {
    if (raw && /rate[- ]limited|rate[- ]limit/i.test(raw)) {
      return {
        message: `Upstream Rate Limit: This free model (${modelName}) is temporarily rate-limited upstream${
          provider ? ` by ${provider}` : ""
        } due to high shared community traffic. Switch to "Free Models Router" (openrouter/free) or NVIDIA Nemotron (free), or retry shortly.`,
        isRateLimit: true,
        provider,
        raw,
      };
    }
    if (raw) {
      return {
        message: `Upstream Provider Error${provider ? ` (${provider})` : ""}: ${raw}`,
        isRateLimit,
        provider,
        raw,
      };
    }
    if (isRateLimit) {
      return {
        message: `Upstream Rate Limit (429)${
          provider ? ` from ${provider}` : ""
        }: The upstream provider reached its free tier capacity limit. Switch to "Free Models Router" (openrouter/free) or try again in a few moments.`,
        isRateLimit: true,
        provider,
        raw,
      };
    }
    return {
      message: `Upstream Provider Error${
        provider ? ` (${provider})` : ""
      }: The upstream host returned an error. Please try another model or retry in a moment.`,
      isRateLimit: false,
      provider,
      raw,
    };
  }

  return {
    message: baseMessage,
    isRateLimit,
    provider,
    raw,
  };
}

      let activeModel = model;
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let orResponse = await chatCompletionStream({
            model: activeModel,
            messages,
            tools,
            toolChoice: round === 0 ? formattedToolChoice : "auto",
            systemPrompt: effectiveSystemPrompt,
            customEndpoint,
          });

          if (!orResponse.ok) {
            const errText = await orResponse.text();
            const parsedErr = parseOpenRouterError(orResponse.status, errText, activeModel);

            // Auto-fallback: If a free model hit upstream rate limits or provider outage,
            // seamlessly redirect to OpenRouter's Free Router so user doesn't get blocked
            const isFreeModel = activeModel.endsWith(":free") || activeModel.includes("free");
            if (
              isFreeModel &&
              activeModel !== "openrouter/free" &&
              (parsedErr.isRateLimit || orResponse.status === 429 || orResponse.status === 503 || errText.includes("Provider returned error"))
            ) {
              console.warn(`[chat-route] Model ${activeModel} hit upstream rate limit. Auto-falling back to openrouter/free.`);
              send({
                type: "content",
                delta: `> ℹ️ **Notice**: Selected model \`${activeModel}\` is temporarily rate-limited upstream${
                  parsedErr.provider ? ` by ${parsedErr.provider}` : ""
                }. Automatically redirected through **Free Models Router** so your evaluation completes.\n\n`,
              });

              activeModel = "openrouter/free";
              orResponse = await chatCompletionStream({
                model: activeModel,
                messages,
                tools,
                toolChoice: round === 0 ? formattedToolChoice : "auto",
                systemPrompt: effectiveSystemPrompt,
                customEndpoint,
              });
            }

            if (!orResponse.ok) {
              const fallbackErrText = await orResponse.text();
              const fallbackParsed = parseOpenRouterError(orResponse.status, fallbackErrText, activeModel);
              send({ type: "error", error: fallbackParsed.message });
              break;
            }
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

              // Handle streaming error chunk emitted mid-stream
              if (chunk.error) {
                const streamParsed = parseOpenRouterError(400, JSON.stringify(chunk), activeModel);
                send({ type: "error", error: streamParsed.message });
                break;
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

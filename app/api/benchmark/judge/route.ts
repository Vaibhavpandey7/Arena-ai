import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, ChatMessage } from "@/lib/openrouter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

interface JudgeRequestBody {
  question: string;
  correctAnswer?: string;
  options?: Record<string, string>;
  modelAnswer: string;
  modelId: string;
  judgeModel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: JudgeRequestBody = await req.json();
    const { question, correctAnswer, options, modelAnswer, modelId, judgeModel } = body;

    if (!question || !modelAnswer) {
      return NextResponse.json({ error: "Missing question or modelAnswer" }, { status: 400 });
    }

    const effectiveJudge = judgeModel || process.env.BENCHMARK_JUDGE_MODEL || "openai/gpt-4o-mini";

    let optionsFormatted = "";
    if (options && Object.keys(options).length > 0) {
      optionsFormatted = "\nOptions:\n" + Object.entries(options).map(([k, v]) => `${k}: ${v}`).join("\n");
    }

    const systemPrompt = `You are a certified insurance senior actuary and compliance auditor evaluating LLM answers for institutional accuracy, regulatory compliance, and mathematical soundness.
You must respond with valid JSON only in this exact format:
{
  "isCorrect": boolean,
  "reasoningScore": number (1 to 5, where 5 is flawless institutional reasoning),
  "complianceStatus": "compliant" | "warning" | "violation",
  "rationale": "Concise 1-2 sentence explanation of your verdict"
}`;

    const userPrompt = `Evaluate the candidate insurance model answer against ground truth.

Question:
${question}
${optionsFormatted}

Expected Gold Answer:
${correctAnswer || "Not explicitly specified (evaluate on institutional industry standard accuracy)"}

Candidate Model (${modelId}) Answer:
${modelAnswer}

Evaluate strictly and return JSON only.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await chatCompletion({
      model: effectiveJudge,
      messages,
      temperature: 0.1,
    });

    const content = response.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback parser if markdown blocks exist
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      judgeModel: effectiveJudge,
      isCorrect: Boolean(parsed.isCorrect),
      reasoningScore: Number(parsed.reasoningScore) || 3,
      complianceStatus: parsed.complianceStatus || "compliant",
      rationale: parsed.rationale || "Evaluated by judge model.",
      usage: response.usage,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Judge evaluation failed" },
      { status: 500 }
    );
  }
}

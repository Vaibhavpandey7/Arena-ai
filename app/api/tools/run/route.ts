import { NextRequest, NextResponse } from "next/server";
import { runTool, TOOLS, TOOL_CATALOG } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Returns catalog of available tools for UI form rendering
  return NextResponse.json({
    tools: TOOL_CATALOG,
    schemas: TOOLS.map((t) => t.schema),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, args } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { ok: false, error: "Tool 'name' is required" },
        { status: 400 }
      );
    }

    const tool = TOOLS.find((t) => t.schema.function.name === name);
    if (!tool) {
      return NextResponse.json(
        { ok: false, error: `Unknown tool: '${name}'` },
        { status: 404 }
      );
    }

    const start = performance.now();
    const result = await runTool(name, args ?? {});
    const durationMs = Math.round((performance.now() - start) * 10) / 10;

    const isError = result.startsWith("Error:");

    return NextResponse.json({
      ok: !isError,
      name,
      result,
      durationMs,
      error: isError ? result : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

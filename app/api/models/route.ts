import { NextResponse } from "next/server";
import { listModels } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

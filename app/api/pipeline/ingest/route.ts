import { NextRequest, NextResponse } from "next/server";
import { ingestRecord } from "@/lib/data-lake";
import { ValidationError, QualityError } from "@/lib/dil-schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const record = await ingestRecord(body as Parameters<typeof ingestRecord>[0]);
    return NextResponse.json(record);
  } catch (err) {
    if (err instanceof ValidationError || err instanceof QualityError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: (err as Error).message ?? "Internal error" },
      { status: 500 }
    );
  }
}

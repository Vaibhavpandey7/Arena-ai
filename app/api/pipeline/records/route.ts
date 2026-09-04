import { NextRequest, NextResponse } from "next/server";
import { listRecords } from "@/lib/data-lake";
import type { DomainType } from "@/lib/dil-schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") as DomainType | null;
  const split = searchParams.get("split") ?? undefined;
  const task = searchParams.get("task") ?? undefined;
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  const records = await listRecords({
    domain: domain ?? undefined,
    split,
    task,
    limit: limit && !isNaN(limit) ? limit : undefined,
  });

  return NextResponse.json({ records });
}

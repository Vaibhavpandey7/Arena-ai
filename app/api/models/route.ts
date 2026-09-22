import { NextResponse } from "next/server";
import { listModels } from "@/lib/openrouter";

// Revalidate this route at most once per hour.
// The in-memory _modelCache in openrouter.ts is L1 (within the same serverless instance).
// Next.js fetch cache (ISR) is L2 (across restarts/cold-starts).
// HTTP Cache-Control is L3 (CDN edge nodes + browser).
export const revalidate = 3600; // seconds

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json(
      { models },
      {
        headers: {
          // Allow CDN + browser to cache for 1 hour; stale responses OK for 24hr
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}


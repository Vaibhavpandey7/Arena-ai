import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REGULATORY_FILES: Record<string, string> = {
  "solvency_ii": "SOLVENCY II DIRECTIVE.pdf",
  "solvency-ii": "SOLVENCY II DIRECTIVE.pdf",
  "solvency 2": "SOLVENCY II DIRECTIVE.pdf",
  "solvency ii directive": "SOLVENCY II DIRECTIVE.pdf",
  "delegated_reg_2015_35": "DELEGATED REGULATION (EU) 201535.pdf",
  "delegated-reg-2015-35": "DELEGATED REGULATION (EU) 201535.pdf",
  "delegated regulation (eu) 201535": "DELEGATED REGULATION (EU) 201535.pdf",
  "eu_ai_act": "EU AI ACT EIOPA.pdf",
  "eu-ai-act": "EU AI ACT EIOPA.pdf",
  "eu ai act eiopa": "EU AI ACT EIOPA.pdf",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docKey = searchParams.get("doc")?.toLowerCase().trim();
    const hash = searchParams.get("hash")?.trim();
    const filename = searchParams.get("name")?.trim();

    // 1. Regulatory PDFs in regulatory_check/
    if (docKey) {
      const mappedFile =
        REGULATORY_FILES[docKey] ||
        (docKey.endsWith(".pdf") ? docKey : `${docKey}.pdf`);

      let filePath = join(process.cwd(), "regulatory_check", mappedFile);
      if (!existsSync(filePath)) {
        filePath = join(process.cwd(), "public", "regulatory", mappedFile);
      }
      if (existsSync(filePath)) {
        const fileBuffer = readFileSync(filePath);
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${mappedFile}"`,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // 2. Uploaded Cached PDFs by file hash
    if (hash && /^[a-f0-9]{16,64}$/i.test(hash)) {
      const cachedFile = join(process.cwd(), ".ocr_cache", "files", `${hash}.pdf`);
      if (existsSync(cachedFile)) {
        const fileBuffer = readFileSync(cachedFile);
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename || "document.pdf"}"`,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve raw document";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

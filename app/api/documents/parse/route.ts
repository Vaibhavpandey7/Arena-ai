import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  // First try /usr/bin/pdftotext or pdftotext on PATH
  const pdftotextBin = existsSync("/usr/bin/pdftotext") ? "/usr/bin/pdftotext" : "pdftotext";
  try {
    const result = spawnSync(pdftotextBin, ["-layout", "-", "-"], {
      input: buffer,
      maxBuffer: 20 * 1024 * 1024, // 20MB max
      encoding: "utf-8",
    });
    if (result.stdout && result.stdout.trim().length > 0) {
      return result.stdout.trim();
    }
  } catch (err) {
    console.warn("pdftotext invocation failed, attempting fallback:", err);
  }

  // Fallback: simple text stream extraction from uncompressed PDF blocks
  const raw = buffer.toString("binary");
  const textMatches: string[] = [];
  const regex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const block = match[0];
    const tjMatches = block.match(/\((.*?)\)\s*Tj/g);
    if (tjMatches) {
      const line = tjMatches
        .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
        .join(" ");
      textMatches.push(line);
    }
  }

  if (textMatches.length > 0) {
    return textMatches.join("\n").trim();
  }

  return "Could not extract readable text from this PDF. The document may be scanned or image-only.";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    const filename = file.name || "uploaded_document";
    const fileSize = file.size || 0;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let extractedText = "";
    let detectedType = "text";

    if (ext === "pdf" || file.type === "application/pdf") {
      detectedType = "PDF";
      extractedText = extractTextFromPdfBuffer(buffer);
    } else if (ext === "json" || file.type === "application/json") {
      detectedType = "JSON";
      try {
        const parsed = JSON.parse(buffer.toString("utf-8"));
        extractedText = JSON.stringify(parsed, null, 2);
      } catch {
        extractedText = buffer.toString("utf-8");
      }
    } else if (ext === "csv" || file.type === "text/csv") {
      detectedType = "CSV";
      extractedText = buffer.toString("utf-8");
    } else if (ext === "md" || ext === "markdown") {
      detectedType = "Markdown";
      extractedText = buffer.toString("utf-8");
    } else {
      detectedType = ext.toUpperCase() || "Text";
      extractedText = buffer.toString("utf-8");
    }

    // Clean up carriage returns and normalize whitespace
    const cleanText = extractedText.replace(/\r\n/g, "\n").trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const charCount = cleanText.length;
    const tokenCount = Math.ceil(charCount / 4);

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        name: filename,
        size: fileSize,
        formattedSize: formatBytes(fileSize),
        type: detectedType,
        text: cleanText,
        wordCount,
        charCount,
        tokenCount,
        preview: cleanText.slice(0, 350) + (cleanText.length > 350 ? "…" : ""),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readdirSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes, createHash } from "crypto";

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

// Dedicated Free OCR & Digital Text Extraction Route
// No OpenRouter vision models or external LLM tokens required.

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const pdftotextBin = existsSync("/usr/bin/pdftotext") ? "/usr/bin/pdftotext" : "pdftotext";
  const tempPath = join(tmpdir(), `pdf_extract_${Date.now()}_${randomBytes(6).toString("hex")}.pdf`);

  try {
    writeFileSync(tempPath, buffer);

    // Pass 1: Poppler with -layout and UTF-8 encoding across ALL pages
    try {
      const res1 = spawnSync(pdftotextBin, ["-layout", "-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 50 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res1.stdout && res1.stdout.trim().length > 20) {
        return res1.stdout.trim();
      }
    } catch (err) {
      console.warn("pdftotext pass 1 (-layout) failed:", err);
    }

    // Pass 2: Poppler without -layout (standard sequential flow for multi-column pages)
    try {
      const res2 = spawnSync(pdftotextBin, ["-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 50 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res2.stdout && res2.stdout.trim().length > 20) {
        return res2.stdout.trim();
      }
    } catch (err) {
      console.warn("pdftotext pass 2 (standard) failed:", err);
    }

    // Pass 3: Poppler raw stream mode
    try {
      const res3 = spawnSync(pdftotextBin, ["-raw", "-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 50 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res3.stdout && res3.stdout.trim().length > 20) {
        return res3.stdout.trim();
      }
    } catch (err) {
      console.warn("pdftotext pass 3 (-raw) failed:", err);
    }
  } finally {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  // Pass 4: Fallback simple text stream extraction from uncompressed PDF blocks
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

  if (textMatches.length > 0 && textMatches.join(" ").trim().length > 20) {
    return textMatches.join("\n").trim();
  }

  return "";
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

    // Compute document hash for caching and deduplication
    const fileHash = createHash("sha256").update(buffer).digest("hex");
    const cacheDir = join(tmpdir(), "insurance_ocr_cache");
    const cacheJsonPath = join(cacheDir, `${fileHash}.json`);
    const cacheTxtPath = join(cacheDir, `${fileHash}.txt`);

    const clientExtractedText = (formData.get("extractedText") as string | null)?.trim();
    const clientDetectedType = formData.get("detectedType") as string | null;

    // Check if document was already parsed/OCRed previously and client didn't supply fresh OCR text
    if (!clientExtractedText && existsSync(cacheJsonPath)) {
      try {
        const cachedDoc = JSON.parse(readFileSync(cacheJsonPath, "utf-8"));
        const rawType = String(cachedDoc.type || "");
        const cleanType = (rawType.includes("AI OCR") || rawType.includes("OCR")) ? "OCR" : rawType;
        const cachedText = String(cachedDoc.text || "");
        if (cachedText && !cachedText.startsWith("Could not run OCR") && !cachedText.startsWith("Vision AI OCR was unable") && !cachedText.includes("Scanned / Image-Only PDF Detected")) {
          return NextResponse.json({
            success: true,
            cached: true,
            document: {
              ...cachedDoc,
              name: filename || cachedDoc.name,
              type: cleanType,
            },
          });
        }
      } catch {
        // proceed with fresh extraction if cache parse fails
      }
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let extractedText = "";
    let detectedType = "text";

    // 1. If client already ran Tesseract Free OCR or digital PDF extraction in browser
    if (clientExtractedText && clientExtractedText.length > 0) {
      extractedText = clientExtractedText;
      detectedType = clientDetectedType || (ext === "pdf" ? "PDF" : "OCR");
    } else {
      const isImage = ["png", "jpg", "jpeg", "webp", "tiff", "bmp"].includes(ext) || file.type.startsWith("image/");

      if (isImage) {
        // Signal client to run Tesseract Free OCR directly on the image
        return NextResponse.json({
          success: true,
          needsClientOcr: true,
          isScanned: true,
          document: {
            id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            hash: fileHash,
            name: filename,
            size: fileSize,
            formattedSize: formatBytes(fileSize),
            type: "OCR",
            text: "",
            wordCount: 0,
            charCount: 0,
            tokenCount: 0,
            preview: "Image detected. Transcribing text via Free OCR (Tesseract)...",
          },
        });
      } else if (ext === "pdf" || file.type === "application/pdf") {
        detectedType = "PDF";
        extractedText = extractTextFromPdfBuffer(buffer);

        // If digital text extraction yielded nothing, signal client to run Tesseract Free OCR across all pages
        const isScannedOrEmpty = !extractedText || extractedText.trim().length < 30;

        if (isScannedOrEmpty) {
          return NextResponse.json({
            success: true,
            needsClientOcr: true,
            isScanned: true,
            document: {
              id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              hash: fileHash,
              name: filename,
              size: fileSize,
              formattedSize: formatBytes(fileSize),
              type: "PDF (Scanned)",
              text: "",
              wordCount: 0,
              charCount: 0,
              tokenCount: 0,
              preview: "Scanned document detected. Running Free OCR (Tesseract) on pages...",
            },
          });
        }
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
  }

    // Clean up carriage returns and normalize whitespace
    const cleanText = extractedText.replace(/\r\n/g, "\n").trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const charCount = cleanText.length;
    const tokenCount = Math.ceil(charCount / 4);

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const documentPayload = {
      id: documentId,
      hash: fileHash,
      name: filename,
      size: fileSize,
      formattedSize: formatBytes(fileSize),
      type: detectedType,
      text: cleanText,
      wordCount,
      charCount,
      tokenCount,
      preview: cleanText.slice(0, 350) + (cleanText.length > 350 ? "…" : ""),
      fileUrl:
        ext === "pdf" || file.type === "application/pdf"
          ? `/api/documents/raw?hash=${fileHash}&name=${encodeURIComponent(filename)}`
          : undefined,
      storedAt: new Date().toISOString(),
    };

    // Persist parsed & OCR text to disk storage if not an error message
    const isFailedOcr =
      cleanText.startsWith("Could not run OCR") ||
      cleanText.startsWith("Vision AI OCR was unable") ||
      cleanText.includes("Scanned / Image-Only PDF Detected");

    if (!isFailedOcr) {
      try {
        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
        writeFileSync(cacheJsonPath, JSON.stringify(documentPayload, null, 2), "utf-8");
        writeFileSync(cacheTxtPath, cleanText, "utf-8");

        // Persist original PDF file for visual previewing
        if (ext === "pdf" || file.type === "application/pdf") {
          const filesDir = join(cacheDir, "files");
          if (!existsSync(filesDir)) mkdirSync(filesDir, { recursive: true });
          const rawPdfPath = join(filesDir, `${fileHash}.pdf`);
          if (!existsSync(rawPdfPath)) {
            writeFileSync(rawPdfPath, buffer);
          }
        }
      } catch (saveErr) {
        console.warn("Failed to persist OCR cache to disk:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      document: documentPayload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

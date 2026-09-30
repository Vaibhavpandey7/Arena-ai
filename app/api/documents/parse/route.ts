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

async function ocrImagesWithVision(images: { b64: string; mimeType: string }[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured for AI Vision OCR");
  }

  const results: string[] = [];
  const maxPages = Math.min(images.length, 6);

  for (let i = 0; i < maxPages; i++) {
    const img = images[i];
    const pageNum = i + 1;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_SITE_NAME || "DIL Intelligence Studio",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this insurance policy document image (Page ${pageNum}) and extract all policy terms, coverage amounts, policy numbers, insured info, limits, exclusions, deductibles, tables, and conditions shown into clear structured markdown:`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${img.mimeType};base64,${img.b64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 10) {
          results.push(maxPages > 1 ? `### [Page ${pageNum}]\n${text}` : text);
        }
      } else {
        const errBody = await res.text();
        console.warn(`Vision OCR failed on page ${pageNum}:`, res.status, errBody);
      }
    } catch (e) {
      console.warn(`Vision OCR network exception on page ${pageNum}:`, e);
    }
  }

  if (results.length === 0) {
    throw new Error("Vision AI OCR was unable to transcribe text from the document pages");
  }

  return results.join("\n\n---\n\n");
}

async function ocrScannedPdf(pdfBuffer: Buffer): Promise<string | null> {
  const pdftoppmBin = existsSync("/usr/bin/pdftoppm") ? "/usr/bin/pdftoppm" : "pdftoppm";
  const tempId = `ocr_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const tempPdfPath = join(tmpdir(), `${tempId}.pdf`);
  const outPrefix = join(tmpdir(), `${tempId}_page`);

  const createdFiles: string[] = [tempPdfPath];

  try {
    writeFileSync(tempPdfPath, pdfBuffer);

    // Convert first 1 to 6 pages to fast, compact 130 DPI JPEGs
    const runRes = spawnSync(pdftoppmBin, ["-jpeg", "-r", "130", "-f", "1", "-l", "6", tempPdfPath, outPrefix]);
    if (runRes.status !== 0) {
      console.warn("pdftoppm failed with status", runRes.status, runRes.stderr?.toString());
      return null;
    }

    const dirEntries = readdirSync(tmpdir());
    const pageFiles = dirEntries
      .filter((name) => name.startsWith(`${tempId}_page`) && (name.endsWith(".jpg") || name.endsWith(".jpeg")))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)\.(jpg|jpeg)$/)?.[1] || "0", 10);
        const numB = parseInt(b.match(/(\d+)\.(jpg|jpeg)$/)?.[1] || "0", 10);
        return numA - numB;
      });

    pageFiles.forEach((f) => createdFiles.push(join(tmpdir(), f)));

    if (pageFiles.length === 0) {
      return null;
    }

    const images: { b64: string; mimeType: string }[] = [];
    for (const file of pageFiles) {
      const imgBuf = readFileSync(join(tmpdir(), file));
      images.push({
        b64: imgBuf.toString("base64"),
        mimeType: "image/jpeg",
      });
    }

    return await ocrImagesWithVision(images);
  } catch (err) {
    console.warn("ocrScannedPdf failed:", err);
    return null;
  } finally {
    for (const f of createdFiles) {
      try {
        if (existsSync(f)) unlinkSync(f);
      } catch {
        // ignore
      }
    }
  }
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const pdftotextBin = existsSync("/usr/bin/pdftotext") ? "/usr/bin/pdftotext" : "pdftotext";
  const tempPath = join(tmpdir(), `pdf_extract_${Date.now()}_${randomBytes(6).toString("hex")}.pdf`);

  try {
    writeFileSync(tempPath, buffer);

    // Pass 1: Poppler with -layout and UTF-8 encoding from disk (enables seeking to xref table at EOF)
    try {
      const res1 = spawnSync(pdftotextBin, ["-layout", "-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 30 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res1.stdout && res1.stdout.trim().length > 10) {
        return res1.stdout.trim();
      }
    } catch (err) {
      console.warn("pdftotext pass 1 (-layout) failed:", err);
    }

    // Pass 2: Poppler without -layout (standard sequential flow for complex column layouts)
    try {
      const res2 = spawnSync(pdftotextBin, ["-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 30 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res2.stdout && res2.stdout.trim().length > 10) {
        return res2.stdout.trim();
      }
    } catch (err) {
      console.warn("pdftotext pass 2 (standard) failed:", err);
    }

    // Pass 3: Poppler raw stream mode
    try {
      const res3 = spawnSync(pdftotextBin, ["-raw", "-enc", "UTF-8", tempPath, "-"], {
        maxBuffer: 30 * 1024 * 1024,
        encoding: "utf-8",
      });
      if (res3.stdout && res3.stdout.trim().length > 10) {
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

  if (textMatches.length > 0 && textMatches.join(" ").trim().length > 10) {
    return textMatches.join("\n").trim();
  }

  // Check if PDF contains image XObjects (scanned/raster document)
  const isImageScan = buffer.includes(Buffer.from("/Image")) || buffer.includes(Buffer.from("/Subtype /Image"));
  if (isImageScan) {
    return (
      "⚠️ Scanned / Image-Only PDF Detected:\n\n" +
      "This document consists of scanned images or photos without an embedded digital text layer.\n\n" +
      "Why this happens:\n" +
      "• When physical insurance documents are scanned or photographed without OCR (Optical Character Recognition), the PDF stores raster pixel images (JPEG/PNG) rather than digital text characters.\n" +
      "• Text extractors search for digital character codes and font tables, which are absent in pure image scans.\n\n" +
      "Recommended Options:\n" +
      "1. Copy & paste the text directly into the Evaluation Prompt textarea.\n" +
      "2. Run OCR on the PDF (e.g., using Adobe Acrobat Searchable PDF, Apple Preview, or Google Drive) to add a text layer.\n" +
      "3. Upload the policy as a .txt, .md, .csv, or .json file."
    );
  }

  return (
    "Could not extract readable text from this PDF. The document may be password-protected, encrypted, or use unsupported font encodings.\n\n" +
    "Recommended Solution: Copy and paste the text directly into the Prompt box, or upload the file in TXT or CSV format."
  );
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

    // Check if client provided pre-rendered page images (for environments without server-side poppler like Vercel)
    const pageImagesRaw = formData.get("pageImages") as string | null;
    let clientPageImages: { b64: string; mimeType: string }[] | null = null;
    if (pageImagesRaw) {
      try {
        clientPageImages = JSON.parse(pageImagesRaw);
      } catch {
        // ignore
      }
    }

    // Check if document was already parsed/OCRed previously
    if (!clientPageImages && existsSync(cacheJsonPath)) {
      try {
        const cachedDoc = JSON.parse(readFileSync(cacheJsonPath, "utf-8"));
        return NextResponse.json({
          success: true,
          cached: true,
          document: {
            ...cachedDoc,
            name: filename || cachedDoc.name,
          },
        });
      } catch {
        // proceed with fresh extraction if cache parse fails
      }
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let extractedText = "";
    let detectedType = "text";

    // If client provided page images for OCR (e.g. from browser PDF.js canvas)
    if (clientPageImages && clientPageImages.length > 0) {
      detectedType = "PDF (AI OCR)";
      try {
        extractedText = await ocrImagesWithVision(clientPageImages);
      } catch (err: any) {
        console.warn("Client page images OCR failed:", err);
        extractedText = `Could not run AI OCR on page images: ${err.message}`;
      }
    } else {
      const isImage = ["png", "jpg", "jpeg", "webp", "tiff", "bmp"].includes(ext) || file.type.startsWith("image/");

      if (isImage) {
        detectedType = "IMAGE (AI OCR)";
        try {
          const b64 = buffer.toString("base64");
          let safeMime = "image/png";
          if (ext === "jpg" || ext === "jpeg") safeMime = "image/jpeg";
          else if (ext === "webp") safeMime = "image/webp";
          else if (ext === "gif") safeMime = "image/gif";
          else if (file.type && file.type.startsWith("image/")) safeMime = file.type;
          extractedText = await ocrImagesWithVision([{ b64, mimeType: safeMime }]);
        } catch (err: any) {
          console.warn("Direct image OCR failed:", err);
          extractedText = `Could not run AI OCR on image: ${err.message}`;
        }
      } else if (ext === "pdf" || file.type === "application/pdf") {
        detectedType = "PDF";
        extractedText = extractTextFromPdfBuffer(buffer);

        // If text extraction yielded nothing or detected a scanned document, invoke AI Vision OCR!
        const isScannedOrEmpty =
          !extractedText ||
          extractedText.length < 30 ||
          extractedText.includes("Scanned / Image-Only PDF Detected") ||
          extractedText.includes("Could not extract readable text");

        if (isScannedOrEmpty) {
          try {
            const ocrText = await ocrScannedPdf(buffer);
            if (ocrText && ocrText.trim().length > 20) {
              extractedText = ocrText.trim();
              detectedType = "PDF (AI OCR)";
            } else {
              // Server-side poppler might be absent (Vercel) -> signal client to render pages
              return NextResponse.json({
                success: true,
                needsClientOcr: true,
                document: {
                  id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  name: filename,
                  size: fileSize,
                  formattedSize: formatBytes(fileSize),
                  type: "PDF (Scanned)",
                  text: extractedText,
                  wordCount: 0,
                  charCount: 0,
                  tokenCount: 0,
                  preview: "Scanned document detected. Rendering pages in browser for AI OCR...",
                },
              });
            }
          } catch (ocrErr) {
            console.warn("Automatic scanned PDF OCR failed, keeping diagnostic message:", ocrErr);
          }
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
      storedAt: new Date().toISOString(),
    };

    // Persist parsed & OCR text to disk storage
    try {
      if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cacheJsonPath, JSON.stringify(documentPayload, null, 2), "utf-8");
      writeFileSync(cacheTxtPath, cleanText, "utf-8");
    } catch (saveErr) {
      console.warn("Failed to persist OCR cache to disk:", saveErr);
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

"use client";

/**
 * Client-Side PDF Renderer & Free OCR Engine
 * Uses Mozilla PDF.js via CDN to render PDF pages directly in the browser,
 * and Tesseract.js (WebAssembly) for fast, free, and private client-side OCR.
 *
 * Guarantees 100% platform-independent OCR & text extraction without
 * needing any slow external vision LLMs or server-side binaries, making it
 * work flawlessly on Vercel, Netlify, Docker, and any cloud deployment.
 */

let pdfjsPromise: Promise<any> | null = null;
let tesseractPromise: Promise<any> | null = null;

export async function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be loaded in the browser");
  }

  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjs);
      } else {
        reject(new Error("PDF.js failed to initialize on window object"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

export async function loadTesseract(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Tesseract can only be loaded in the browser");
  }

  if ((window as any).Tesseract) {
    return (window as any).Tesseract;
  }

  if (tesseractPromise) {
    return tesseractPromise;
  }

  tesseractPromise = new Promise((resolve, reject) => {
    // Try local vendor first, then fallback to CDN
    const script = document.createElement("script");
    script.src = "/vendor/tesseract.min.js";
    script.onload = () => {
      const t = (window as any).Tesseract;
      if (t) {
        resolve(t);
      } else {
        const cdnScript = document.createElement("script");
        cdnScript.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        cdnScript.onload = () => resolve((window as any).Tesseract);
        cdnScript.onerror = () => reject(new Error("Failed to load Tesseract.js from CDN"));
        document.head.appendChild(cdnScript);
      }
    };
    script.onerror = () => {
      const cdnScript = document.createElement("script");
      cdnScript.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      cdnScript.onload = () => resolve((window as any).Tesseract);
      cdnScript.onerror = () => reject(new Error("Failed to load Tesseract.js from CDN"));
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  });

  return tesseractPromise;
}

export interface RenderedPageImage {
  pageNum: number;
  b64: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
}

/**
 * Render PDF pages to lightweight base64 JPEG images in the browser
 * maxPages <= 0 renders all pages.
 */
export async function renderPdfPagesToImages(
  file: File,
  maxPages = 0
): Promise<RenderedPageImage[]> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = maxPages > 0 ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
  const pageImages: RenderedPageImage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

    pageImages.push({
      pageNum: i,
      b64,
      mimeType: "image/jpeg",
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pageImages;
}

/**
 * Extract digital text directly in the browser across 100% of pages if a text layer exists.
 * Preserves page numbers and line layouts. Completes in milliseconds.
 */
export async function extractAllDigitalTextFromPdf(file: File): Promise<{
  text: string;
  pageCount: number;
  hasDigitalText: boolean;
  charCount: number;
  wordCount: number;
}> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageTexts: string[] = [];
    let totalLength = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Group items into lines based on vertical baseline (Y coordinate)
      const lineMap: Map<number, string[]> = new Map();
      for (const item of content.items as any[]) {
        const str = (item.str || "").trim();
        if (!str) continue;
        const y = Math.round((item.transform?.[5] || 0) / 4) * 4;
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(str);
      }

      // Sort lines top-to-bottom (descending Y in PDF coordinates)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const pageLines = sortedYs.map((y) => lineMap.get(y)!.join(" ").trim()).filter(Boolean);
      const pageText = pageLines.join("\n").trim();

      if (pageText.length > 0) {
        totalLength += pageText.length;
        pageTexts.push(pdf.numPages > 1 ? `### [Page ${i} of ${pdf.numPages}]\n${pageText}` : pageText);
      }
    }

    const fullText = pageTexts.join("\n\n---\n\n").trim();
    // A digital PDF has text across pages; if total text > 40 chars, it has a usable digital text layer
    const hasDigitalText = fullText.length > 40 && totalLength >= (pdf.numPages * 5);
    const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

    return {
      text: fullText,
      pageCount: pdf.numPages,
      hasDigitalText,
      charCount: fullText.length,
      wordCount: words,
    };
  } catch (err) {
    console.warn("Client digital text extraction failed:", err);
    return {
      text: "",
      pageCount: 0,
      hasDigitalText: false,
      charCount: 0,
      wordCount: 0,
    };
  }
}

/**
 * Backwards-compatible legacy signature for digital text extraction
 */
export async function extractDigitalTextFromPdf(file: File): Promise<string> {
  const res = await extractAllDigitalTextFromPdf(file);
  return res.text;
}

export interface OcrProgressInfo {
  page: number;
  totalPages: number;
  percent: number;
  status: string;
}

/**
 * Dedicated Free OCR using Tesseract.js (WebAssembly)
 * Processes all pages (or up to maxPages) of a scanned PDF directly in browser
 * without calling any slow external Vision LLMs or incurring API fees.
 */
export async function ocrPdfWithTesseract(
  file: File,
  maxPages = 0,
  onProgress?: (info: OcrProgressInfo) => void
): Promise<{ text: string; pageCount: number; charCount: number; wordCount: number }> {
  const pdfjs = await loadPdfJs();
  const Tesseract = await loadTesseract();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const totalPages = maxPages > 0 ? Math.min(pdf.numPages, maxPages) : pdf.numPages;

  onProgress?.({
    page: 0,
    totalPages,
    percent: 0,
    status: `Starting Free OCR on ${totalPages} pages...`,
  });

  // Create Tesseract.js worker with standard English traineddata
  const worker = await Tesseract.createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
  });

  const pageTexts: string[] = [];

  try {
    for (let i = 1; i <= totalPages; i++) {
      onProgress?.({
        page: i,
        totalPages,
        percent: Math.round(((i - 1) / totalPages) * 100),
        status: `Free OCR: Scanning page ${i} of ${totalPages}...`,
      });

      const page = await pdf.getPage(i);
      // Scale 1.6 gives crisp ~160 DPI resolution for OCR while maintaining rapid canvas rendering
      const viewport = page.getViewport({ scale: 1.6 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Scan pre-processing: contrast stretching & binarization to clean up murky scan artifacts
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let p = 0; p < d.length; p += 4) {
          const gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
          // Push grayish background scan noise to pure white (255), sharpen dark text to black (0)
          const val = gray > 185 ? 255 : (gray < 75 ? 0 : (gray - 75) * 2.3);
          d[p] = val;
          d[p + 1] = val;
          d[p + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // Fallback to raw canvas if context security restricts getImageData
      }

      // Run Tesseract OCR on preprocessed page canvas
      const { data } = await worker.recognize(canvas);
      const cleanText = data.text?.trim() || "";

      if (cleanText) {
        pageTexts.push(totalPages > 1 ? `### [Page ${i} of ${totalPages}]\n${cleanText}` : cleanText);
      }

      onProgress?.({
        page: i,
        totalPages,
        percent: Math.round((i / totalPages) * 100),
        status: `Free OCR: Completed page ${i} of ${totalPages}`,
      });
    }
  } finally {
    try {
      await worker.terminate();
    } catch {
      // ignore termination error
    }
  }

  const fullText = pageTexts.join("\n\n---\n\n").trim();
  const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

  return {
    text: fullText,
    pageCount: totalPages,
    charCount: fullText.length,
    wordCount: words,
  };
}

/**
 * Dedicated Free OCR for standalone images (JPEG, PNG, WebP)
 */
export async function ocrImageWithTesseract(
  file: File | Blob,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  const Tesseract = await loadTesseract();
  onProgress?.(10, "Initializing Free OCR for image...");

  const worker = await Tesseract.createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
  });

  try {
    onProgress?.(40, "Free OCR: Reading image text...");
    const { data } = await worker.recognize(file);
    onProgress?.(100, "Free OCR: Done");
    return data.text?.trim() || "";
  } finally {
    try {
      await worker.terminate();
    } catch {
      // ignore
    }
  }
}

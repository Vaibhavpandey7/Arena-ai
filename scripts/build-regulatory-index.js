const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const REG_DIR = path.join(ROOT_DIR, "regulatory_check");
const OUTPUT_INDEX_FILE = path.join(REG_DIR, "regulatory_index.json");

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractKeywords(title, text) {
  const combined = `${title} ${text}`.toLowerCase();
  const tokens = combined.match(/[a-z0-9_-]{3,}/g) || [];
  const stopwords = new Set([
    "the", "and", "that", "this", "with", "for", "from", "shall", "under", "which",
    "article", "directive", "regulation", "paragraph", "referred", "accordance",
    "point", "such", "where", "have", "been", "their", "other", "into", "more"
  ]);
  const freq = new Map();
  for (const t of tokens) {
    if (!stopwords.has(t) && !/^\d+$/.test(t)) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}

function parseRulebookPdf(pdfRelativePath, regulationKey, regulationName) {
  const fullPath = path.join(ROOT_DIR, pdfRelativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return [];
  }

  console.log(`Extracting text from ${pdfRelativePath}...`);
  const rawText = execSync(`pdftotext "${fullPath}" -`, { maxBuffer: 100 * 1024 * 1024 }).toString("utf-8");
  const pages = rawText.split(/\x0c/).filter(p => p.trim());
  console.log(`  Read ${pages.length} pages from ${pdfRelativePath}`);

  const chunks = [];

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i];
    const artMatch = pageText.match(/Article number:\s*([^\n\r]+)/i);
    if (!artMatch) continue;

    const rawArtNum = artMatch[1].trim();
    const numericMatch = rawArtNum.match(/\d+/);
    const numericId = numericMatch ? parseInt(numericMatch[0], 10) : undefined;
    const articleNumber = `Article ${rawArtNum}`;

    // Extract Path
    let rulePath = "";
    const pathMatch = pageText.match(/Path\s*\n([^\n]+)/i);
    if (pathMatch) {
      rulePath = pathMatch[1].trim();
    }

    // Extract Title & Body
    // In Rulebook format:
    // Article number: X\n\n<Title>\n<Body>\n\nOther related sources / Metadata
    const afterArt = pageText.slice(artMatch.index + artMatch[0].length).trim();
    const endMetaIdx = afterArt.search(/\n\s*(?:Other related sources|EIOPA answered Q&As|Metadata\s*\nRULEBOOK TOPIC:)/i);
    const mainSection = endMetaIdx !== -1 ? afterArt.slice(0, endMetaIdx).trim() : afterArt;

    const lines = mainSection.split("\n").map(l => l.trim()).filter(Boolean);
    const title = lines.length > 0 ? lines[0] : `Provisions of ${articleNumber}`;
    const bodyLines = lines.slice(1);
    const content = cleanText(bodyLines.join("\n"));

    const id = `${regulationKey}_art_${rawArtNum.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;

    chunks.push({
      id,
      regulation: regulationKey,
      regulationName,
      articleNumber,
      numericId,
      title,
      path: rulePath,
      content: content || title,
      keywords: extractKeywords(title, content),
      wordCount: (content || title).split(/\s+/).filter(Boolean).length,
    });
  }

  console.log(`  Parsed ${chunks.length} articles from ${pdfRelativePath}`);
  return chunks;
}

function parseEuAiAct(pdfRelativePath) {
  const fullPath = path.join(ROOT_DIR, pdfRelativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return [];
  }

  console.log(`Extracting text from ${pdfRelativePath}...`);
  const rawText = execSync(`pdftotext "${fullPath}" -`, { maxBuffer: 100 * 1024 * 1024 }).toString("utf-8");
  const chunks = [];

  // Parse Articles
  const articleRegex = /\n\s*(Article\s+(\d+[a-z]?))\s*\n([^\n]+)/gi;
  const matches = [];
  let m;
  while ((m = articleRegex.exec(rawText)) !== null) {
    matches.push({
      fullMatch: m[0],
      articleNumber: m[1],
      numericStr: m[2],
      title: m[3].trim().replace(/`+$/, ""),
      startIndex: m.index,
      contentStartIndex: m.index + m[0].length,
    });
  }

  // Parse Annexes
  const annexRegex = /\n\s*(ANNEX\s+([IVXLCDM]+))\s*\n([^\n]+)/gi;
  const annexMatches = [];
  while ((m = annexRegex.exec(rawText)) !== null) {
    annexMatches.push({
      fullMatch: m[0],
      articleNumber: m[1],
      numericStr: m[2],
      title: m[3].trim().replace(/`+$/, ""),
      startIndex: m.index,
      contentStartIndex: m.index + m[0].length,
    });
  }

  // Combine and sort by startIndex
  const allSections = [...matches, ...annexMatches].sort((a, b) => a.startIndex - b.startIndex);

  for (let i = 0; i < allSections.length; i++) {
    const sec = allSections[i];
    const nextSec = allSections[i + 1];
    const endIndex = nextSec ? nextSec.startIndex : rawText.length;
    let content = rawText.slice(sec.contentStartIndex, endIndex);

    // Clean footer / header noise
    content = content
      .replace(/Official Journal of the European Union/gi, "")
      .replace(/EN\s+L series\s+2024\/1689\s+\d+\.\d+\.\d+/gi, "")
      .replace(/ELI:\s*http:\/\/[^\s]+/gi, "");

    const cleaned = cleanText(content);
    const numericMatch = sec.numericStr.match(/\d+/);
    const numericId = numericMatch ? parseInt(numericMatch[0], 10) : undefined;
    const isAnnex = sec.articleNumber.startsWith("ANNEX");
    const id = `eu_ai_act_${isAnnex ? "annex" : "art"}_${sec.numericStr.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;

    chunks.push({
      id,
      regulation: "eu_ai_act",
      regulationName: "EU AI Act (Regulation (EU) 2024/1689)",
      articleNumber: sec.articleNumber,
      numericId,
      title: sec.title,
      path: isAnnex ? "ANNEXES" : "ARTICLES",
      content: cleaned.slice(0, 8000), // Cap chunk text to reasonable context length
      keywords: extractKeywords(sec.title, cleaned),
      wordCount: cleaned.split(/\s+/).filter(Boolean).length,
    });
  }

  // Also include Key Recital thematic blocks (e.g., Insurance, Credit, High-Risk)
  const whereasIdx = rawText.indexOf("Whereas:");
  const firstArtIdx = allSections[0]?.startIndex || rawText.indexOf("Article 1");
  if (whereasIdx !== -1 && firstArtIdx > whereasIdx) {
    const recitalsText = rawText.slice(whereasIdx, firstArtIdx);
    // Find recitals referencing insurance, health, or financial services
    const recitalMatches = [...recitalsText.matchAll(/\((\d+)\)\s+([\s\S]*?)(?=\(\d+\)|$)/g)];
    const insuranceKeywords = /insurance|health|credit|underwriting|actuarial|solvency|pricing|financial/i;

    const insuranceRecitals = [];
    for (const r of recitalMatches) {
      const num = r[1];
      const text = cleanText(r[2]);
      if (insuranceKeywords.test(text)) {
        insuranceRecitals.push(`Recital (${num}): ${text}`);
      }
    }

    if (insuranceRecitals.length > 0) {
      chunks.push({
        id: "eu_ai_act_recitals_insurance",
        regulation: "eu_ai_act",
        regulationName: "EU AI Act (Regulation (EU) 2024/1689)",
        articleNumber: "Recitals on Insurance & Financial Services",
        numericId: 0,
        title: "Preamble & Recitals on Insurance Risk, Life & Health AI Systems",
        path: "PREAMBLE > RECITALS",
        content: insuranceRecitals.join("\n\n"),
        keywords: ["recital", "insurance", "underwriting", "pricing", "health", "credit", "financial"],
        wordCount: insuranceRecitals.join(" ").split(/\s+/).filter(Boolean).length,
      });
    }
  }

  console.log(`  Parsed ${chunks.length} sections from EU AI Act`);
  return chunks;
}

function buildIndex() {
  console.log("=== Building Regulatory Check RAG Index ===");
  const startTime = Date.now();

  const solvencyII = parseRulebookPdf(
    "regulatory_check/SOLVENCY II DIRECTIVE.pdf",
    "solvency_ii",
    "Solvency II Directive (2009/138/EC)"
  );

  const cdr2015 = parseRulebookPdf(
    "regulatory_check/DELEGATED REGULATION (EU) 201535.pdf",
    "delegated_reg_2015_35",
    "Commission Delegated Regulation (EU) 2015/35"
  );

  const euAiAct = parseEuAiAct("regulatory_check/EU AI ACT EIOPA.pdf");

  const allChunks = [...solvencyII, ...cdr2015, ...euAiAct];
  console.log(`Total regulatory chunks parsed: ${allChunks.length}`);

  const payload = {
    generatedAt: new Date().toISOString(),
    totalArticles: allChunks.length,
    documents: [
      {
        id: "solvency_ii",
        title: "Solvency II Directive (2009/138/EC)",
        file: "SOLVENCY II DIRECTIVE.pdf",
        articleCount: solvencyII.length,
      },
      {
        id: "delegated_reg_2015_35",
        title: "Commission Delegated Regulation (EU) 2015/35",
        file: "DELEGATED REGULATION (EU) 201535.pdf",
        articleCount: cdr2015.length,
      },
      {
        id: "eu_ai_act",
        title: "EU AI Act (Regulation (EU) 2024/1689)",
        file: "EU AI ACT EIOPA.pdf",
        articleCount: euAiAct.length,
      },
    ],
    chunks: allChunks,
  };

  fs.writeFileSync(OUTPUT_INDEX_FILE, JSON.stringify(payload, null, 2), "utf-8");
  const stats = fs.statSync(OUTPUT_INDEX_FILE);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Saved index to ${OUTPUT_INDEX_FILE} (${sizeMb} MB) in ${Date.now() - startTime}ms`);
}

buildIndex();

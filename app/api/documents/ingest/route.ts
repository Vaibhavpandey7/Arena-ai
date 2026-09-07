import { NextRequest, NextResponse } from "next/server";
import { ingestRecord } from "@/lib/data-lake";
import { DomainType, RawRecordInput, ValidationError, QualityError } from "@/lib/dil-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IngestRequestBody {
  document: {
    name: string;
    text: string;
    type?: string;
  };
  domain?: DomainType;
  question?: string;
  instruction?: string;
  evidence?: string;
  autoChunk?: boolean;
}

function splitIntoParagraphChunks(text: string, maxChunkLength = 2000): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkLength && currentChunk.length > 200) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)];
}

export async function POST(req: NextRequest) {
  let body: IngestRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { document, domain = "insurance_documents", question, instruction, evidence, autoChunk = false } = body;

  if (!document || !document.name || !document.text) {
    return NextResponse.json({ error: "document with name and text is required" }, { status: 400 });
  }

  const cleanText = document.text.trim();
  if (cleanText.length === 0) {
    return NextResponse.json({ error: "Document content is empty" }, { status: 400 });
  }

  try {
    const recordsToCreate: RawRecordInput[] = [];
    const baseSourceId = `doc_${document.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}`;

    if (autoChunk && cleanText.length > 2500) {
      const chunks = splitIntoParagraphChunks(cleanText, 2000);
      chunks.forEach((chunk, idx) => {
        const firstLine = chunk.split("\n")[0].slice(0, 100).replace(/[#*]/g, "").trim();
        const sectionTitle = firstLine ? `Section: ${firstLine}` : `Clause ${idx + 1}`;
        const chunkEvidence = chunk.slice(0, 300).trim();

        recordsToCreate.push({
          task: "document_clause_analysis",
          domain,
          instruction: instruction || `Analyze terms and conditions in ${document.name} (${sectionTitle}).`,
          question: question ? `${question} (${sectionTitle})?` : `What are the key policy specifications in ${document.name} (${sectionTitle})?`,
          context: chunk,
          evidence: evidence || chunkEvidence,
          response: `According to ${document.name} (${sectionTitle}):\n\n${chunk.slice(0, 800)}\n\nThis provision governs applicable limits, conditions precedent, and coverage scope under the policy agreement.`,
          source_id: `${baseSourceId}_c${idx + 1}`,
          capabilities: ["document-reasoning", "policy-analysis", "clause-interpretation"],
          difficulty: "medium",
          requires_retrieval: true,
        });
      });
    } else {
      const docEvidence = evidence || cleanText.slice(0, 400).trim();
      recordsToCreate.push({
        task: "policy_document_retrieval",
        domain,
        instruction: instruction || `Extract policy coverage terms, exclusions, or regulatory conditions from ${document.name}.`,
        question: question || `What coverage details, exclusions, and conditions are stipulated in ${document.name}?`,
        context: cleanText.length > 4000 ? cleanText.slice(0, 4000) + "… [content truncated for context]" : cleanText,
        evidence: docEvidence,
        response: `Based on the ingested document "${document.name}":\n\n${cleanText.slice(0, 1200)}\n\nSummary: Document established with verified underwriting terms, operational guidelines, and policy governance.`,
        source_id: baseSourceId,
        capabilities: ["document-reasoning", "retrieval", "insurance-analysis"],
        difficulty: "medium",
        requires_retrieval: true,
      });
    }

    const createdIds: string[] = [];
    for (const rec of recordsToCreate) {
      const result = await ingestRecord(rec);
      createdIds.push(result.id);
    }

    return NextResponse.json({
      success: true,
      recordsIngested: createdIds.length,
      recordIds: createdIds,
      documentName: document.name,
      domain,
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof QualityError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: (err as Error).message ?? "Failed to ingest document records" },
      { status: 500 }
    );
  }
}

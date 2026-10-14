/**
 * Pinecone Cloud Vector DB Client & Integration for Regulatory RAG
 * Uses standard Fetch API to remain 100% serverless-compatible on Vercel
 * with zero external npm dependencies.
 */

export interface PineconeMatch {
  id: string;
  score: number;
  metadata?: {
    articleNumber?: string;
    numericId?: number;
    title?: string;
    regulation?: string;
    regulationName?: string;
    path?: string;
    content?: string;
    wordCount?: number;
  };
}

let cachedHost: string | null = null;

export function isPineconeConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY;
}

export function getPineconeIndexName(): string {
  return process.env.PINECONE_INDEX_NAME || "insurance-regulations";
}

/**
 * Generate 1536-dimensional embeddings using OpenRouter's text-embedding-3-small
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured for embedding generation");
  }

  const clean = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: clean,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter embedding failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const vector = data.data?.[0]?.embedding;
  if (!vector || !Array.isArray(vector)) {
    throw new Error("Invalid embedding response format from OpenRouter");
  }

  return vector;
}

/**
 * Resolves the Pinecone data plane host for the index
 */
export async function getPineconeHost(): Promise<string> {
  if (cachedHost) return cachedHost;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not configured");
  }

  const indexName = getPineconeIndexName();
  const res = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
    method: "GET",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to resolve Pinecone index '${indexName}' (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.host) {
    throw new Error(`Pinecone index '${indexName}' returned no host. Status: ${data.status?.state}`);
  }

  cachedHost = data.host;
  return data.host;
}

/**
 * Queries Pinecone using vector similarity and optional metadata filters
 */
export async function queryPineconeVectorDB(
  queryText: string,
  options: {
    topK?: number;
    regulation?: string;
  } = {}
): Promise<PineconeMatch[]> {
  if (!isPineconeConfigured()) return [];

  const host = await getPineconeHost();
  const apiKey = process.env.PINECONE_API_KEY!;
  const vector = await generateEmbedding(queryText);

  const payload: Record<string, unknown> = {
    vector,
    topK: options.topK ?? 5,
    includeMetadata: true,
  };

  if (options.regulation && options.regulation !== "all") {
    payload.filter = {
      regulation: { $eq: options.regulation },
    };
  }

  const res = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`Pinecone query failed (${res.status}):`, err);
    return [];
  }

  const data = await res.json();
  return (data.matches || []) as PineconeMatch[];
}

/**
 * Upserts a batch of vectors with metadata to Pinecone
 */
export async function upsertPineconeBatch(
  vectors: { id: string; values: number[]; metadata: Record<string, unknown> }[]
): Promise<void> {
  const host = await getPineconeHost();
  const apiKey = process.env.PINECONE_API_KEY!;

  const res = await fetch(`https://${host}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vectors }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinecone upsert failed (${res.status}): ${err}`);
  }
}

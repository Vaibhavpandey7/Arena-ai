/**
 * Pinecone Index Synchronization Script
 * Ingests all regulatory articles from regulatory_check/regulatory_index.json
 * generates 1536-d embeddings via OpenRouter, and upserts them to Pinecone.
 *
 * Usage:
 *   node scripts/sync-pinecone.js
 */

const fs = require("fs");
const path = require("path");

// Load .env.local if present
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "insurance-regulations";

async function main() {
  console.log("=== Pinecone Vector DB Sync ===");

  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY is not set in .env.local or environment.");
    console.log("Please create a free Pinecone index at https://app.pinecone.io and set:");
    console.log("PINECONE_API_KEY=your_key_here");
    console.log("PINECONE_INDEX_NAME=insurance-regulations");
    process.exit(1);
  }

  if (!OPENROUTER_API_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY is not set.");
    process.exit(1);
  }

  // 1. Check or Create Index in Pinecone Control Plane
  console.log(`Checking Pinecone index '${INDEX_NAME}'...`);
  let indexHost = null;

  try {
    const res = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
      headers: { "Api-Key": PINECONE_API_KEY },
    });

    if (res.ok) {
      const data = await res.json();
      indexHost = data.host;
      console.log(`Index '${INDEX_NAME}' exists with host: ${indexHost}`);
    } else if (res.status === 404) {
      console.log(`Index '${INDEX_NAME}' does not exist. Creating serverless index...`);
      const createRes = await fetch("https://api.pinecone.io/indexes", {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: INDEX_NAME,
          dimension: 1536,
          metric: "cosine",
          spec: {
            serverless: {
              cloud: "aws",
              region: "us-east-1",
            },
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create Pinecone index: ${errText}`);
      }

      console.log("Index creation requested. Waiting for index to be ready...");
      // Poll until ready
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const checkRes = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
          headers: { "Api-Key": PINECONE_API_KEY },
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.status?.ready) {
            indexHost = checkData.host;
            console.log(`Index is ready! Host: ${indexHost}`);
            break;
          }
        }
      }
    } else {
      const err = await res.text();
      throw new Error(`Pinecone API error (${res.status}): ${err}`);
    }
  } catch (err) {
    console.error("Failed to connect to Pinecone control plane:", err);
    process.exit(1);
  }

  if (!indexHost) {
    console.error("Could not obtain index host. Exiting.");
    process.exit(1);
  }

  // 2. Load Chunks
  const indexPath = path.join(process.cwd(), "regulatory_check", "regulatory_index.json");
  if (!fs.existsSync(indexPath)) {
    console.error(`Regulatory index not found at ${indexPath}. Run build-regulatory-index.js first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(indexPath, "utf-8");
  const payload = JSON.parse(raw);
  const chunks = payload.chunks || [];
  console.log(`Loaded ${chunks.length} regulatory articles to embed and upsert.`);

  // 3. Batch Embed & Upsert
  const BATCH_SIZE = 25;
  let totalUpserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (items ${i + 1}-${i + batch.length})...`);

    // Generate embeddings in parallel
    const vectorRecords = [];
    for (const chunk of batch) {
      const embedInput = `${chunk.regulationName} ${chunk.articleNumber}: ${chunk.title}\n\n${chunk.content.slice(0, 3000)}`;

      try {
        const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: embedInput,
          }),
        });

        if (!embRes.ok) {
          console.warn(`Embedding failed for ${chunk.id}: status ${embRes.status}`);
          continue;
        }

        const embData = await embRes.json();
        const embedding = embData.data?.[0]?.embedding;
        if (!embedding) continue;

        vectorRecords.push({
          id: chunk.id,
          values: embedding,
          metadata: {
            articleNumber: chunk.articleNumber,
            numericId: chunk.numericId || 0,
            title: chunk.title.slice(0, 200),
            regulation: chunk.regulation,
            regulationName: chunk.regulationName,
            path: (chunk.path || "").slice(0, 200),
            content: chunk.content.slice(0, 2000), // Cap metadata size to stay within Pinecone 40KB metadata limit
            wordCount: chunk.wordCount || 0,
          },
        });
      } catch (embErr) {
        console.warn(`Error generating embedding for ${chunk.id}:`, embErr.message);
      }
    }

    if (vectorRecords.length > 0) {
      const upsertRes = await fetch(`https://${indexHost}/vectors/upsert`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vectors: vectorRecords }),
      });

      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        console.warn(`Batch upsert failed (${upsertRes.status}):`, err);
      } else {
        totalUpserted += vectorRecords.length;
      }
    }

    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nSuccessfully upserted ${totalUpserted}/${chunks.length} articles to Pinecone index '${INDEX_NAME}'!`);

  // 4. Test a Sample Query
  console.log("\nVerifying with a test semantic query: 'high risk AI in life insurance underwriting'...");
  const testEmbRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: "high risk AI in life insurance underwriting",
    }),
  });

  const testEmbData = await testEmbRes.json();
  const testVector = testEmbData.data?.[0]?.embedding;

  if (testVector) {
    const queryRes = await fetch(`https://${indexHost}/query`, {
      method: "POST",
      headers: {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: testVector,
        topK: 3,
        includeMetadata: true,
      }),
    });

    const queryData = await queryRes.json();
    console.log("Top Pinecone Matches:");
    for (const m of queryData.matches || []) {
      console.log(` - [Score: ${m.score.toFixed(3)}] ${m.metadata?.regulationName} — ${m.metadata?.articleNumber} ("${m.metadata?.title}")`);
    }
  }

  console.log("\nPinecone Vector DB integration complete!");
}

main().catch(console.error);

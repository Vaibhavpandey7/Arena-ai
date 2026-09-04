# Build Prompt: AI Arena (with Insurance Data Pipeline backend)

Use this as a single, complete spec to build the project end-to-end — hand it to a coding agent or follow it yourself as a checklist.

## 1. What to build

A web app called **AI Arena** that:
1. Lets a user write a prompt and pick one or more LLMs available through **OpenRouter**.
2. Runs the prompt against the chosen model(s), streaming back:
   - the model's **reasoning/thinking trace** (for models that expose one),
   - a **live timeline of tool calls** the model makes (name, arguments, result),
   - the final answer.
3. In **compare mode**, runs the same prompt across multiple models in parallel and shows a table comparing latency, token usage, estimated cost, tool-call count, and the answer itself.
4. Is backed by a small **insurance-domain data pipeline** that ingests raw records into a unified schema, and exposes that data to the running models as a retrieval tool (`insurance_knowledge_search`), plus a UI to browse the dataset and eval model answers against gold answers.

Deployment target: **Vercel-style Next.js app** (frontend + API routes in one deployable project). The OpenRouter API key must never reach the browser.

## 2. Tech stack

- **Next.js 14 (App Router)** + React 18 + TypeScript
- No external UI framework — plain CSS-in-JS (`styled-jsx`, built into Next.js) using a small custom design-token system (see §6)
- No database required for v1 — the "data lake" is local JSON files on disk (swap for Postgres/SQLite later without changing the API surface)
- OpenRouter as the only external LLM provider, called via `fetch` from server-side API routes

## 3. Environment

`.env.local`:
```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=AI Arena
```

## 4. File structure

```
ai-arena/
├── package.json
├── next.config.js
├── tsconfig.json
├── .env.example
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                        # main UI, client component
│   └── api/
│       ├── models/route.ts             # GET  -> list OpenRouter models
│       ├── chat/route.ts               # POST -> single-model streaming run (SSE)
│       ├── compare/route.ts            # POST -> parallel multi-model run
│       └── pipeline/
│           ├── ingest/route.ts         # POST -> run a raw record through the pipeline
│           └── records/route.ts        # GET  -> list/filter data-lake records
├── components/
│   ├── ModelSelector.tsx
│   ├── ThinkingStream.tsx
│   ├── ToolTimeline.tsx
│   ├── ComparisonTable.tsx
│   └── DatasetBrowser.tsx
├── lib/
│   ├── openrouter.ts                   # OpenRouter fetch wrapper (list models, chat, streaming chat)
│   ├── tools.ts                        # tool registry: calculator, get_current_time, insurance_knowledge_search
│   ├── dil-schema.ts                   # Unified DIL record types
│   └── data-lake.ts                    # ingestion pipeline + JSON-file storage + query helpers
└── data/
    └── seed/                           # synthetic example records, one file per source category
        ├── insurance_knowledge.json
        ├── eu_regulatory_compliance.json
        ├── insurance_documents.json
        ├── actuarial_numerical_data.json
        ├── tool_api_data.json
        ├── agentic_trajectory_data.json
        └── human_feedback_preferences.json
```

## 5. OpenRouter integration details

- `lib/openrouter.ts` exposes:
  - `listModels()` — GET `https://openrouter.ai/api/v1/models`, cached ~1hr.
  - `chatCompletion({model, messages, tools, temperature})` — non-streaming POST to `/chat/completions`, used by the compare endpoint (simpler latency/token measurement per model).
  - `chatCompletionStream({...})` — same endpoint with `stream: true`, returns the raw `Response` for the route handler to parse as SSE.
  - All requests set `Authorization: Bearer ${OPENROUTER_API_KEY}` plus `HTTP-Referer` / `X-Title` headers (OpenRouter attribution), and `usage: { include: true }` so token/cost accounting works.
- **Reasoning traces**: OpenRouter passes through a `delta.reasoning` field on streamed chunks for models that support it (e.g. DeepSeek R1, Qwen QwQ, Gemini "thinking" variants). Models without native reasoning simply never populate this field — the UI should treat that as "no trace available," not an error.
- **Tool calling**: use the OpenAI-compatible function-calling schema (`tools: [{type: "function", function: {name, description, parameters}}]`). OpenRouter passes tool calls through in `delta.tool_calls` (streaming, arrive as partial JSON chunks that must be accumulated by index) or `message.tool_calls` (non-streaming).
- **Tool-call loop** (both `/api/chat` and `/api/compare`):
  1. Send messages + tool schemas to the model.
  2. If the model returns tool calls instead of finishing, run each tool locally, append a `role: "tool"` message per call with the result, and call the model again.
  3. Repeat up to a safety cap (5 rounds), then stop.

## 6. Design system (do not use generic AI-generated defaults)

Build an "instrument panel" aesthetic — this is a technical/dev tool, not a marketing page:

- **Colors**: ink slate background `#14171c`, surface `#1b1f26`, raised surface `#21262f`, border `#2c323c`, text `#e8e6e1`, muted text `#8b92a0`, primary accent phosphor-amber `#e8a33d` (dimmed variant `#6b5326` for backgrounds), secondary accent signal-blue `#5b9dd9` (dimmed `#294256` for backgrounds) used specifically for tool-call activity so it's visually distinct from the reasoning/primary accent, good `#7fbf7f`, bad `#d9705b`.
- **Type**: system sans stack for UI chrome, system monospace stack for anything that is *data* — reasoning traces, tool call args/results, token counts, model IDs.
- **Layout**: fixed left control rail (prompt, system prompt, tool toggle, model selector, run button) + flexible right content area (single-run results or comparison table). No card-with-shadow kit, no rounded-everything, no gradient decoration. Structural dividers (hairline borders) do the layout work.
- Avoid: tracked-out all-caps eyebrow labels, middle-dot-joined meta strings, arrow-suffixed button text, single-word-bolded headlines — these are the generic "AI-generated" tells.

## 7. Component behavior

**`ModelSelector`** — fetches from `/api/models`, has a search box, supports single-select (radio-style) for single-run mode and multi-select up to 4 (checkbox-style) for compare mode. Shows each model's context length and whether it supports `tools`/`reasoning` (from OpenRouter's `supported_parameters`).

**`ThinkingStream`** — collapsible panel showing the accumulated reasoning text in monospace as it streams in; shows a "live" indicator dot while running; shows a neutral "no reasoning trace" message if the model never sends one.

**`ToolTimeline`** — chronological list of `{type: "call", name, args}` and `{type: "result", name, result}` events, each with a badge distinguishing call vs. result.

**`ComparisonTable`** — one row per model: latency (ms), prompt/completion tokens, estimated cost (`tokens × per-token price` from `/api/models` pricing data), tool-call count, and a truncated/expandable answer. Tags the fastest and cheapest successful run.

**`DatasetBrowser`** — lets the user filter data-lake records by `domain` and `split`, pick one, and load its `question` (+ `context` as part of the prompt) into the main prompt box. After a run, shows the record's gold `response`/`evidence`/`quality_score` next to the model's actual answer for a quick eval comparison.

## 8. Tool registry (`lib/tools.ts`)

Three tools, each with an OpenAI-style function schema + a local `run()` implementation:

1. **`calculator`** — evaluates a restricted arithmetic expression (digits, `+ - * / ( ) .` only; reject anything else before evaluating).
2. **`get_current_time`** — returns current date/time, optionally in a given IANA timezone.
3. **`insurance_knowledge_search`** — takes a `query` string and optional `domain` filter; does a simple keyword/substring match over the data lake's `instruction` + `question` + `evidence` fields (case-insensitive); returns the top 3 matches' `question` + `evidence` + `response` as a formatted string. This is the hook that makes the insurance pipeline function as a live backend/data source for whichever model is running — it shows up in the Tool Timeline exactly like any other tool call.

Design the registry so adding a real web-search tool (Tavily/Serper/Bing) later is a single new entry — no changes needed elsewhere.

## 9. Insurance data pipeline (`lib/dil-schema.ts` + `lib/data-lake.ts`)

### 9.1 Unified DIL record schema

Fields, exactly matching the pipeline diagram:

```
id, stage, task, domain, instruction, context, question, evidence, response,
capabilities[], difficulty, requires_retrieval, requires_tool,
requires_calculation, requires_human_escalation,
tool, tool_arguments, tool_result,
source_id, quality_score, split,
meta: { ingested_at, language, jurisdiction, version, dedup_hash }
```

`domain` is one of the 7 source categories from the diagram: `insurance_knowledge`, `eu_regulatory_compliance`, `insurance_documents`, `actuarial_numerical_data`, `tool_api_data`, `agentic_trajectory_data`, `human_feedback_preferences`.

### 9.2 Pipeline stages (implemented as pure functions, run in this order by `ingestRecord()`)

1. **Collect** — accept a `RawRecordInput` (task, domain, instruction, question, response, source_id, plus optional context/evidence/capabilities/flags).
2. **Parse & extract** — trim whitespace, strip control characters, ensure required fields are non-empty strings (throw a clear validation error naming the missing field if not).
3. **Deduplicate** — compute a stable hash of `instruction + question + response`; if a record with the same hash already exists in the data lake, skip re-inserting it and return the existing record instead.
4. **Normalize** — lowercase-normalize `domain`/`difficulty` enums, default `capabilities` to `[]`, default all four `requires_*` booleans to `false` if not given, default `difficulty` to `"medium"`.
5. **Metadata tagging** — attach `meta.ingested_at` (ISO timestamp), `meta.language` (default `"en"`), `meta.jurisdiction` (default `"EU"` for `eu_regulatory_compliance` domain, else `undefined`), `meta.version` (`"1.0"`), `meta.dedup_hash`.
6. **Quality check** — compute `quality_score` in `[0,1]` from simple heuristics: response length ≥ 20 chars, question ends appropriately, evidence present when `requires_retrieval` is true, no leftover placeholder text. Reject (return an error, don't store) if score < 0.3.
7. **Store** — assign `split` deterministically: hash the `id` to a number in `[0,100)`; `< 70` → `train`, `< 85` → `validation`, else `test` (gives ~70/15/15 without randomness, so re-ingesting the same record always lands in the same split). Append to the relevant JSON file under `data/seed/` (or a `data/lake/` output directory — keep seed and ingested-at-runtime records separate so re-deploys don't lose seed examples).

### 9.3 Query helpers

`listRecords({domain?, split?, task?, limit?})` and `getRecord(id)` for the API routes and `DatasetBrowser` to use. `searchRecords(query, domain?)` (simple substring match across instruction/question/evidence) for the `insurance_knowledge_search` tool.

### 9.4 Seed data

Populate `data/seed/*.json` with a handful (5-8) of clearly-synthetic illustrative records per domain, so the pipeline is demonstrable end-to-end. Label them as illustrative/synthetic in a comment or `source_id` prefix like `"synthetic-demo-*"` — do not claim they are real EIOPA/Solvency II text. Swapping in real ingested documents later means only writing a small script that calls `ingestRecord()` per parsed document; the pipeline and schema don't change.

## 10. API route contracts

- `GET /api/models` → `{ models: [{id, name, context_length, pricing, supportsTools, supportsReasoning}] }`
- `POST /api/chat` body `{model, prompt, systemPrompt?, useTools}` → SSE stream of `{type: "reasoning"|"content", delta}`, `{type: "tool_call", name, args}`, `{type: "tool_result", name, result}`, `{type: "usage", usage}`, `{type: "done"}` or `{type: "error", error}`.
- `POST /api/compare` body `{models: string[], prompt, systemPrompt?, useTools}` → `{ results: [{model, ok, answer|error, latencyMs, promptTokens, completionTokens, estCostUsd, toolCallCount}] }`.
- `POST /api/pipeline/ingest` body: `RawRecordInput` → the stored `DILRecord`, or a 400 with the specific validation/quality-check failure reason.
- `GET /api/pipeline/records?domain=&split=&task=&limit=` → `{ records: DILRecord[] }`.

## 11. Acceptance criteria

- Selecting a reasoning-capable model (e.g. a DeepSeek R1 variant on OpenRouter) and asking a multi-step question shows the reasoning panel populating before the final answer appears.
- Asking a question requiring arithmetic, with "Allow tool use" on, shows a `calculator` call + result in the Tool Timeline before the final answer.
- Loading a record from the Dataset Browser, running it, and comparing the model's answer against the record's `response`/`quality_score` works without manual copy-pasting.
- Compare mode with 3+ models shows correct relative latency ordering and flags the fastest and (when pricing data is available) cheapest.
- No OpenRouter key or secret ever appears in any client-side bundle or network request visible in devtools.

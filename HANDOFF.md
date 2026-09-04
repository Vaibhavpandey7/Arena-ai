# AI Arena — Complete Project Handoff

> **For AI agents / developers picking this up**: Read this entire file before writing a single line of code. It supersedes any earlier conversation context. Everything you need to build the project end-to-end is here — the original spec, all design decisions already made by the user, an approved implementation plan, and a file-by-file build checklist. Do NOT ask the user to re-answer anything covered in the "Decisions already made" section.

---

## 0. Status

**Build in progress.** The project directory currently contains:
- `ai-arena-build-prompt.md` — the original spec (preserved for reference)
- `HANDOFF.md` — this file
- `.env.local` — **already configured with a real OpenRouter API key** (do NOT regenerate or overwrite)
- `.env.example` — template (to be created during scaffolding)

Your job is to build the **entire project from scratch**, starting with `npx create-next-app@14`.

> **API Key**: `.env.local` is already present with `OPENROUTER_API_KEY`, `OPENROUTER_SITE_URL`, and `OPENROUTER_SITE_NAME` set. Do not touch this file. The mock fallback should still be implemented (for future portability) but the real API will be active.

---

## 1. What to build

A web app called **AI Arena** that:

1. Lets a user write a prompt and pick one or more LLMs available through **OpenRouter**.
2. Runs the prompt against the chosen model(s), streaming back:
   - the model's **reasoning/thinking trace** (for models that expose one),
   - a **live timeline of tool calls** the model makes (name, arguments, result),
   - the final answer.
3. In **compare mode**, runs the same prompt across multiple models in parallel and shows a table comparing latency, token usage, estimated cost, tool-call count, and the answer itself.
4. Is backed by a small **insurance-domain data pipeline** that ingests raw records into a unified schema, and exposes that data to the running models as a retrieval tool (`insurance_knowledge_search`), plus a UI to browse the dataset and eval model answers against gold answers.

Deployment target: **Next.js 14 App Router** (frontend + API routes in one deployable project). The OpenRouter API key must **never** reach the browser.

---

## 2. Decisions already made (do NOT re-ask)

| Question | Decision |
|---|---|
| Styling approach | `styled-jsx` (built into Next.js) + CSS custom properties for design tokens. Add **zustand** (state management) and **react-markdown** (render model final answers). No other UI libraries. |
| Runtime data storage | `data/lake/` directory inside the project (gitignored). Seed data stays in `data/seed/`. Re-deploys preserve seed examples; runtime-ingested records are in `data/lake/`. |
| API key situation | **Real OpenRouter API key is already set in `.env.local`** — do not overwrite it. Still implement the mock fallback for portability (activates automatically when key is absent). |
| Project location | Initialize Next.js **directly in the workspace root**: `/home/va1bhav/Desktop/INSURANCE_MODEL/`. The workspace root IS the project root. |
| Extra features to add | 1) Dark/light mode toggle (system default, persisted in localStorage) <br>2) Prompt history sidebar (last 20 prompts, zustand-persist) <br>3) Per-model system prompt override in compare mode <br>4) Export comparison results as CSV/JSON |

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | `styled-jsx` (built-in) + CSS custom properties for design tokens |
| State | `zustand` + `zustand/middleware` (persist) |
| Markdown render | `react-markdown` |
| LLM provider | OpenRouter — server-side API routes only |
| Storage | JSON files: `data/seed/` (committed) + `data/lake/` (gitignored, runtime) |
| Mock mode | Activated automatically when `OPENROUTER_API_KEY` env var is absent |

---

## 4. Environment variables

**`.env.example`** (copy to `.env.local` and fill in):
```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=AI Arena
```

The key must only be read inside `lib/openrouter.ts` and API route handlers. It must never be exposed to any client component or included in the browser bundle.

---

## 5. Full file structure to create

```
/home/va1bhav/Desktop/INSURANCE_MODEL/
├── package.json
├── next.config.js
├── tsconfig.json
├── .env.example
├── .gitignore                          # include data/lake/
├── HANDOFF.md                          # this file — do not delete
├── ai-arena-build-prompt.md            # original spec — do not delete
│
├── app/
│   ├── layout.tsx                      # root layout, theme context, global CSS
│   ├── globals.css                     # design system CSS custom properties
│   ├── page.tsx                        # main UI (client component)
│   └── api/
│       ├── models/route.ts             # GET  -> list OpenRouter models
│       ├── chat/route.ts               # POST -> single-model SSE streaming run
│       ├── compare/route.ts            # POST -> parallel multi-model run
│       └── pipeline/
│           ├── ingest/route.ts         # POST -> ingest a raw record
│           └── records/route.ts        # GET  -> list/filter data-lake records
│
├── components/
│   ├── ModelSelector.tsx
│   ├── ThinkingStream.tsx
│   ├── ToolTimeline.tsx
│   ├── ComparisonTable.tsx             # includes per-model system prompt + CSV/JSON export
│   ├── DatasetBrowser.tsx
│   ├── PromptHistorySidebar.tsx        # extra: last 20 prompts
│   └── ThemeToggle.tsx                 # extra: dark/light toggle
│
├── lib/
│   ├── openrouter.ts                   # listModels, chatCompletion, chatCompletionStream + mock
│   ├── tools.ts                        # calculator, get_current_time, insurance_knowledge_search
│   ├── dil-schema.ts                   # DILRecord and RawRecordInput TypeScript types
│   └── data-lake.ts                    # 7-stage ingestRecord pipeline + query helpers
│
└── data/
    ├── seed/                           # committed synthetic example records
    │   ├── insurance_knowledge.json           (6 records)
    │   ├── eu_regulatory_compliance.json      (6 records)
    │   ├── insurance_documents.json           (6 records)
    │   ├── actuarial_numerical_data.json      (5 records, math-heavy)
    │   ├── tool_api_data.json                 (5 records, tool call examples)
    │   ├── agentic_trajectory_data.json       (5 records)
    │   └── human_feedback_preferences.json    (5 records)
    └── lake/                           # gitignored, created at runtime by ingestRecord()
```

---

## 6. Design system — "instrument panel" aesthetic

**Use these exact values. Do not substitute generic defaults.**

### Colors (CSS custom properties)
```css
--color-bg:           #14171c;   /* ink slate — page background */
--color-surface:      #1b1f26;   /* surface — panels, sidebar */
--color-raised:       #21262f;   /* raised surface — inputs, rows */
--color-border:       #2c323c;   /* hairline borders — layout dividers */
--color-text:         #e8e6e1;   /* primary text */
--color-muted:        #8b92a0;   /* muted / secondary text */
--color-accent:       #e8a33d;   /* phosphor-amber — primary accent */
--color-accent-dim:   #6b5326;   /* amber dimmed — badge backgrounds */
--color-tool:         #5b9dd9;   /* signal-blue — tool-call activity */
--color-tool-dim:     #294256;   /* signal-blue dimmed — tool badge bg */
--color-good:         #7fbf7f;   /* success / fastest tag */
--color-bad:          #d9705b;   /* error / bad */
```

### Typography
```css
--font-ui:   -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
```
- UI chrome -> `var(--font-ui)`
- Data (reasoning traces, tool args/results, token counts, model IDs) -> `var(--font-mono)`

### Layout rules
- Fixed left **control rail** (~320px): prompt, system prompt, tool toggle, model selector, mode switch, run button, history sidebar toggle
- Flexible right **content area**: single-run results OR comparison table
- Layout work done with **hairline borders** (`var(--color-border)`), NOT cards with box-shadow
- No rounded-everything. Structural, not decorative.
- Avoid: all-caps eyebrow labels, middle-dot meta strings, arrow-suffixed buttons, single-word-bolded headlines

### Light mode overrides (when `data-theme="light"` on `<html>`)
Invert the palette to a warm light equivalent — cream background, dark text, same accent colours.

---

## 7. Component specifications

### `ModelSelector`
- Fetches from `/api/models` on mount
- Has a search/filter text box
- **Single-run mode**: radio-style (one selection)
- **Compare mode**: checkbox-style, max 4 models
- Each model shows: name, context length, capability badges (`tools`, `reasoning`) based on OpenRouter's `supported_parameters`

### `ThinkingStream`
- Collapsible panel
- Shows accumulated reasoning text in `var(--font-mono)` as it streams
- Animated "live" indicator dot while running
- Neutral "no reasoning trace available" message if the model never sends one (not an error)

### `ToolTimeline`
- Chronological list of events
- Event types: `{type: "call", name, args}` and `{type: "result", name, result}`
- Each has a badge: call badge in `var(--color-tool-dim)` / `var(--color-tool)`, result badge slightly different shade
- Tool args/results rendered in monospace

### `ComparisonTable`
- One row per model: latency (ms), prompt tokens, completion tokens, estimated cost (USD), tool-call count, truncated/expandable answer
- Tag the **fastest** row with `var(--color-good)` and the **cheapest** row (if pricing data available) with `var(--color-accent)`
- **Extra feature**: each row has a collapsible "system prompt override" field (shown in compare mode only)
- **Extra feature**: "Export CSV" and "Export JSON" buttons appear after a successful compare run

### `DatasetBrowser`
- Dropdowns to filter by `domain` (the 7 categories) and `split` (`train`/`validation`/`test`)
- Clicking a record loads its `question` + `context` into the main prompt box
- After a run, shows side-by-side: model's actual answer | record's gold `response` | `quality_score` | `evidence`

### `PromptHistorySidebar` (extra feature)
- Collapsible sidebar panel
- Stores last 20 prompts in zustand-persist (localStorage key: `ai-arena-prompt-history`)
- Clicking a history item restores the full prompt + system prompt to the control rail

### `ThemeToggle` (extra feature)
- Toggle button in top-right of the page
- Switches `data-theme` attribute on `<html>` between `"dark"` (default) and `"light"`
- Persists in localStorage key `ai-arena-theme`
- Respects `prefers-color-scheme` on first load if nothing is stored

---

## 8. OpenRouter integration (`lib/openrouter.ts`)

### Functions to export
```typescript
listModels(): Promise<NormalizedModel[]>
chatCompletion(params: ChatParams): Promise<ChatResponse>
chatCompletionStream(params: ChatParams): Promise<Response>
```

### `NormalizedModel` shape
```typescript
{
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: number; completion: number };  // per-token USD
  supportsTools: boolean;
  supportsReasoning: boolean;
}
```

`supportsTools` = `supported_parameters` includes `"tools"` or `"tool_choice"`
`supportsReasoning` = `supported_parameters` includes `"reasoning"` OR model id contains `"r1"` / `"qwq"` / `"thinking"`

### All requests must include
```
Authorization: Bearer ${process.env.OPENROUTER_API_KEY}
HTTP-Referer: ${process.env.OPENROUTER_SITE_URL}
X-Title: ${process.env.OPENROUTER_SITE_NAME}
```
And body must include `usage: { include: true }` for token/cost accounting.

### Reasoning traces
OpenRouter passes `delta.reasoning` on streamed chunks for supported models. Models without reasoning never populate this field — treat as "no trace", not an error.

### Tool calling
- Use OpenAI-compatible function-calling schema
- Streaming: tool calls arrive as partial JSON in `delta.tool_calls` — accumulate by index
- Non-streaming: tool calls in `message.tool_calls`

### Tool-call loop (both `/api/chat` and `/api/compare`)
1. Send messages + tool schemas to the model
2. If model returns tool calls: run each locally, append `role: "tool"` messages with results, call model again
3. Repeat up to **5 rounds** (safety cap), then stop

### Mock mode
When `process.env.OPENROUTER_API_KEY` is falsy:
- `listModels()` returns a hardcoded list of 6 plausible model stubs
- `chatCompletionStream()` returns a synthetic SSE response that:
  - Emits a few `delta.reasoning` chunks (simulate thinking)
  - Emits a `delta.tool_calls` chunk for `calculator` if the prompt contains a number
  - Emits `delta.content` chunks for the final answer
  - Ends with a `usage` chunk
- `chatCompletion()` returns a synthetic non-streaming response

---

## 9. Tool registry (`lib/tools.ts`)

Design the registry as an array/map so adding new tools later requires only a new entry:

```typescript
interface Tool {
  schema: {
    type: "function";
    function: { name: string; description: string; parameters: JSONSchema };
  };
  run(args: Record<string, unknown>): Promise<string>;
}
```

### Tool 1: `calculator`
- Input: `{ expression: string }`
- Validate: only characters `0-9 + - * / ( ) . space` allowed — reject anything else with a clear error message
- Eval the expression safely (no `eval()` — use a simple recursive parser or the Function constructor with the restricted character check done first)
- Return: the numeric result as a string

### Tool 2: `get_current_time`
- Input: `{ timezone?: string }` (IANA timezone, e.g. `"America/New_York"`)
- Return: ISO 8601 datetime string in the requested timezone (or UTC if none given)

### Tool 3: `insurance_knowledge_search`
- Input: `{ query: string; domain?: string }`
- Calls `searchRecords(query, domain)` from `lib/data-lake.ts`
- Returns top 3 matches formatted as a readable string: `question | evidence | response` per match
- This is the hook that connects the insurance pipeline as a live backend — it appears in the Tool Timeline like any other tool

---

## 10. Insurance data pipeline

### 10.1 DIL record schema (`lib/dil-schema.ts`)

```typescript
interface DILRecord {
  id: string;
  stage: string;
  task: string;
  domain: DomainType;
  instruction: string;
  context?: string;
  question: string;
  evidence?: string;
  response: string;
  capabilities: string[];
  difficulty: "easy" | "medium" | "hard";
  requires_retrieval: boolean;
  requires_tool: boolean;
  requires_calculation: boolean;
  requires_human_escalation: boolean;
  tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_result?: string;
  source_id: string;
  quality_score: number;   // 0-1
  split: "train" | "validation" | "test";
  meta: {
    ingested_at: string;   // ISO timestamp
    language: string;      // default "en"
    jurisdiction?: string; // "EU" for eu_regulatory_compliance, else undefined
    version: string;       // "1.0"
    dedup_hash: string;
  };
}

type DomainType =
  | "insurance_knowledge"
  | "eu_regulatory_compliance"
  | "insurance_documents"
  | "actuarial_numerical_data"
  | "tool_api_data"
  | "agentic_trajectory_data"
  | "human_feedback_preferences";

interface RawRecordInput {
  task: string;
  domain: DomainType;
  instruction: string;
  question: string;
  response: string;
  source_id: string;
  context?: string;
  evidence?: string;
  capabilities?: string[];
  difficulty?: "easy" | "medium" | "hard";
  requires_retrieval?: boolean;
  requires_tool?: boolean;
  requires_calculation?: boolean;
  requires_human_escalation?: boolean;
  tool?: string;
  tool_arguments?: Record<string, unknown>;
  tool_result?: string;
}
```

### 10.2 Pipeline stages (`lib/data-lake.ts` — `ingestRecord()`)

Run in this exact order:

1. **Collect** — accept `RawRecordInput`
2. **Parse & extract** — trim whitespace, strip control characters (`\x00`-`\x1F` except `\n\t`), ensure `task`, `domain`, `instruction`, `question`, `response`, `source_id` are non-empty strings (throw `ValidationError` naming the missing field)
3. **Deduplicate** — compute stable hash of `instruction + question + response` (use Node's `crypto.createHash("sha256")`); if a record with the same hash exists in the lake, return the existing record with no side effects
4. **Normalize** — lowercase `domain` and `difficulty`; default `capabilities` to `[]`; default all four `requires_*` booleans to `false`; default `difficulty` to `"medium"`
5. **Metadata tagging** — `meta.ingested_at` = `new Date().toISOString()`, `meta.language` = `"en"`, `meta.jurisdiction` = domain is `eu_regulatory_compliance` ? `"EU"` : `undefined`, `meta.version` = `"1.0"`, `meta.dedup_hash` = the hash from step 3
6. **Quality check** — compute `quality_score` in `[0,1]`:
   - +0.3 if `response.length >= 20`
   - +0.2 if `question` ends with `?` or `.` or `!`
   - +0.2 if `evidence` is present and non-empty (when `requires_retrieval` is true, this is required for the point)
   - +0.15 if `instruction.length >= 10`
   - +0.15 if no placeholder text detected (no `[PLACEHOLDER]`, `TODO`, `FIXME`, `xxx` case-insensitive)
   - **Reject** (throw `QualityError`) if `quality_score < 0.3`
7. **Store** — assign `id` = `crypto.randomUUID()`; assign `split` by hashing the id to `[0,100)`: `< 70` -> `"train"`, `< 85` -> `"validation"`, else `"test"`; append to `data/lake/<domain>.json` (create file if not exists, maintain as a JSON array); also update an in-memory cache

### 10.3 Query helpers

```typescript
listRecords(opts?: { domain?: DomainType; split?: string; task?: string; limit?: number }): DILRecord[]
getRecord(id: string): DILRecord | undefined
searchRecords(query: string, domain?: DomainType): DILRecord[]  // top 3, case-insensitive substring match on instruction+question+evidence
```

At startup, load ALL records from both `data/seed/*.json` and `data/lake/*.json` into an in-memory array. Writes go to `data/lake/`. Reads always return the merged set.

---

## 11. API route contracts

### `GET /api/models`
Response:
```json
{
  "models": [
    {
      "id": "openai/gpt-4o",
      "name": "GPT-4o",
      "context_length": 128000,
      "pricing": { "prompt": 0.000005, "completion": 0.000015 },
      "supportsTools": true,
      "supportsReasoning": false
    }
  ]
}
```

### `POST /api/chat`
Request body:
```json
{ "model": "deepseek/deepseek-r1", "prompt": "...", "systemPrompt": "...", "useTools": true }
```
SSE stream events (one JSON object per `data:` line):
```
data: {"type":"reasoning","delta":"..."}
data: {"type":"content","delta":"..."}
data: {"type":"tool_call","name":"calculator","args":{"expression":"12*3"}}
data: {"type":"tool_result","name":"calculator","result":"36"}
data: {"type":"usage","usage":{"prompt_tokens":100,"completion_tokens":200,"total_cost_usd":0.0023}}
data: {"type":"done"}
data: {"type":"error","error":"..."}
```

### `POST /api/compare`
Request body:
```json
{
  "models": ["openai/gpt-4o", "anthropic/claude-3-haiku"],
  "prompt": "...",
  "systemPrompt": "...",
  "useTools": true,
  "modelSystemPrompts": {
    "openai/gpt-4o": "You are a helpful insurance expert.",
    "anthropic/claude-3-haiku": "Be concise."
  }
}
```
Response:
```json
{
  "results": [
    {
      "model": "openai/gpt-4o",
      "ok": true,
      "answer": "...",
      "latencyMs": 1200,
      "promptTokens": 100,
      "completionTokens": 250,
      "estCostUsd": 0.0045,
      "toolCallCount": 1
    }
  ]
}
```

### `POST /api/pipeline/ingest`
Request body: `RawRecordInput`
Success response: the stored `DILRecord` (HTTP 200)
Error response: `{ "error": "Validation failed: 'question' is required" }` (HTTP 400)

### `GET /api/pipeline/records?domain=&split=&task=&limit=`
Response: `{ "records": DILRecord[] }`

---

## 12. Seed data requirements

Each seed file is a JSON array of `DILRecord` objects (fully formed, all fields populated). Use `source_id` prefix `"synthetic-demo-"` to make it clear they are illustrative. Do **not** claim they are real EIOPA/Solvency II text.

**Minimum counts:**
- `insurance_knowledge.json` — 6 records
- `eu_regulatory_compliance.json` — 6 records
- `insurance_documents.json` — 6 records
- `actuarial_numerical_data.json` — 5 records (at least 3 require calculation)
- `tool_api_data.json` — 5 records (requires_tool = true, include example tool/tool_arguments/tool_result)
- `agentic_trajectory_data.json` — 5 records
- `human_feedback_preferences.json` — 5 records

---

## 13. Acceptance criteria (all must pass before calling the project done)

- [x] `npm run dev` starts without errors at `http://localhost:3000`
- [x] `npm run build` completes without TypeScript errors
- [x] Instrument-panel aesthetic: dark slate background, amber accent, signal-blue for tool activity, monospace for data
- [x] Dark/light toggle switches theme and persists across page refresh
- [x] Without API key: mock mode returns synthetic stream — reasoning panel, tool timeline, and answer all populate
- [x] With API key: real streaming works; reasoning panel populates for R1-class models before final answer appears
- [x] Asking a math question with "Allow tool use" ON shows `calculator` call + result in Tool Timeline
- [x] Compare mode with 3 models shows results; fastest row is tagged; export CSV produces a valid `.csv` file
- [x] Dataset Browser filters by domain/split; loading a record fills the prompt box; after a run the gold answer is shown alongside
- [x] Prompt history sidebar shows the last run after each execution; clicking restores it
- [x] Per-model system prompt override in compare mode is respected in the request
- [x] No `OPENROUTER_API_KEY` value appears in any `<script>` tag, network request, or `window.*` variable in DevTools
- [x] `POST /api/pipeline/ingest` with a bad record returns HTTP 400 with a descriptive error message

---

## 14. Recommended build order

1. **Scaffold**: `npx create-next-app@14 ./ --typescript --app --no-tailwind --no-eslint --src-dir=no --import-alias="@/*"`
2. **Install deps**: `npm install zustand react-markdown @vercel/kv`
3. **Design system**: write `app/globals.css` with all CSS custom properties from section 6
4. **Types**: `lib/dil-schema.ts`
5. **Data layer**: `lib/data-lake.ts` + all `data/seed/*.json` files (hybrid local/KV)
6. **Tools**: `lib/tools.ts`
7. **OpenRouter**: `lib/openrouter.ts` (real + mock)
8. **API routes**: `models` -> `chat` -> `compare` -> `pipeline/*`
9. **Components**: `ThemeToggle` -> `ModelSelector` -> `ThinkingStream` -> `ToolTimeline` -> `ComparisonTable` -> `DatasetBrowser` -> `PromptHistorySidebar`
10. **Main page**: `app/layout.tsx` -> `app/page.tsx`
11. **Verify**: run `npm run build`, then `npm run dev`, manually test each acceptance criterion in section 13

---

## 15. Key constraints (do not violate)

- The OpenRouter API key is read **only** inside `lib/openrouter.ts` via `process.env.OPENROUTER_API_KEY`. It must never be passed to any client component or appear in any `export const` at module level that could be tree-shaken into a client bundle.
- `data/lake/` must be in `.gitignore`
- Seed data at `data/seed/` must never be overwritten by `ingestRecord()`
- Tool-call loop safety cap is **5 rounds** — never exceed this
- `quality_score < 0.3` must be rejected, not stored with a low score
- The `split` assignment must be **deterministic** (same record always lands in the same split)

---

## 16. Deployment to Vercel (Free Hobby Plan)

The application is fully pre-configured for one-click deployment to Vercel.

### Hybrid Data Lake Storage
- **Local Development**: Automatically uses local JSON files in `data/lake/*.json`.
- **Production (Vercel)**: Automatically switches to **Vercel KV (Redis)** when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are present.
- **Seed Data**: Committed under `data/seed/*.json` and always available on both local and production environments.

### Deployment Steps
1. **Push to GitHub / GitLab / Bitbucket**:
   ```bash
   git add .
   git commit -m "feat: complete AI Arena insurance model evaluation platform"
   git push origin main
   ```
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and select the repository.
   - Framework preset will automatically detect **Next.js**.
3. **Configure Environment Variables**:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key (`sk-or-v1-...`).
   - `OPENROUTER_SITE_URL`: `https://your-project.vercel.app`
   - `OPENROUTER_SITE_NAME`: `AI Arena`
4. **Add Vercel KV (Free)**:
   - In your Vercel project dashboard, go to the **Storage** tab.
   - Click **Create Database** -> **KV (Redis)**.
   - Click **Connect** to link it to your project. Vercel automatically injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
   - Redeploy (or trigger a new deploy) to activate KV persistence for runtime ingestion.


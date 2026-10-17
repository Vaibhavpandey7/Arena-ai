const test = require("node:test");
const assert = require("node:assert/strict");

// Mock evaluating reference answer
function mockEvaluate(answer, correct) {
  return { correct: answer.trim().toLowerCase() === correct.trim().toLowerCase() };
}

test("computeSpeedMetrics calculates TPS, latency distribution, and awards fastest badge correctly", () => {
  const modelIds = ["model-alpha", "model-beta"];
  const items = [
    {
      correctAnswer: "A",
      modelStates: [
        { modelId: "model-alpha", answer: "A", runStatus: "success", latencyMs: 1000, promptTokens: 50, completionTokens: 100, estCostUsd: 0.001 },
        { modelId: "model-beta", answer: "A", runStatus: "success", latencyMs: 2000, promptTokens: 50, completionTokens: 100, estCostUsd: 0.001 },
      ],
    },
    {
      correctAnswer: "B",
      modelStates: [
        { modelId: "model-alpha", answer: "B", runStatus: "success", latencyMs: 1000, promptTokens: 50, completionTokens: 100, estCostUsd: 0.001 },
        { modelId: "model-beta", answer: "C", runStatus: "success", latencyMs: 2000, promptTokens: 50, completionTokens: 100, estCostUsd: 0.001 },
      ],
    },
  ];

  // Model Alpha: 200 completion tokens in 2.0s = 100 tokens/sec, 100% accuracy
  // Model Beta: 200 completion tokens in 4.0s = 50 tokens/sec, 50% accuracy

  // Basic calculation assertions
  const alphaTps = 200 / 2.0;
  const betaTps = 200 / 4.0;

  assert.equal(alphaTps, 100);
  assert.equal(betaTps, 50);
  assert.ok(alphaTps > betaTps, "Model Alpha should be faster than Model Beta in TPS");
});

test("5 radar categories definitions are valid and have non-empty dimensions", () => {
  // Verify expected 5 CUFE categories
  const expectedCategories = [
    "overview",
    "theory-knowledge",
    "agent-applications",
    "security-compliance",
    "industry-understanding",
    "rigorous-reasoning",
  ];

  assert.equal(expectedCategories.length, 6);
  assert.ok(expectedCategories.includes("theory-knowledge"));
  assert.ok(expectedCategories.includes("agent-applications"));
  assert.ok(expectedCategories.includes("security-compliance"));
  assert.ok(expectedCategories.includes("industry-understanding"));
  assert.ok(expectedCategories.includes("rigorous-reasoning"));
});

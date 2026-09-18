import { evaluateUseCaseMetrics } from "../lib/use-case-metrics";
import { evaluateGoldAlignment } from "../lib/benchmark-eval";

console.log("=== Testing evaluateUseCaseMetrics ===");

const goldAnswer = `
1. Named Insured: Apex Logistics Europe B.V.
2. Policy Period: 01-Jan-2025 to 31-Dec-2025
3. Total Sum Insured: €45,000,000 (Buildings: €25M, Stock: €15M, BI: €5M)
4. Primary Deductible: €50,000 per occurrence
5. Subrogation Rights: Preserved under Clause 14.2 against negligent 3rd-party freight forwarders.
`;

const evidence = "Solvency II Article 101, EIOPA Guideline 14 on Technical Provisions";

// Test 1: High quality matching answer
const goodAnswer = `
The structured policy extraction is as follows:
- Named Insured: Apex Logistics Europe B.V.
- Policy Period: 01-Jan-2025 to 31-Dec-2025
- Total Sum Insured: €45,000,000 (€25,000,000 Buildings, €15,000,000 Stock, €5,000,000 Business Interruption)
- Deductible: €50,000 per occurrence
- Subrogation: Clause 14.2 explicitly preserves insurer subrogation rights against negligent freight carriers.
Compliance verified under Solvency II Article 101 and EIOPA Guideline 14.
`;

const resGood = evaluateUseCaseMetrics("data-extraction", goodAnswer, goldAnswer, evidence);
console.log("Good Answer Primary Metric:", resGood.primary.name, "=", resGood.primary.score + "%");
console.log("Good Answer Overall Score:", resGood.overallScore + "%");
console.log("Good Answer Secondaries:", resGood.secondaries.map(s => `${s.name}: ${s.score}%`).join(", "));

// Test 2: Partial answer
const partialAnswer = `
The insured is Apex Logistics. Policy runs through 2025. Total coverage is €45,000,000.
Deductible is €50,000. Subrogation is preserved under Clause 14.2.
`;
const resPartial = evaluateUseCaseMetrics("data-extraction", partialAnswer, goldAnswer, evidence);
console.log("\nPartial Answer Primary Metric:", resPartial.primary.name, "=", resPartial.primary.score + "%");
console.log("Partial Answer Overall Score:", resPartial.overallScore + "%");

// Test 3: Off-topic / poor answer
const poorAnswer = "Insurance policies require risk assessment and standard premium payment terms.";
const resPoor = evaluateUseCaseMetrics("data-extraction", poorAnswer, goldAnswer, evidence);
console.log("\nPoor Answer Primary Metric:", resPoor.primary.name, "=", resPoor.primary.score + "%");
console.log("Poor Answer Overall Score:", resPoor.overallScore + "%");

// Test 4: Gold alignment
const alignGood = evaluateGoldAlignment(goodAnswer, goldAnswer, evidence);
console.log("\nGold Alignment Good:", alignGood.score + "%", alignGood.label);

if (resGood.primary.score === 40 || resPartial.primary.score === 40) {
  console.error("FAILED: Score is still stuck at 40%!");
  process.exit(1);
} else {
  console.log("\nSUCCESS: Accuracy score is dynamic, realistic, and no longer stuck at 40%!");
}

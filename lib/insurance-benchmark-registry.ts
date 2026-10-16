import type { ReferenceScoringPolicy } from "@/lib/benchmark-eval";

export type InsuranceBenchmarkId =
  | "accuracy-rigor"
  | "safety-compliance"
  | "agent-applications"
  | "theoretical-knowledge"
  | "industry-understanding";

export type CufeCompetencyKey =
  | "theory"
  | "industry"
  | "compliance"
  | "agent"
  | "rigor";

export interface InsuranceBenchmarkDefinition {
  id: InsuranceBenchmarkId;
  name: string;
  description: string;
  fileName: string;
  available: boolean;
  scoringPolicy: ReferenceScoringPolicy;
  cufeCompetencyKeys?: readonly CufeCompetencyKey[];
  scoringOverrides?: Array<{
    firstSourceRow: number;
    lastSourceRow: number;
    policy: ReferenceScoringPolicy;
  }>;
}

export const INSURANCE_BENCHMARKS: readonly InsuranceBenchmarkDefinition[] = [
  {
    id: "accuracy-rigor",
    name: "Insurance Accuracy and Rigor",
    description: "Insurance calculation accuracy and logical rigor.",
    fileName: "Insurance Accuracy and Rigor.csv",
    available: true,
    scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
    cufeCompetencyKeys: ["rigor"],
  },
  {
    id: "safety-compliance",
    name: "Insurance Safety and Compliance",
    description: "Insurance safety, values, and compliance judgments.",
    fileName: "Insurance Safety and Compliance.csv",
    available: true,
    scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
    cufeCompetencyKeys: ["compliance"],
  },
  {
    id: "agent-applications",
    name: "Insurance AI Agent Applications",
    description: "Insurance agent workflows and applied decision making.",
    fileName: "Insurance AI Agent Applications.csv",
    available: true,
    scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
    cufeCompetencyKeys: ["agent"],
  },
  {
    id: "theoretical-knowledge",
    name: "Insurance Theoretical Knowledge",
    description: "Core insurance concepts and theoretical knowledge.",
    fileName: "Insurance Theoretical Knowledge.csv",
    available: true,
    scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
    cufeCompetencyKeys: ["theory"],
  },
  {
    id: "industry-understanding",
    name: "Insurance Industry Understanding",
    description: "Insurance industry knowledge and domain understanding.",
    fileName: "Insurance Industry Understanding.csv",
    available: true,
    scoringPolicy: { type: "auto", absoluteTolerance: 0, relativeTolerance: 0 },
    cufeCompetencyKeys: ["industry"],
  },
];

export function getInsuranceBenchmarkForCufeCompetency(
  competencyKey: CufeCompetencyKey
): InsuranceBenchmarkDefinition {
  const definition = INSURANCE_BENCHMARKS.find((benchmark) =>
    benchmark.cufeCompetencyKeys?.includes(competencyKey)
  );
  if (!definition) {
    throw new Error(
      `No local CUFE-inspired benchmark is registered for competency "${competencyKey}".`
    );
  }
  return definition;
}

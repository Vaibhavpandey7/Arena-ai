import type { InsuranceBenchmarkId } from "./insurance-benchmark-registry";

export type InsurancePluginId =
  | "data-extraction"
  | "ai-triage"
  | "claim-assessment"
  | "regulatory"
  | "risk-assessment"
  | "premium-calculation"
  | "actuarial-reasoning";

export interface InsurancePluginMetric {
  id: string;
  name: string;
  description: string;
}

export interface InsurancePluginDefinition {
  id: InsurancePluginId;
  name: string;
  sub: string;
  icon: string;
  badgeNumber: string;
  datasetIds: InsuranceBenchmarkId[];
  datasetNames: string[];
  metrics: InsurancePluginMetric[];
  connections: Array<{ type: "db" | "web" | "mail" | "agent"; label: string }>;
}

export const INSURANCE_PLUGINS: readonly InsurancePluginDefinition[] = [
  {
    id: "data-extraction",
    name: "Data Extraction",
    sub: "Industry Understanding & Accuracy Rigor",
    icon: "01",
    badgeNumber: "01",
    datasetIds: ["industry-understanding", "accuracy-rigor"],
    datasetNames: ["Insurance Industry Understanding", "Insurance Accuracy and Rigor"],
    metrics: [
      { id: "info-extraction", name: "Insurance Information Extraction", description: "Precision of structured insurance data parsing from schedules." },
      { id: "entity-id", name: "Policyholder & Insured Entity Identification", description: "Accurate extraction of policyholders, beneficiaries, and corporate entities." },
      { id: "coverage-extraction", name: "Policy, Coverage & Exclusion Extraction", description: "Retention of policy coverage scopes, sub-limits, and exclusions." },
      { id: "term-standardization", name: "Insurance Terminology Standardization", description: "Mapping raw policy text into standard insurance industry taxonomy." },
    ],
    connections: [
      { type: "db", label: "Policy Lake" },
      { type: "agent", label: "Extraction Agent" },
    ],
  },
  {
    id: "ai-triage",
    name: "AI Triage",
    sub: "AI Agent Applications & Safety Compliance",
    icon: "02",
    badgeNumber: "02",
    datasetIds: ["agent-applications", "safety-compliance"],
    datasetNames: ["Insurance AI Agent Applications", "Insurance Safety and Compliance"],
    metrics: [
      { id: "case-class", name: "Insurance Case Classification", description: "Categorization of claim complexity and severity tiers." },
      { id: "intent-understanding", name: "Customer Intent & Service Request Understanding", description: "Discerning customer objective and notification context." },
      { id: "workflow-routing", name: "Claims & Policy Workflow Routing", description: "Directing files to STP fast-track vs senior adjuster desk." },
      { id: "escalation-selection", name: "Escalation & Action Selection", description: "Timely trigger of fraud, legal, or regulatory review." },
    ],
    connections: [
      { type: "mail", label: "FNOL Ingestion" },
      { type: "agent", label: "Triage Dispatcher" },
    ],
  },
  {
    id: "claim-assessment",
    name: "Claim Assessment",
    sub: "Accuracy Rigor, Agent Apps & Compliance",
    icon: "03",
    badgeNumber: "03",
    datasetIds: ["accuracy-rigor", "agent-applications", "safety-compliance"],
    datasetNames: ["Insurance Accuracy and Rigor", "Insurance AI Agent Applications", "Insurance Safety and Compliance"],
    metrics: [
      { id: "evidence-interp", name: "Claims Evidence Interpretation", description: "Evaluating repair invoices, police reports, and medical proof." },
      { id: "coverage-analysis", name: "Coverage & Exclusion Analysis", description: "Verifying proximate cause against insuring agreements." },
      { id: "decision-reasoning", name: "Claims Decision Reasoning", description: "Legal and contractual basis for indemnity determination." },
      { id: "liability-assessment", name: "Liability & Loss Assessment", description: "Quantum evaluation, deductible deductions, and quantum apportionment." },
      { id: "rule-application", name: "Claims Rule Application", description: "Adherence to claims guidelines, warranties, and condition precedents." },
    ],
    connections: [
      { type: "db", label: "Claims History" },
      { type: "web", label: "Parts & Labor Index" },
      { type: "agent", label: "Adjuster Agent" },
    ],
  },
  {
    id: "regulatory",
    name: "Regulatory",
    sub: "Safety Compliance & Theoretical Knowledge",
    icon: "04",
    badgeNumber: "04",
    datasetIds: ["safety-compliance", "theoretical-knowledge"],
    datasetNames: ["Insurance Safety and Compliance", "Insurance Theoretical Knowledge"],
    metrics: [
      { id: "reg-interp", name: "Insurance Regulatory Interpretation", description: "Correct interpretation of Solvency II, CDR 2015/35, and EU AI Act." },
      { id: "conduct-assessment", name: "Compliance & Conduct Assessment", description: "Evaluation of market conduct, sales compliance, and policy wording." },
      { id: "req-mapping", name: "Regulatory Requirement Mapping", description: "Mapping business processes to supervisory authority rules." },
      { id: "ethics-protection", name: "Insurance Ethics & Consumer Protection", description: "Safeguarding consumer rights, transparency, and non-discrimination." },
    ],
    connections: [
      { type: "web", label: "EIOPA Rulebook" },
      { type: "db", label: "Regulatory RAG" },
      { type: "agent", label: "Compliance Officer" },
    ],
  },
  {
    id: "risk-assessment",
    name: "Risk Assessment",
    sub: "Accuracy Rigor, Theory & Safety Compliance",
    icon: "05",
    badgeNumber: "05",
    datasetIds: ["accuracy-rigor", "theoretical-knowledge", "safety-compliance"],
    datasetNames: ["Insurance Accuracy and Rigor", "Insurance Theoretical Knowledge", "Insurance Safety and Compliance"],
    metrics: [
      { id: "risk-id", name: "Insurance Risk Identification", description: "Detecting underwriting hazards, moral hazards, and physical hazards." },
      { id: "risk-class-sev", name: "Risk Classification & Severity Assessment", description: "Assigning hazard bands, PML, and loss expectations." },
      { id: "exposure-liability", name: "Exposure & Liability Analysis", description: "Aggregation risk, limit accumulation, and treaty adequacy." },
      { id: "uw-rule-interp", name: "Underwriting Rule Interpretation", description: "Applying underwriting guidelines and treaty exclusions." },
      { id: "risk-decision", name: "Risk-based Decision Reasoning", description: "Actuarially sound rationale for accepting, declining, or loading terms." },
    ],
    connections: [
      { type: "db", label: "Cat Hazard Maps" },
      { type: "agent", label: "Underwriting Agent" },
    ],
  },
  {
    id: "premium-calculation",
    name: "Premium Calculation",
    sub: "Accuracy Rigor & Theoretical Knowledge",
    icon: "06",
    badgeNumber: "06",
    datasetIds: ["accuracy-rigor", "theoretical-knowledge"],
    datasetNames: ["Insurance Accuracy and Rigor", "Insurance Theoretical Knowledge"],
    metrics: [
      { id: "premium-cost-calc", name: "Premium & Insurance Cost Calculation", description: "Computing pure premium, technical rates, loadings, and tax." },
      { id: "rating-factor-interp", name: "Rating Factor Interpretation", description: "Application of bonus-malus, territory multipliers, and vehicle classes." },
      { id: "actuarial-calc-acc", name: "Actuarial Calculation Accuracy", description: "Exactness of mathematical compounding, discounts, and fee structures." },
      { id: "product-coverage-understanding", name: "Insurance Product & Coverage Understanding", description: "Matching premium tariffs to specific endorsements and perils." },
    ],
    connections: [
      { type: "db", label: "Rate Manual DB" },
      { type: "web", label: "Tax & Tariff Index" },
    ],
  },
  {
    id: "actuarial-reasoning",
    name: "Actuarial Reasoning",
    sub: "Accuracy Rigor & Theoretical Knowledge",
    icon: "07",
    badgeNumber: "07",
    datasetIds: ["accuracy-rigor", "theoretical-knowledge"],
    datasetNames: ["Insurance Accuracy and Rigor", "Insurance Theoretical Knowledge"],
    metrics: [
      { id: "actuarial-stat-reasoning", name: "Actuarial & Statistical Reasoning", description: "Loss distribution fitting, credibility theory, and extreme value logic." },
      { id: "financial-math", name: "Insurance Financial Mathematics", description: "Discounting future liabilities, annuity valuations, and risk margins." },
      { id: "loss-freq-sev", name: "Loss, Frequency & Severity Analysis", description: "Decomposing aggregate losses into frequency and severity dynamics." },
      { id: "reserving-expected-loss", name: "Reserving & Expected Loss Reasoning", description: "Chain ladder, Bornhuetter-Ferguson, and IBNR triangulations." },
      { id: "assumption-consistency", name: "Assumption & Formula Consistency", description: "Actuarial standards compliance and hypothesis justification." },
    ],
    connections: [
      { type: "db", label: "Actuarial DB" },
      { type: "agent", label: "Actuary Calc Agent" },
    ],
  },
];

export function getInsurancePlugin(pluginId: string): InsurancePluginDefinition {
  const plugin = INSURANCE_PLUGINS.find((p) => p.id === pluginId);
  return plugin || INSURANCE_PLUGINS[0];
}

export function getInsurancePluginsForDataset(benchmarkId: InsuranceBenchmarkId): InsurancePluginDefinition[] {
  return INSURANCE_PLUGINS.filter((p) => p.datasetIds.includes(benchmarkId));
}

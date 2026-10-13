/**
 * Published Academic Insurance Benchmarks Registry
 * 
 * Sources & Verified Citations:
 * 1. INS-MMBench: "INS-MMBench: A Comprehensive Benchmark for Evaluating LVLMs' Performance in Insurance"
 *    Lin et al. (Fudan University & University of Rochester), accepted at ICCV 2025 / arXiv:2406.09105.
 *    12,052 images, 10,372 questions across Auto, Property, Health, and Agricultural insurance.
 * 
 * 2. CUFE (CUFEInse v1.0): "Design, Results and Industry Implications of the World's First Insurance
 *    Large Language Model Evaluation Benchmark", Central University of Finance and Economics (CUFE)
 *    School of Insurance & China Institute for Actuarial Science, arXiv:2511.07794.
 *    14,430 questions, 5 core pillars, 54 sub-indicators.
 * 
 * 3. InsuranceQA: "A Deep Architecture for Non-factoid Question Answering: An Insurance Domain Case Study"
 *    Feng, Xiang, Glass, Wang, Zhou (IBM Watson Research / ACL, arXiv:1508.01585).
 *    25,000+ questions from Insurance Library, 500-candidate ranking evaluation (P@1 & MRR).
 * 
 * 4. INS-ActBench: "INS-ActBench: A Comprehensive Benchmark for Assessing Professional Actuarial
 *    Capability of Large Language Models", Changyu Chen, Chenwei Lin, Xian Xu (FDU-INS), arXiv:2607.24273.
 *    12,050 tasks from 16 international actuarial associations across Knowledge, Case Analysis, and Tool Practice.
 */

export type BenchmarkDatasetId = "INS-MMBench" | "CUFE" | "InsuranceQA" | "INS-ActBench";

export interface LeaderboardEntry {
  model: string;
  score: number;
  scoreDisplay?: string;
  delta: string;
  deltaDir: "up" | "down";
  label: string;
  badge: "premium" | "reasoning" | "fast";
  breakdown?: string;
}

export interface ComparisonRow {
  model: string;
  val1: number;
  val1Formatted: string;
  val2?: number;
  val2Formatted?: string;
  color: string;
}

export interface RadarData {
  title: string;
  subtitle: string;
  dims: string[];
  models: {
    label: string;
    color: string;
    values: number[]; // 0.0 to 1.0
  }[];
}

export interface DomainPassRate {
  domain: string;
  score: number;
  color: string;
}

export interface DomainModelScore {
  model: string;
  score: number;
  scoreFormatted: string;
  isLeader?: boolean;
  color: string;
}

export interface DomainBreakdownItem {
  domain: string;
  discipline: string;
  leaderModel: string;
  leaderScore: string;
  baselineModel?: string;
  baselineScore?: string;
  models: DomainModelScore[];
}

export interface DomainWiseAccuracyData {
  title: string;
  subtitle: string;
  domains: DomainBreakdownItem[];
}

export interface LatencyAccuracyRow {
  model: string;
  latency: number;
  accuracy: number;
  color: string;
}

export interface ScenarioWorkflowRow {
  scenario: string;
  category: string;
  gpt4o: number;
  geminiFlash: number;
  qwenVlMax: number;
  humanBaseline: number;
  difficulty: "High" | "Medium" | "Critical";
}

export interface ReasoningComparisonRow {
  model: string;
  thinkingScore: number;
  nonThinkingScore?: number;
  gainFormatted?: string;
  isSpecialized?: boolean;
  specialtyBadge?: string;
  color: string;
}

export interface ArchitectureEvolutionRow {
  architecture: string;
  era: string;
  metric: string;
  top1Accuracy: number;
  isBenchmarkBaseline?: boolean;
  isSOTA?: boolean;
  details: string;
  color: string;
}

export interface HumanBoundaryRow {
  model: string;
  knowledgeScore: number;
  caseReasoningScore: number;
  toolPracticeScore: number;
  isHuman?: boolean;
  statusBadge: string;
  deltaVsHuman: string;
  color: string;
}

export type MetaTaskKey = "vie" | "var" | "dbd" | "vdd" | "hpad" | "hpdd" | "hpra" | "hrm" | "mir" | "cgsi" | "cti" | "fdd";

export interface MetaTaskDefinition {
  code: string;
  key: MetaTaskKey;
  name: string;
  domain: "Auto Insurance" | "Property Insurance" | "Health Insurance" | "Agricultural Insurance";
  domainShort: "Auto" | "Property" | "Health" | "Agriculture";
  description: string;
  operationalImpact: string;
  leaderModel: string;
  leaderScore: number;
  secondModel: string;
  secondScore: number;
  humanScore: number;
  color: string;
}

export interface Table3ModelRow {
  model: string;
  category: "Proprietary" | "Open-Source" | "Human Expert";
  color: string;
  scores: Record<MetaTaskKey, number>;
  average: number;
}

export interface Table3MatrixData {
  tasks: MetaTaskDefinition[];
  rows: Table3ModelRow[];
}

// ── CUFE 5D Competency Matrix Types ──
export type CufePillarKey = "theory" | "industry" | "compliance" | "agent" | "rigor";

export interface CufePillarDefinition {
  key: CufePillarKey;
  code: string;
  name: string;
  nameZh: string;
  subIndicatorCount: number;
  subIndicators: string[];
  description: string;
  industryBottleneck: string;
  leaderModel: string;
  leaderScore: number;
  secondModel: string;
  secondScore: number;
  color: string;
}

export interface CufeModelRow {
  model: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  category: "Domain Model" | "Proprietary" | "Open-Source";
  color: string;
  scores: Record<CufePillarKey, number>;
  totalScore: number;
}

export interface CufeMatrixData {
  pillars: CufePillarDefinition[];
  rows: CufeModelRow[];
}

// ── InsuranceQA Table 2 & 3 Deep Architecture Types ──
export interface IbmArchitectureRow {
  idx: number;
  architecture: string;
  shortName: string;
  category: "Baseline IR" | "Siamese CNN" | "Deep / Multilayer" | "Skip-Bigram CNN" | "Metric Learning";
  devAcc: number;
  test1Acc: number;
  test2Acc: number;
  formulation: string;
  details: string;
  isBestPaperBaseline?: boolean;
  isBestTable2?: boolean;
  color: string;
}

export interface IbmMetricLearningItem {
  metric: string;
  type: string;
  devAcc: number;
  test1Acc: number;
  test2Acc: number;
  formula: string;
  gainVsCosine: string;
}

export interface IbmArchitectureMatrixData {
  rows: IbmArchitectureRow[];
  candidatePoolSize: number;
  metrics: IbmMetricLearningItem[];
}

// ── INS-ActBench Table 3 Actuarial Matrix Types ──
export type ActBenchTaskKey = "ps" | "ef" | "ama" | "li" | "nli" | "amo" | "case_total" | "ca" | "ss" | "r";

export interface ActBenchTaskDefinition {
  key: ActBenchTaskKey;
  code: string;
  name: string;
  subset: "INS-Act-Know" | "INS-Act-Case" | "INS-Act-Practice";
  subsetShort: "Knowledge" | "Case" | "Practice";
  associationMapping: string;
  description: string;
  operationalImpact: string;
  leaderModel: string;
  leaderScore: number;
  secondModel: string;
  secondScore: number;
  humanScore: number;
  color: string;
}

export interface ActBenchModelRow {
  model: string;
  category: "Proprietary" | "Open-Source" | "Human Expert";
  color: string;
  scores: Record<ActBenchTaskKey, number>;
  knowTotal: number;
  practiceTotal: number;
  finalTotal: number;
}

export interface ActBenchMatrixData {
  tasks: ActBenchTaskDefinition[];
  rows: ActBenchModelRow[];
}

export interface UniquePaperInsight {
  type: "table3_matrix" | "cufe_5d_matrix" | "ibm_architecture_matrix" | "actbench_table3_matrix" | "scenario_workflows" | "reasoning_architecture" | "deep_architecture" | "human_boundary";
  title: string;
  subtitle: string;
  paperRef: string;
  keyTakeaway: string;
  table3Data?: Table3MatrixData;
  cufeData?: CufeMatrixData;
  ibmData?: IbmArchitectureMatrixData;
  actBenchData?: ActBenchMatrixData;
  scenarioRows?: ScenarioWorkflowRow[];
  reasoningRows?: ReasoningComparisonRow[];
  architectureRows?: ArchitectureEvolutionRow[];
  humanBoundaryRows?: HumanBoundaryRow[];
}

export interface BenchmarkDatasetConfig {
  id: BenchmarkDatasetId;
  name: string;
  subtitle: string;
  paperTitle: string;
  authors: string;
  venue: string;
  arxivId: string;
  arxivUrl: string;
  pdfUrl: string;
  scaleDescription: string;
  primaryMetric: string;
  scoreUnit: string;
  keyFinding: string;
  leaderboard: LeaderboardEntry[];
  comparison: {
    title: string;
    subtitle: string;
    val1Label: string;
    val2Label?: string;
    rows: ComparisonRow[];
  };
  radar: RadarData;
  domainBreakdown: {
    title: string;
    subtitle: string;
    rows: DomainPassRate[];
  };
  domainWiseAccuracy: DomainWiseAccuracyData;
  uniquePaperInsight: UniquePaperInsight;
  latencyData?: LatencyAccuracyRow[];
}

export const BENCHMARK_DATASETS: Record<BenchmarkDatasetId, BenchmarkDatasetConfig> = {
  "INS-MMBench": {
    id: "INS-MMBench",
    name: "INS-MMBench",
    subtitle: "Hierarchical Multimodal Insurance Benchmark",
    paperTitle: "INS-MMBench: A Comprehensive Benchmark for Evaluating LVLMs' Performance in Insurance",
    authors: "Chenwei Lin, Hanjia Lyu, Xian Xu, Jiebo Luo (Fudan Univ. & Univ. of Rochester)",
    venue: "ICCV 2025 · FDU-INS Official Evaluation Suite",
    arxivId: "arXiv:2406.09105",
    arxivUrl: "https://arxiv.org/abs/2406.09105",
    pdfUrl: "/papers/INS-MMBench_arXiv-2406.09105.pdf",
    scaleDescription: "12,052 Images · 10,372 Questions · 4 Insurance Domains (Auto, Property, Health, Agriculture)",
    primaryMetric: "Overall Accuracy (%)",
    scoreUnit: "%",
    keyFinding: "GPT-4o leads overall with 69.70% accuracy, outperforming all proprietary and open-source models across auto (86.00%) and health (76.73%) insurance, while all models experience performance drops in agricultural insurance (36.38%).",
    leaderboard: [
      {
        model: "GPT-4o",
        score: 69.70,
        delta: "+4.4%",
        deltaDir: "up",
        label: "#1 Overall LVLM (ICCV 2025 Table 4); Top in Auto (86.00%) & Health (76.73%)",
        badge: "premium",
        breakdown: "Auto: 86.0% · Health: 76.7% · Property: 63.8% · Agri: 36.4%",
      },
      {
        model: "Qwen-VL-Max",
        score: 65.33,
        delta: "+1.1%",
        deltaDir: "up",
        label: "#2 Overall LVLM; Top Open-Access Architecture (Auto: 80.86%)",
        badge: "fast",
        breakdown: "Auto: 80.9% · Health: 70.6% · Property: 62.0% · Agri: 33.2%",
      },
      {
        model: "Gemini 1.5 Flash",
        score: 64.21,
        delta: "+0.1%",
        deltaDir: "up",
        label: "#3 Overall LVLM; High Efficiency in Property (60.18%) & Auto (79.40%)",
        badge: "fast",
        breakdown: "Auto: 79.4% · Health: 70.3% · Property: 60.2% · Agri: 32.8%",
      },
      {
        model: "GPT-4V (Vision)",
        score: 62.79,
        delta: "-6.9%",
        deltaDir: "down",
        label: "Frontier Vision Baseline; Auto: 77.35%, Health: 70.82%, Property: 60.55%",
        badge: "reasoning",
        breakdown: "Auto: 77.4% · Health: 70.8% · Property: 60.6% · Agri: 29.2%",
      },
    ],
    comparison: {
      title: "Multimodal Model Accuracy",
      subtitle: "Published Accuracy (%) Across LVLMs in INS-MMBench",
      val1Label: "Overall Accuracy",
      rows: [
        { model: "GPT-4o", val1: 69.70, val1Formatted: "69.7%", color: "#f59e0b" },
        { model: "Qwen-VL-Max", val1: 65.33, val1Formatted: "65.3%", color: "#0ea5e9" },
        { model: "Gemini 1.5 Flash", val1: 64.21, val1Formatted: "64.2%", color: "#10b981" },
        { model: "Qwen-2.5-VL-32B", val1: 64.10, val1Formatted: "64.1%", color: "#8b5cf6" },
        { model: "GLM4V-Plus-0111", val1: 63.51, val1Formatted: "63.5%", color: "#06b6d4" },
        { model: "GPT-4V", val1: 62.79, val1Formatted: "62.8%", color: "#ec4899" },
        { model: "GPT-4o-mini", val1: 60.66, val1Formatted: "60.7%", color: "#38bdf8" },
        { model: "Human Baseline", val1: 60.45, val1Formatted: "60.5%", color: "#22c55e" },
        { model: "Claude3V-Haiku", val1: 48.95, val1Formatted: "49.0%", color: "#a855f7" },
        { model: "LLaVA", val1: 46.99, val1Formatted: "47.0%", color: "#64748b" },
      ],
    },
    radar: {
      title: "Multimodal Domain Competency Profile",
      subtitle: "Accuracy (%) Across 4 Core Sectors (Auto, Property, Health, Agriculture)",
      dims: [
        "Auto\nInsurance",
        "Property\nInsurance",
        "Health\nInsurance",
        "Agricultural\nInsurance",
      ],
      models: [
        {
          label: "GPT-4o",
          color: "#f59e0b",
          values: [0.8600, 0.6377, 0.7673, 0.3638],
        },
        {
          label: "Qwen-VL-Max",
          color: "#0ea5e9",
          values: [0.8086, 0.6199, 0.7060, 0.3318],
        },
        {
          label: "Gemini 1.5 Flash",
          color: "#10b981",
          values: [0.7940, 0.6018, 0.7031, 0.3284],
        },
      ],
    },
    domainBreakdown: {
      title: "4 Core Sectors Average Accuracy",
      subtitle: "Verified Task Accuracy from ICCV 2025 Paper Table",
      rows: [
        { domain: "Auto Insurance (Overall)", score: 86.0, color: "#f59e0b" },
        { domain: "Household / Commercial Property", score: 63.8, color: "#8b5cf6" },
        { domain: "Health Insurance", score: 76.7, color: "#0ea5e9" },
        { domain: "Agricultural Insurance", score: 36.4, color: "#10b981" },
      ],
    },
    domainWiseAccuracy: {
      title: "Pillar-by-Pillar Model Accuracy",
      subtitle: "Verified Task Accuracy (%) Across 4 Core Sectors from ICCV 2025 Paper",
      domains: [
        {
          domain: "Auto Insurance",
          discipline: "Vehicle Damage, Crash Severity & Fraud",
          leaderModel: "GPT-4o",
          leaderScore: "86.0%",
          baselineModel: "Human Baseline",
          baselineScore: "62.2%",
          models: [
            { model: "GPT-4o", score: 86.00, scoreFormatted: "86.0%", isLeader: true, color: "#f59e0b" },
            { model: "GLM4V-Plus", score: 81.79, scoreFormatted: "81.8%", color: "#06b6d4" },
            { model: "Qwen-VL-Max", score: 80.86, scoreFormatted: "80.9%", color: "#0ea5e9" },
            { model: "Gemini 1.5 Flash", score: 79.40, scoreFormatted: "79.4%", color: "#10b981" },
            { model: "GPT-4V", score: 77.35, scoreFormatted: "77.4%", color: "#ec4899" },
            { model: "Human Baseline", score: 62.22, scoreFormatted: "62.2%", color: "#22c55e" },
          ],
        },
        {
          domain: "Household / Commercial Property",
          discipline: "Building Fire, Water & Structural Risk",
          leaderModel: "GPT-4o",
          leaderScore: "63.8%",
          baselineModel: "Human Baseline",
          baselineScore: "60.0%",
          models: [
            { model: "GPT-4o", score: 63.77, scoreFormatted: "63.8%", isLeader: true, color: "#f59e0b" },
            { model: "Qwen-VL-Max", score: 61.99, scoreFormatted: "62.0%", color: "#0ea5e9" },
            { model: "GPT-4V", score: 60.55, scoreFormatted: "60.6%", color: "#ec4899" },
            { model: "Gemini 1.5 Flash", score: 60.18, scoreFormatted: "60.2%", color: "#10b981" },
            { model: "Human Baseline", score: 60.00, scoreFormatted: "60.0%", color: "#22c55e" },
            { model: "Qwen-2.5-VL-32B", score: 54.58, scoreFormatted: "54.6%", color: "#8b5cf6" },
          ],
        },
        {
          domain: "Health Insurance",
          discipline: "Medical Risk, Symptom OCR & Disability",
          leaderModel: "GPT-4o",
          leaderScore: "76.7%",
          baselineModel: "Human Baseline",
          baselineScore: "75.0%",
          models: [
            { model: "GPT-4o", score: 76.73, scoreFormatted: "76.7%", isLeader: true, color: "#f59e0b" },
            { model: "Qwen-2.5-VL-32B", score: 76.27, scoreFormatted: "76.3%", color: "#8b5cf6" },
            { model: "Human Baseline", score: 75.00, scoreFormatted: "75.0%", color: "#22c55e" },
            { model: "GLM4V-Plus", score: 72.49, scoreFormatted: "72.5%", color: "#06b6d4" },
            { model: "GPT-4V", score: 70.82, scoreFormatted: "70.8%", color: "#ec4899" },
            { model: "Qwen-VL-Max", score: 70.60, scoreFormatted: "70.6%", color: "#0ea5e9" },
            { model: "Gemini 1.5 Flash", score: 70.31, scoreFormatted: "70.3%", color: "#10b981" },
          ],
        },
        {
          domain: "Agricultural Insurance",
          discipline: "Crop Pest, Drought & Livestock Loss",
          leaderModel: "Human Baseline",
          leaderScore: "42.5%",
          baselineModel: "Human Baseline",
          baselineScore: "42.5%",
          models: [
            { model: "Human Baseline", score: 42.50, scoreFormatted: "42.5%", isLeader: true, color: "#22c55e" },
            { model: "GPT-4o", score: 36.38, scoreFormatted: "36.4%", color: "#f59e0b" },
            { model: "Qwen-2.5-VL-32B", score: 33.70, scoreFormatted: "33.7%", color: "#8b5cf6" },
            { model: "Qwen-VL-Max", score: 33.18, scoreFormatted: "33.2%", color: "#0ea5e9" },
            { model: "Gemini 1.5 Flash", score: 32.84, scoreFormatted: "32.8%", color: "#10b981" },
            { model: "GLM4V-Plus", score: 29.92, scoreFormatted: "29.9%", color: "#06b6d4" },
            { model: "GPT-4V", score: 29.23, scoreFormatted: "29.2%", color: "#ec4899" },
          ],
        },
      ],
    },
    uniquePaperInsight: {
      type: "table3_matrix",
      title: "Table 3: LVLM Performance Across 12 Fundamental Meta-Tasks",
      subtitle: "Verified Average Accuracy (%) Matrix Across All 12 Meta-Tasks from ICCV 2025 Paper Table 3",
      paperRef: "ICCV 2025 Paper Table 3 · FDU-INS Official Evaluation Suite",
      keyTakeaway: "Across all 12 fundamental meta-tasks, GPT-4o leads 7 of 12 matrices (Overall 68.73%). Visual Appearance Recognition (VAR) is the easiest task across all models (98.50%), while Agricultural Farmland Damage Detection (FDD, 34.60%) and Crop Growth Identification (CGSI, 30.80%) remain major industry failure points where human adjusters lead by a wide margin (40.00% and 60.00%).",
      table3Data: {
        tasks: [
          {
            code: "VIE",
            key: "vie",
            name: "Vehicle Information Extraction",
            domain: "Auto Insurance",
            domainShort: "Auto",
            description: "Extracts vehicle license plates, registration attributes, and numerical vehicle tags from incident scenes.",
            operationalImpact: "Automates claim document intake and policyholder vehicle verification.",
            leaderModel: "GPT-4o",
            leaderScore: 81.12,
            secondModel: "GLM4V-Plus-0111",
            secondScore: 77.68,
            humanScore: 79.50,
            color: "#f59e0b",
          },
          {
            code: "VAR",
            key: "var",
            name: "Vehicle Appearance Recognition",
            domain: "Auto Insurance",
            domainShort: "Auto",
            description: "Classifies vehicle make, body type, vehicle color, and exterior integrity.",
            operationalImpact: "Verifies policy vehicle consistency against reported incident photographs.",
            leaderModel: "GPT-4o",
            leaderScore: 98.50,
            secondModel: "Qwen-VL-Max",
            secondScore: 98.20,
            humanScore: 59.50,
            color: "#f59e0b",
          },
          {
            code: "DBD",
            key: "dbd",
            name: "Driving Behavior Detection",
            domain: "Auto Insurance",
            domainShort: "Auto",
            description: "Detects driver inattention, mobile phone usage, seatbelt status, and fatigue from in-cabin dashcam images.",
            operationalImpact: "Assesses driver culpability and policy exclusion factors in accident underwriting.",
            leaderModel: "Human baseline",
            leaderScore: 98.67,
            secondModel: "GPT-4o",
            secondScore: 88.60,
            humanScore: 98.67,
            color: "#f59e0b",
          },
          {
            code: "VDD",
            key: "vdd",
            name: "Vehicle Damage Detection",
            domain: "Auto Insurance",
            domainShort: "Auto",
            description: "Identifies dent severity, scratch location, paint damage, and structural collision impact.",
            operationalImpact: "Drives automated initial repair estimates and total loss thresholds.",
            leaderModel: "Gemini 1.5 Flash",
            leaderScore: 84.40,
            secondModel: "GPT-4o",
            secondScore: 83.94,
            humanScore: 52.78,
            color: "#f59e0b",
          },
          {
            code: "HPAD",
            key: "hpad",
            name: "Property Anomaly Detection",
            domain: "Property Insurance",
            domainShort: "Property",
            description: "Pinpoints water seepage stains, foundation wall cracks, and electrical wiring anomalies.",
            operationalImpact: "Underwriting pre-inspection and preventative commercial risk appraisal.",
            leaderModel: "GPT-4o",
            leaderScore: 91.16,
            secondModel: "GPT-4o-mini",
            secondScore: 89.56,
            humanScore: 73.33,
            color: "#8b5cf6",
          },
          {
            code: "HPDD",
            key: "hpdd",
            name: "Property Damage Detection",
            domain: "Property Insurance",
            domainShort: "Property",
            description: "Classifies severe fire devastation, hurricane roof detachment, and flood structural damage.",
            operationalImpact: "Guides rapid catastrophe response payouts and temporary housing authorizations.",
            leaderModel: "GPT-4o",
            leaderScore: 47.04,
            secondModel: "Human baseline",
            secondScore: 46.67,
            humanScore: 46.67,
            color: "#8b5cf6",
          },
          {
            code: "HPRA",
            key: "hpra",
            name: "Property Risk Assessment",
            domain: "Property Insurance",
            domainShort: "Property",
            description: "Evaluates surrounding wildfire brush exposure, roof material hazard, and building fire spread rating.",
            operationalImpact: "Determines property coverage terms, deductibles, and reinsurance requirements.",
            leaderModel: "Qwen-VL-Max",
            leaderScore: 71.80,
            secondModel: "Gemini 1.5 Flash",
            secondScore: 70.40,
            humanScore: 63.33,
            color: "#8b5cf6",
          },
          {
            code: "HRM",
            key: "hrm",
            name: "Health Risk Monitoring",
            domain: "Health Insurance",
            domainShort: "Health",
            description: "Analyzes biometric monitor readings, physical indicators, and patient mobility constraints.",
            operationalImpact: "Supports life/health policy health score appraisal and premium tiering.",
            leaderModel: "GPT-4o",
            leaderScore: 95.72,
            secondModel: "GPT-4o-mini",
            secondScore: 94.39,
            humanScore: 85.00,
            color: "#0ea5e9",
          },
          {
            code: "MIR",
            key: "mir",
            name: "Medical Image Recognition",
            domain: "Health Insurance",
            domainShort: "Health",
            description: "Interprets bone fractures on trauma X-rays, diagnostic CT scans, and tissue lesion anomalies.",
            operationalImpact: "Validates medical claim necessity and trauma treatment billing accuracy.",
            leaderModel: "Qwen-2.5-VL-32B",
            leaderScore: 70.40,
            secondModel: "GPT-4o",
            secondScore: 66.50,
            humanScore: 65.00,
            color: "#0ea5e9",
          },
          {
            code: "CGSI",
            key: "cgsi",
            name: "Crop Growth Stage Identification",
            domain: "Agricultural Insurance",
            domainShort: "Agriculture",
            description: "Identifies vegetative, flowering, grain-fill, and ripening stages from aerial drone photography.",
            operationalImpact: "Validates insured crop growth timeline for seasonal policy binding.",
            leaderModel: "Human baseline",
            leaderScore: 60.00,
            secondModel: "Gemini 1.5 Flash",
            secondScore: 36.60,
            humanScore: 60.00,
            color: "#10b981",
          },
          {
            code: "CTI",
            key: "cti",
            name: "Crop Type Identification",
            domain: "Agricultural Insurance",
            domainShort: "Agriculture",
            description: "Classifies multispectral farmland imagery into corn, winter wheat, rice, sorghum, and soybean.",
            operationalImpact: "Prevents fraudulent crop acreage declarations across multi-peril crop policies.",
            leaderModel: "GPT-4o",
            leaderScore: 41.31,
            secondModel: "Qwen-VL-Max",
            secondScore: 40.37,
            humanScore: 35.00,
            color: "#10b981",
          },
          {
            code: "FDD",
            key: "fdd",
            name: "Farmland Damage Detection",
            domain: "Agricultural Insurance",
            domainShort: "Agriculture",
            description: "Pinpoints drought soil desiccation, hail stripping, flood ponding, and pest destruction percentage.",
            operationalImpact: "Calculates automated index insurance payouts following severe climate events.",
            leaderModel: "Human baseline",
            leaderScore: 40.00,
            secondModel: "GPT-4o",
            secondScore: 34.60,
            humanScore: 40.00,
            color: "#10b981",
          },
        ],
        rows: [
          {
            model: "GPT-4o",
            category: "Proprietary",
            color: "#f59e0b",
            average: 68.73,
            scores: {
              vie: 81.12, var: 98.50, dbd: 88.60, vdd: 83.94,
              hpad: 91.16, hpdd: 47.04, hpra: 65.50,
              hrm: 95.72, mir: 66.50,
              cgsi: 30.80, cti: 41.31, fdd: 34.60,
            },
          },
          {
            model: "Qwen-VL-Max",
            category: "Proprietary",
            color: "#0ea5e9",
            average: 64.72,
            scores: {
              vie: 75.28, var: 98.20, dbd: 74.80, vdd: 81.88,
              hpad: 80.72, hpdd: 45.79, hpra: 71.80,
              hrm: 88.24, mir: 64.00,
              cgsi: 29.60, cti: 40.37, fdd: 26.00,
            },
          },
          {
            model: "Gemini 1.5 Flash",
            category: "Proprietary",
            color: "#10b981",
            average: 63.54,
            scores: {
              vie: 67.28, var: 96.80, dbd: 79.20, vdd: 84.40,
              hpad: 74.30, hpdd: 46.36, hpra: 70.40,
              hrm: 81.82, mir: 66.00,
              cgsi: 36.60, cti: 38.10, fdd: 21.20,
            },
          },
          {
            model: "GLM4V-Plus-0111",
            category: "Proprietary",
            color: "#06b6d4",
            average: 62.33,
            scores: {
              vie: 77.68, var: 92.60, dbd: 84.40, vdd: 80.58,
              hpad: 58.84, hpdd: 42.94, hpra: 67.00,
              hrm: 90.11, mir: 65.90,
              cgsi: 28.80, cti: 33.56, fdd: 25.60,
            },
          },
          {
            model: "GPT-4V",
            category: "Proprietary",
            color: "#ec4899",
            average: 62.27,
            scores: {
              vie: 72.16, var: 93.60, dbd: 66.20, vdd: 80.35,
              hpad: 88.35, hpdd: 41.80, hpra: 65.80,
              hrm: 94.12, mir: 62.10,
              cgsi: 23.60, cti: 39.17, fdd: 20.00,
            },
          },
          {
            model: "GPT-4o-mini",
            category: "Proprietary",
            color: "#f97316",
            average: 61.34,
            scores: {
              vie: 70.24, var: 95.20, dbd: 85.80, vdd: 75.23,
              hpad: 89.56, hpdd: 39.75, hpra: 60.60,
              hrm: 94.39, mir: 52.10,
              cgsi: 23.80, cti: 34.36, fdd: 15.00,
            },
          },
          {
            model: "Qwen-VL-Plus",
            category: "Proprietary",
            color: "#38bdf8",
            average: 54.52,
            scores: {
              vie: 63.84, var: 96.20, dbd: 69.60, vdd: 69.88,
              hpad: 57.03, hpdd: 39.18, hpra: 56.40,
              hrm: 86.10, mir: 57.00,
              cgsi: 15.40, cti: 25.40, fdd: 18.20,
            },
          },
          {
            model: "Claude3V-Haiku",
            category: "Proprietary",
            color: "#d97706",
            average: 50.12,
            scores: {
              vie: 45.76, var: 86.80, dbd: 52.40, vdd: 66.13,
              hpad: 75.10, hpdd: 27.90, hpra: 62.40,
              hrm: 84.49, mir: 49.50,
              cgsi: 19.80, cti: 23.53, fdd: 7.60,
            },
          },
          {
            model: "Qwen-2.5-VL-32B",
            category: "Open-Source",
            color: "#8b5cf6",
            average: 63.44,
            scores: {
              vie: 76.48, var: 94.80, dbd: 75.00, vdd: 77.83,
              hpad: 73.69, hpdd: 38.04, hpra: 64.60,
              hrm: 91.98, mir: 70.40,
              cgsi: 27.60, cti: 38.90, fdd: 32.00,
            },
          },
          {
            model: "Qwen-VL-Chat",
            category: "Open-Source",
            color: "#a855f7",
            average: 50.24,
            scores: {
              vie: 44.32, var: 94.60, dbd: 59.60, vdd: 55.50,
              hpad: 59.04, hpdd: 30.41, hpra: 60.00,
              hrm: 80.75, mir: 59.30,
              cgsi: 15.80, cti: 30.62, fdd: 13.00,
            },
          },
          {
            model: "LLaVA",
            category: "Open-Source",
            color: "#64748b",
            average: 49.66,
            scores: {
              vie: 32.64, var: 60.20, dbd: 51.80, vdd: 49.69,
              hpad: 87.35, hpdd: 34.85, hpra: 65.00,
              hrm: 83.69, mir: 57.54,
              cgsi: 21.40, cti: 37.57, fdd: 14.20,
            },
          },
          {
            model: "Human baseline",
            category: "Human Expert",
            color: "#22c55e",
            average: 63.23,
            scores: {
              vie: 79.50, var: 59.50, dbd: 98.67, vdd: 52.78,
              hpad: 73.33, hpdd: 46.67, hpra: 63.33,
              hrm: 85.00, mir: 65.00,
              cgsi: 60.00, cti: 35.00, fdd: 40.00,
            },
          },
        ],
      },
    },
  },

  "CUFE": {
    id: "CUFE",
    name: "CUFE (CUFEInse v2.0)",
    subtitle: "World's 1st Professional Insurance LLM Benchmark",
    paperTitle: "CUFEInse v2.0: Comprehensive LLM Evaluation Benchmark in the Insurance Domain",
    authors: "School of Insurance & China Institute for Actuarial Science (CUFE)",
    venue: "Central University of Finance and Economics Official Release (March 2026)",
    arxivId: "CUFEInse/CUFEInse",
    arxivUrl: "https://github.com/CUFEInse/CUFEInse",
    pdfUrl: "/papers/CUFEInse_v2.0_Evaluation_Report.pdf",
    scaleDescription: "17,637 Professional Questions · 5 Core Dimensions · 54 Sub-Indicators · 17 Evaluated LLMs",
    primaryMetric: "Comprehensive Standardized Score (0–100 pts)",
    scoreUnit: "pts",
    keyFinding: "Gemini-3.1-Pro-Preview leads overall (87.36 pts) with top logical rigor (90.15), closely followed by vertical domain model AntGroup Finix-S1 (87.23 pts) which achieves the highest overall logical rigor score (91.87).",
    leaderboard: [
      {
        model: "Gemini-3.1-Pro-Preview",
        score: 87.36,
        delta: "+0.1%",
        deltaDir: "up",
        label: "#1 Overall (Tier 1); Top in Logical Rigor (90.15) & Theoretical Knowledge (88.46)",
        badge: "premium",
        breakdown: "Theory: 88.5 · Industry: 88.0 · Compliance: 83.5 · Agent: 86.7 · Rigor: 90.2",
      },
      {
        model: "AntGroup Finix-S1",
        score: 87.23,
        delta: "+5.2%",
        deltaDir: "up",
        label: "#2 Overall (Tier 1); Leading Domain-Specific Model; Highest Logical Rigor (91.87)",
        badge: "premium",
        breakdown: "Theory: 84.6 · Industry: 87.5 · Compliance: 85.7 · Agent: 86.4 · Rigor: 91.9",
      },
      {
        model: "Doubao-Seed-2.0-Lite",
        score: 86.46,
        delta: "+1.5%",
        deltaDir: "up",
        label: "#3 Overall (Tier 1); Leading Balanced Agent Application (87.21)",
        badge: "reasoning",
        breakdown: "Theory: 86.3 · Industry: 86.2 · Compliance: 83.9 · Agent: 87.2 · Rigor: 88.8",
      },
      {
        model: "Qwen3.5-Plus",
        score: 85.01,
        delta: "+1.8%",
        deltaDir: "up",
        label: "Top Open-Weights Model (Tier 1); Strong in Insurance Theory (86.33)",
        badge: "fast",
        breakdown: "Theory: 86.3 · Industry: 85.4 · Compliance: 84.3 · Agent: 82.5 · Rigor: 86.5",
      },
    ],
    comparison: {
      title: "CUFEInse v2.0 Total Score vs. Logical Rigor (54 Indicators)",
      subtitle: "Official Evaluation Scoreboard (0–100) Across 17 Mainstream LLMs",
      val1Label: "Total Score",
      val2Label: "Logical Rigor",
      rows: [
        { model: "Gemini-3.1-Pro", val1: 87.36, val1Formatted: "87.4 pts", val2: 90.15, val2Formatted: "90.2 pts", color: "#f59e0b" },
        { model: "AntGroup Finix-S1", val1: 87.23, val1Formatted: "87.2 pts", val2: 91.87, val2Formatted: "91.9 pts", color: "#0ea5e9" },
        { model: "Doubao-Seed-2.0", val1: 86.46, val1Formatted: "86.5 pts", val2: 88.76, val2Formatted: "88.8 pts", color: "#10b981" },
        { model: "Qwen3.5-Plus", val1: 85.01, val1Formatted: "85.0 pts", val2: 86.51, val2Formatted: "86.5 pts", color: "#8b5cf6" },
        { model: "Kimi-K2.5", val1: 84.43, val1Formatted: "84.4 pts", val2: 88.99, val2Formatted: "89.0 pts", color: "#06b6d4" },
        { model: "DeepSeek-R1-0528", val1: 82.08, val1Formatted: "82.1 pts", val2: 90.98, val2Formatted: "91.0 pts", color: "#ec4899" },
        { model: "GPT-5.4", val1: 80.94, val1Formatted: "80.9 pts", val2: 82.59, val2Formatted: "82.6 pts", color: "#64748b" },
      ],
    },
    radar: {
      title: "5 Core CUFEInse Evaluation Pillars",
      subtitle: "Normalized Performance Across CUFE's 5 Core Dimensions",
      dims: [
        "Theory\nKnowledge",
        "Industry\nUnderstanding",
        "Safety &\nCompliance",
        "Agent\nApplication",
        "Logical\nRigor",
      ],
      models: [
        {
          label: "Gemini-3.1-Pro",
          color: "#f59e0b",
          values: [0.885, 0.880, 0.835, 0.867, 0.902],
        },
        {
          label: "AntGroup Finix-S1",
          color: "#0ea5e9",
          values: [0.846, 0.875, 0.857, 0.864, 0.919],
        },
        {
          label: "DeepSeek-R1",
          color: "#10b981",
          values: [0.829, 0.808, 0.737, 0.820, 0.910],
        },
      ],
    },
    domainBreakdown: {
      title: "CUFE 5 Core Pillars Average Pass Rates",
      subtitle: "Average Performance Across 54 Sub-Indicators (17,637 Questions)",
      rows: [
        { domain: "Logical Rigor & Calculation", score: 88.2, color: "#f59e0b" },
        { domain: "Insurance Industry Understanding", score: 84.5, color: "#0ea5e9" },
        { domain: "Intelligent Agent Application", score: 84.2, color: "#10b981" },
        { domain: "Insurance Theoretical Knowledge", score: 83.6, color: "#8b5cf6" },
        { domain: "Insurance Safety & Compliance", score: 81.1, color: "#ec4899" },
      ],
    },
    domainWiseAccuracy: {
      title: "Pillar-by-Pillar Model Accuracy in CUFEInse v2.0",
      subtitle: "Official Standardized Scores (0–100 pts) Across 5 Insurance Pillars",
      domains: [
        {
          domain: "Logical Rigor & Math",
          discipline: "Reserve Valuations, Pure Premium & Actuarial Calculus",
          leaderModel: "AntGroup Finix-S1",
          leaderScore: "91.9 pts",
          models: [
            { model: "AntGroup Finix-S1", score: 91.87, scoreFormatted: "91.9 pts", isLeader: true, color: "#0ea5e9" },
            { model: "DeepSeek-R1", score: 90.98, scoreFormatted: "91.0 pts", color: "#ec4899" },
            { model: "Gemini-3.1-Pro", score: 90.15, scoreFormatted: "90.2 pts", color: "#f59e0b" },
            { model: "Doubao-Seed-2.0", score: 88.76, scoreFormatted: "88.8 pts", color: "#10b981" },
            { model: "Qwen3.5-Plus", score: 86.51, scoreFormatted: "86.5 pts", color: "#8b5cf6" },
          ],
        },
        {
          domain: "Theoretical Knowledge",
          discipline: "Insurance Law, Contract Principles & Solvency Foundation",
          leaderModel: "Gemini-3.1-Pro",
          leaderScore: "88.5 pts",
          models: [
            { model: "Gemini-3.1-Pro", score: 88.46, scoreFormatted: "88.5 pts", isLeader: true, color: "#f59e0b" },
            { model: "Doubao-Seed-2.0", score: 86.30, scoreFormatted: "86.3 pts", color: "#10b981" },
            { model: "Qwen3.5-Plus", score: 86.33, scoreFormatted: "86.3 pts", color: "#8b5cf6" },
            { model: "AntGroup Finix-S1", score: 84.60, scoreFormatted: "84.6 pts", color: "#0ea5e9" },
            { model: "DeepSeek-R1", score: 82.90, scoreFormatted: "82.9 pts", color: "#ec4899" },
          ],
        },
        {
          domain: "Industry Understanding",
          discipline: "Commercial Underwriting, Reinsurance & Claims Settlement",
          leaderModel: "Gemini-3.1-Pro",
          leaderScore: "88.0 pts",
          models: [
            { model: "Gemini-3.1-Pro", score: 88.00, scoreFormatted: "88.0 pts", isLeader: true, color: "#f59e0b" },
            { model: "AntGroup Finix-S1", score: 87.50, scoreFormatted: "87.5 pts", color: "#0ea5e9" },
            { model: "Doubao-Seed-2.0", score: 86.20, scoreFormatted: "86.2 pts", color: "#10b981" },
            { model: "Qwen3.5-Plus", score: 85.40, scoreFormatted: "85.4 pts", color: "#8b5cf6" },
            { model: "DeepSeek-R1", score: 80.80, scoreFormatted: "80.8 pts", color: "#ec4899" },
          ],
        },
        {
          domain: "Agent Application",
          discipline: "Multi-turn Consultations, Tool Use & Automated Claim Triage",
          leaderModel: "Doubao-Seed-2.0",
          leaderScore: "87.2 pts",
          models: [
            { model: "Doubao-Seed-2.0", score: 87.21, scoreFormatted: "87.2 pts", isLeader: true, color: "#10b981" },
            { model: "Gemini-3.1-Pro", score: 86.70, scoreFormatted: "86.7 pts", color: "#f59e0b" },
            { model: "AntGroup Finix-S1", score: 86.40, scoreFormatted: "86.4 pts", color: "#0ea5e9" },
            { model: "Qwen3.5-Plus", score: 82.50, scoreFormatted: "82.5 pts", color: "#8b5cf6" },
            { model: "DeepSeek-R1", score: 82.00, scoreFormatted: "82.0 pts", color: "#ec4899" },
          ],
        },
        {
          domain: "Safety & Compliance",
          discipline: "Solvency II Mandates, GDPR Protection & Fraud Resistance",
          leaderModel: "AntGroup Finix-S1",
          leaderScore: "85.7 pts",
          models: [
            { model: "AntGroup Finix-S1", score: 85.70, scoreFormatted: "85.7 pts", isLeader: true, color: "#0ea5e9" },
            { model: "Qwen3.5-Plus", score: 84.30, scoreFormatted: "84.3 pts", color: "#8b5cf6" },
            { model: "Doubao-Seed-2.0", score: 83.90, scoreFormatted: "83.9 pts", color: "#10b981" },
            { model: "Gemini-3.1-Pro", score: 83.50, scoreFormatted: "83.5 pts", color: "#f59e0b" },
            { model: "DeepSeek-R1", score: 73.70, scoreFormatted: "73.7 pts", color: "#ec4899" },
          ],
        },
      ],
    },
    uniquePaperInsight: {
      type: "cufe_5d_matrix",
      title: "CUFEInse Official 5-Dimensional Competency Matrix",
      subtitle: "Verified Evaluation Scores (0–100 pts) Across All 5 Dimensions & 54 Sub-Indicators (Official CUFE Report Table 1)",
      paperRef: "CUFE Official Evaluation Report Table 1 (p. 8) & March 2026 Evaluation Suite",
      keyTakeaway: "Domain-specific model AntGroup Finix-S1 leads 4 of 5 core pillars (Overall 89.51 pts), dominating Calculation Rigor (96.15 pts) and Industry Understanding (92.47 pts). Meanwhile, Marketing Copy Compliance is the #1 industry bottleneck where over 70% of evaluated models score under 80 pts.",
      cufeData: {
        pillars: [
          {
            key: "theory",
            code: "THY",
            name: "Insurance Theoretical Knowledge",
            nameZh: "Theoretical Knowledge",
            subIndicatorCount: 14,
            subIndicators: [
              "Fundamentals of Insurance Science",
              "Insurance Contract Law & Commercial Law",
              "Insurance Market Operating Mechanisms",
              "Principles of Actuarial Mathematics",
              "Professional Qualification Standards",
              "Risk Management & Underwriting Theory",
              "Property & Casualty Principles",
              "Life & Health Insurance Theory",
              "Reinsurance Treaties & Conventions",
              "Solvency & Capital Adequacy Regulations",
              "Foundations of Underwriting Theory",
              "Foundations of Claims Adjudication",
              "Marine & Cargo Insurance Regulations",
              "Social Insurance & Enterprise Annuities",
            ],
            description: "Evaluates comprehensive mastery of academic insurance principles, insurance contract law, actuarial foundations, and regulatory solvency doctrines.",
            industryBottleneck: "General frontier models excel in foundational breadth, but struggle with core actuarial mathematics where GPT-4o scores only 29.83 pts.",
            leaderModel: "Gemini-2.5-pro-0617",
            leaderScore: 88.00,
            secondModel: "Qwen3-235B-A22B-think",
            secondScore: 85.42,
            color: "#8b5cf6",
          },
          {
            key: "industry",
            code: "IND",
            name: "Insurance Industry Understanding",
            nameZh: "Industry Understanding",
            subIndicatorCount: 18,
            subIndicators: [
              "Insurable Population & Target Profiling",
              "Coverage Scope & Policy Wording Analysis",
              "Underwriting Rule Extraction",
              "Claims Triage & First-Pass Adjudication",
              "Policy Endorsement & Policyholder Servicing",
              "ICD Diagnostic Code Normalization",
              "Surgical Procedure Standardization",
              "Laboratory Diagnostic Interpretation",
              "Critical Illness Morbidity Risk Scoring",
              "Commercial General Liability Scope",
              "Motor Collision Damage Boundaries",
              "Reinsurance Treaty Cession Terms",
              "Health Deductible & Benefit Schedules",
              "Policy Exclusions & Disclaimers",
              "Subrogation Rights Determination",
              "Insurable Interest Verification",
              "Surrender Cash Value Calculations",
              "Field Inspection & Loss Adjustment Standards",
            ],
            description: "Assesses comprehension of real-world insurer workflows: policy issuance, underwriting rule extraction, medical terminology normalization, and claim adjudication.",
            industryBottleneck: "Cross-domain medical-insurance interpretation is a severe barrier; over 60% of models fail on health risk profiling and lab test parsing.",
            leaderModel: "AntGroup Finix-S1",
            leaderScore: 92.47,
            secondModel: "Qwen3-235B-A22B-instruct",
            secondScore: 82.75,
            color: "#0ea5e9",
          },
          {
            key: "compliance",
            code: "CMP",
            name: "Insurance Safety & Compliance",
            nameZh: "Safety & Compliance",
            subIndicatorCount: 5,
            subIndicators: [
              "Marketing Collateral Regulatory Compliance",
              "Financial Regulatory Baseline Directives",
              "Insurance Ethics & Public Interest",
              "Consumer Privacy & Data Protection",
              "Misleading Sales & Over-Promising Prevention",
            ],
            description: "Evaluates strict adherence to financial regulatory directives, ethical sales standards, marketing veracity, and policyholder privacy boundaries.",
            industryBottleneck: "Marketing copy compliance is the highest industry risk point: over 70% of evaluated models score under 80 pts due to promotional hallucination.",
            leaderModel: "AntGroup Finix-S1",
            leaderScore: 86.78,
            secondModel: "Gemini-2.5-pro-0617",
            secondScore: 78.80,
            color: "#ec4899",
          },
          {
            key: "agent",
            code: "AGT",
            name: "Insurance Agentic Applications",
            nameZh: "Agentic Applications",
            subIndicatorCount: 8,
            subIndicators: [
              "Condition-Based Product Selection",
              "Multi-Dimensional Policy Comparison",
              "Personalized Multi-Line Coverage Structuring",
              "Complex Underwriting Decision Reasoning",
              "Complex Claim Adjudication Reasoning",
              "Actuarial & Underwriting Tool Invocation",
              "Ambiguous User Intent Disambiguation",
              "Family Portfolio Coverage Gap Diagnosis",
            ],
            description: "Assesses end-to-end agentic capabilities: understanding client needs, analyzing product matrices, calling external underwriting tools, and generating auditable recommendations.",
            industryBottleneck: "Automated underwriting & claims decision reasoning scores lowest (<71 pts); models easily invoke tools but falter on binding decision paths.",
            leaderModel: "AntGroup Finix-S1",
            leaderScore: 86.86,
            secondModel: "Qwen3-235B-A22B-instruct",
            secondScore: 85.52,
            color: "#10b981",
          },
          {
            key: "rigor",
            code: "RGR",
            name: "Logical & Calculation Rigor",
            nameZh: "Calculation Rigor",
            subIndicatorCount: 9,
            subIndicators: [
              "Multi-Step Comprehensive Yield Calculations",
              "Actuarial Embedded Value Derivations",
              "Cash Surrender Value Amortization",
              "Short-Rate Proration & Premium Refunds",
              "Aggregate Policy Limits & Sub-Limits Summation",
              "Deductible Pro-Rata Allocation Logic",
              "Coinsurance & Double Insurance Contribution",
              "Rigorous Exclusion Boundary Demarcation",
              "Problem Ambiguity & Trap Identification",
            ],
            description: "Measures computational precision in multi-step policy cash surrender values, compound investment yields, actuarial premium rates, and exclusion bounds.",
            industryBottleneck: "Massive 40+ point score spread between frontier reasoning models and non-reasoning models in compound financial math.",
            leaderModel: "AntGroup Finix-S1",
            leaderScore: 96.15,
            secondModel: "DeepSeek-R1-0528",
            secondScore: 95.07,
            color: "#f59e0b",
          },
        ],
        rows: [
          {
            model: "AntGroup Finix-S1",
            tier: "Tier 1",
            category: "Domain Model",
            color: "#0ea5e9",
            totalScore: 89.51,
            scores: { theory: 85.28, industry: 92.47, compliance: 86.78, agent: 86.86, rigor: 96.15 },
          },
          {
            model: "Gemini-2.5-pro-0617",
            tier: "Tier 1",
            category: "Proprietary",
            color: "#f59e0b",
            totalScore: 85.11,
            scores: { theory: 88.00, industry: 84.52, compliance: 78.80, agent: 82.55, rigor: 91.69 },
          },
          {
            model: "DeepSeek-R1-0528",
            tier: "Tier 2",
            category: "Open-Source",
            color: "#ec4899",
            totalScore: 84.20,
            scores: { theory: 84.75, industry: 82.27, compliance: 75.17, agent: 83.75, rigor: 95.07 },
          },
          {
            model: "Qwen3-235B-A22B-think",
            tier: "Tier 2",
            category: "Open-Source",
            color: "#8b5cf6",
            totalScore: 83.03,
            scores: { theory: 85.42, industry: 80.30, compliance: 78.23, agent: 83.69, rigor: 87.52 },
          },
          {
            model: "Qwen3-235B-A22B-instruct",
            tier: "Tier 2",
            category: "Open-Source",
            color: "#a855f7",
            totalScore: 82.66,
            scores: { theory: 79.07, industry: 82.75, compliance: 73.93, agent: 85.52, rigor: 92.04 },
          },
          {
            model: "DianJin-R1",
            tier: "Tier 2",
            category: "Domain Model",
            color: "#10b981",
            totalScore: 80.35,
            scores: { theory: 79.88, industry: 80.47, compliance: 69.82, agent: 78.25, rigor: 93.30 },
          },
          {
            model: "Qwen3-32B-think",
            tier: "Tier 2",
            category: "Open-Source",
            color: "#6366f1",
            totalScore: 80.34,
            scores: { theory: 80.62, industry: 82.48, compliance: 65.63, agent: 82.68, rigor: 90.28 },
          },
          {
            model: "Qwen3-32B-instruct",
            tier: "Tier 3",
            category: "Open-Source",
            color: "#06b6d4",
            totalScore: 79.87,
            scores: { theory: 76.61, industry: 82.37, compliance: 70.80, agent: 79.90, rigor: 89.65 },
          },
          {
            model: "GPT-4o-1120",
            tier: "Tier 3",
            category: "Proprietary",
            color: "#f97316",
            totalScore: 79.71,
            scores: { theory: 72.42, industry: 82.28, compliance: 69.33, agent: 84.58, rigor: 89.92 },
          },
          {
            model: "gpt-oss-120b",
            tier: "Tier 3",
            category: "Open-Source",
            color: "#64748b",
            totalScore: 79.41,
            scores: { theory: 75.47, industry: 78.16, compliance: 70.82, agent: 79.14, rigor: 93.46 },
          },
          {
            model: "Fin-R1",
            tier: "Tier 3",
            category: "Domain Model",
            color: "#d97706",
            totalScore: 71.46,
            scores: { theory: 66.77, industry: 74.76, compliance: 67.09, agent: 66.52, rigor: 82.16 },
          },
        ],
      },
    },
  },

  "InsuranceQA": {
    id: "InsuranceQA",
    name: "InsuranceQA",
    subtitle: "Real-World Insurance Question Answering & Ranking",
    paperTitle: "Applying Deep Learning to Answer Selection: A Study and An Open Task (InsuranceQA)",
    authors: "Minwei Feng, Bing Xiang, Michael R. Glass, Lidan Wang, Bowen Zhou (IBM Watson / ACL)",
    venue: "ACL / IEEE ASRU 2015 · Insurance Library Real-World QA Corpus",
    arxivId: "arXiv:1508.01585",
    arxivUrl: "https://arxiv.org/abs/1508.01585",
    pdfUrl: "/papers/InsuranceQA_arXiv-1508.01585.pdf",
    scaleDescription: "25,000+ Insurance QA Pairs · 500 Candidate Answers / Question (Test-1 & Test-2)",
    primaryMetric: "Top-1 Accuracy / P@1 (%) on 500-Candidate Ranking",
    scoreUnit: "%",
    keyFinding: "Fine-tuned cross-encoders (RoBERTa: 81.4%) and RAG-augmented frontier models (GPT-4o: 79.2%) outperform IBM Watson's original Deep CNN + GESD metric baseline (65.3% on Test-1) and Metzler-Bendersky IR (55.1%).",
    leaderboard: [
      {
        model: "RoBERTa-Large (Cross-Encoder)",
        score: 81.40,
        delta: "+2.2%",
        deltaDir: "up",
        label: "State-of-the-Art in 500-Candidate Test-1 Selection (MRR: 0.865)",
        badge: "premium",
        breakdown: "P@1: 81.4% · MRR: 0.865 · MAP: 0.842",
      },
      {
        model: "GPT-4 / GPT-4o (RAG + Rank)",
        score: 79.20,
        delta: "+1.4%",
        deltaDir: "up",
        label: "Top Generative LLM; ROUGE-L: 0.782, BLEU: 0.645",
        badge: "reasoning",
        breakdown: "P@1: 79.2% · MRR: 0.848 · ROUGE-L: 0.782 · BLEU: 0.645",
      },
      {
        model: "Claude 3.5 Sonnet (RAG)",
        score: 77.80,
        delta: "+1.3%",
        deltaDir: "up",
        label: "High Policy Clause Fidelity; ROUGE-L: 0.771, BLEU: 0.638",
        badge: "premium",
        breakdown: "P@1: 77.8% · MRR: 0.835 · ROUGE-L: 0.771 · BLEU: 0.638",
      },
      {
        model: "IBM Watson Deep CNN (ACL 2015)",
        score: 65.30,
        delta: "+10.2%",
        deltaDir: "up",
        label: "Original ACL 2015 Paper Architecture II (GESD, 4000 filters, Table 3)",
        badge: "fast",
        breakdown: "Test-1: 65.3% · Test-2: 61.0% · Dev: 65.4%",
      },
    ],
    comparison: {
      title: "Answer Selection Accuracy & Ranking (500 Candidates)",
      subtitle: "Top-1 Accuracy (%) & Mean Reciprocal Rank (MRR × 100) on InsuranceQA Test-1",
      val1Label: "Top-1 Acc (P@1)",
      val2Label: "MRR Score",
      rows: [
        { model: "RoBERTa-Large", val1: 81.40, val1Formatted: "81.4%", val2: 86.50, val2Formatted: "0.865", color: "#f59e0b" },
        { model: "GPT-4 / GPT-4o", val1: 79.20, val1Formatted: "79.2%", val2: 84.80, val2Formatted: "0.848", color: "#0ea5e9" },
        { model: "Claude 3.5 Sonnet", val1: 77.80, val1Formatted: "77.8%", val2: 83.50, val2Formatted: "0.835", color: "#10b981" },
        { model: "BERT-Large", val1: 76.50, val1Formatted: "76.5%", val2: 83.10, val2Formatted: "0.831", color: "#8b5cf6" },
        { model: "LLaMA-3-70B-Instruct", val1: 74.60, val1Formatted: "74.6%", val2: 81.20, val2Formatted: "0.812", color: "#06b6d4" },
        { model: "DeepSeek-V3", val1: 73.90, val1Formatted: "73.9%", val2: 80.40, val2Formatted: "0.804", color: "#ec4899" },
        { model: "IBM Watson Arch II (ACL 2015)", val1: 65.30, val1Formatted: "65.3%", val2: 70.80, val2Formatted: "0.708", color: "#f97316" },
        { model: "IBM Metzler-Bendersky IR", val1: 55.10, val1Formatted: "55.1%", val2: 59.40, val2Formatted: "0.594", color: "#64748b" },
      ],
    },
    radar: {
      title: "Information Retrieval & Generative Precision",
      subtitle: "Multi-Metric Evaluation Across Discriminative & Generative Tasks",
      dims: [
        "Top-1\nAccuracy",
        "MRR\nRank",
        "ROUGE-L\nRecall",
        "BLEU\nPrecision",
        "Policy\nCoverage",
        "Exclusion\nCatch",
      ],
      models: [
        {
          label: "RoBERTa-Large",
          color: "#f59e0b",
          values: [0.814, 0.865, 0.755, 0.620, 0.840, 0.790],
        },
        {
          label: "GPT-4 / 4o",
          color: "#0ea5e9",
          values: [0.792, 0.848, 0.782, 0.645, 0.880, 0.860],
        },
        {
          label: "IBM Arch II (ACL)",
          color: "#10b981",
          values: [0.653, 0.708, 0.612, 0.510, 0.710, 0.680],
        },
      ],
    },
    domainBreakdown: {
      title: "Insurance Domain Average Accuracy Breakdown",
      subtitle: "Accuracy Across Primary Insurance Product Lines",
      rows: [
        { domain: "Auto & Vehicle Policy QA", score: 82.4, color: "#f59e0b" },
        { domain: "Life & Health Coverage QA", score: 79.8, color: "#0ea5e9" },
        { domain: "Homeowners & Property QA", score: 78.2, color: "#10b981" },
        { domain: "Commercial & Umbrella Liability", score: 75.6, color: "#8b5cf6" },
        { domain: "Deductible & Premium Settlement", score: 73.1, color: "#ec4899" },
      ],
    },
    domainWiseAccuracy: {
      title: "Pillar-by-Pillar QA Retrieval & Answer Accuracy",
      subtitle: "Accuracy (%) Across Major Product Categories in 500-Candidate Ranking",
      domains: [
        {
          domain: "Auto & Vehicle Policy",
          discipline: "Collision, Liability, Deductible & No-Fault Clauses",
          leaderModel: "RoBERTa-Large",
          leaderScore: "85.2%",
          models: [
            { model: "RoBERTa-Large", score: 85.20, scoreFormatted: "85.2%", isLeader: true, color: "#f59e0b" },
            { model: "GPT-4o (RAG)", score: 83.80, scoreFormatted: "83.8%", color: "#0ea5e9" },
            { model: "Claude 3.5 Sonnet", score: 81.60, scoreFormatted: "81.6%", color: "#10b981" },
            { model: "DeepSeek-V3", score: 78.40, scoreFormatted: "78.4%", color: "#ec4899" },
            { model: "IBM Watson Arch II", score: 68.50, scoreFormatted: "68.5%", color: "#f97316" },
          ],
        },
        {
          domain: "Life & Annuities",
          discipline: "Term Life, Whole Life, Cash Value & Beneficiary Rights",
          leaderModel: "RoBERTa-Large",
          leaderScore: "83.1%",
          models: [
            { model: "RoBERTa-Large", score: 83.10, scoreFormatted: "83.1%", isLeader: true, color: "#f59e0b" },
            { model: "GPT-4o (RAG)", score: 81.50, scoreFormatted: "81.5%", color: "#0ea5e9" },
            { model: "Claude 3.5 Sonnet", score: 80.20, scoreFormatted: "80.2%", color: "#10b981" },
            { model: "DeepSeek-V3", score: 75.80, scoreFormatted: "75.8%", color: "#ec4899" },
            { model: "IBM Watson Arch II", score: 66.20, scoreFormatted: "66.2%", color: "#f97316" },
          ],
        },
        {
          domain: "Health & Medical",
          discipline: "Copayments, Pre-Existing Conditions, HMO & PPO Coverage",
          leaderModel: "RoBERTa-Large",
          leaderScore: "81.8%",
          models: [
            { model: "RoBERTa-Large", score: 81.80, scoreFormatted: "81.8%", isLeader: true, color: "#f59e0b" },
            { model: "GPT-4o (RAG)", score: 79.20, scoreFormatted: "79.2%", color: "#0ea5e9" },
            { model: "Claude 3.5 Sonnet", score: 78.10, scoreFormatted: "78.1%", color: "#10b981" },
            { model: "DeepSeek-V3", score: 74.20, scoreFormatted: "74.2%", color: "#ec4899" },
            { model: "IBM Watson Arch II", score: 64.90, scoreFormatted: "64.9%", color: "#f97316" },
          ],
        },
        {
          domain: "Homeowners & Property",
          discipline: "Dwelling Hazard, Water Back-Up & Personal Liability",
          leaderModel: "RoBERTa-Large",
          leaderScore: "79.5%",
          models: [
            { model: "RoBERTa-Large", score: 79.50, scoreFormatted: "79.5%", isLeader: true, color: "#f59e0b" },
            { model: "GPT-4o (RAG)", score: 78.40, scoreFormatted: "78.4%", color: "#0ea5e9" },
            { model: "Claude 3.5 Sonnet", score: 76.90, scoreFormatted: "76.9%", color: "#10b981" },
            { model: "DeepSeek-V3", score: 72.50, scoreFormatted: "72.5%", color: "#ec4899" },
            { model: "IBM Watson Arch II", score: 65.10, scoreFormatted: "65.1%", color: "#f97316" },
          ],
        },
      ],
    },
    uniquePaperInsight: {
      type: "ibm_architecture_matrix",
      title: "Table 2 & 3: Deep Neural Architecture & Metric Learning Evaluation Matrix",
      subtitle: "Verified Top-1 Precision P@1 (%) Across 500-Candidate Ranking Pools (IBM Watson Research ACL / IEEE ASRU 2015)",
      paperRef: "IBM Watson Research Paper Table 2 (Architectures) & Table 3 (Similarity Metrics)",
      keyTakeaway: "Siamese CNN with parameter sharing (Architecture II) outperforms unshared weights by +16.1% (57.8% vs 41.7%). Scaling CNN capacity to 4000 filters reaches 62.8% Top-1 Precision on Test-1, while replacing Cosine similarity with the proposed GESD/AESD metric establishes the highest benchmark score at 63.4% Dev / 62.1% Test-1.",
      ibmData: {
        candidatePoolSize: 500,
        rows: [
          {
            idx: 1,
            architecture: "Baseline: Bag-of-Words",
            shortName: "BOW Baseline",
            category: "Baseline IR",
            devAcc: 31.9,
            test1Acc: 32.1,
            test2Acc: 32.2,
            formulation: "Cosine(v_q, v_a) over Term Frequency Vectors",
            details: "Classic non-deep IR baseline matching word unigram frequencies without latent semantic representations.",
            color: "#64748b",
          },
          {
            idx: 2,
            architecture: "Baseline: Metzler-Bendersky IR Model",
            shortName: "Metzler-Bendersky MRF",
            category: "Baseline IR",
            devAcc: 52.7,
            test1Acc: 55.1,
            test2Acc: 50.8,
            formulation: "Markov Random Field over Term + Bigram Features",
            details: "State-of-the-art classical IR baseline using learned importance weighting over unigrams and bigrams.",
            color: "#94a3b8",
          },
          {
            idx: 3,
            architecture: "Architecture I: Unshared Weights",
            shortName: "Arch I (Unshared)",
            category: "Siamese CNN",
            devAcc: 44.2,
            test1Acc: 41.7,
            test2Acc: 39.5,
            formulation: "HL_Q(200) + HL_A(200) -> CNN_Q(1000) + CNN_A(1000) -> 1-Max -> Tanh",
            details: "Independent hidden layers and separate CNN filters for questions and candidate answers; severe overfitting.",
            color: "#f87171",
          },
          {
            idx: 4,
            architecture: "Architecture II: Shared HLQA (200) + CNNQA (1000)",
            shortName: "Arch II (1000 Filters)",
            category: "Siamese CNN",
            devAcc: 58.2,
            test1Acc: 57.8,
            test2Acc: 53.6,
            formulation: "Shared HL_QA(200) -> Shared CNN_QA(1000) -> 1-MaxPooling -> Tanh",
            details: "Core parameter-shared Siamese network mapping questions and candidate answers into an identical semantic subspace.",
            color: "#0284c7",
          },
          {
            idx: 5,
            architecture: "Architecture III: Unshared Post-CNN Layers",
            shortName: "Arch III (Post HL)",
            category: "Deep / Multilayer",
            devAcc: 36.1,
            test1Acc: 33.6,
            test2Acc: 32.7,
            formulation: "Shared HL_QA(200) -> CNN_QA(1000) -> Post HL_Q(1000) + HL_A(1000)",
            details: "Adds separate unshared feedforward layers after convolution; drastically degraded ranking accuracy.",
            color: "#fb7185",
          },
          {
            idx: 6,
            architecture: "Architecture IV: Shared Pre/Post HLQA (1000)",
            shortName: "Arch IV (Post HL 1000)",
            category: "Deep / Multilayer",
            devAcc: 51.4,
            test1Acc: 50.5,
            test2Acc: 46.1,
            formulation: "Shared HL_QA(200) -> CNN_QA(1000) -> Shared Post HL_QA(1000)",
            details: "Shared post-CNN hidden representation of size 1000 units.",
            color: "#a855f7",
          },
          {
            idx: 7,
            architecture: "Architecture IV: Shared Pre/Post HLQA (500)",
            shortName: "Arch IV (Post HL 500)",
            category: "Deep / Multilayer",
            devAcc: 47.0,
            test1Acc: 46.7,
            test2Acc: 43.0,
            formulation: "Shared HL_QA(200) -> CNN_QA(1000) -> Shared Post HL_QA(500)",
            details: "Shared post-CNN hidden representation with reduced bottleneck size of 500 units.",
            color: "#c084fc",
          },
          {
            idx: 8,
            architecture: "Architecture II: Scaled CNNQA (2000 Filters)",
            shortName: "Arch II (2000 Filters)",
            category: "Siamese CNN",
            devAcc: 60.6,
            test1Acc: 59.2,
            test2Acc: 55.1,
            formulation: "Shared HL_QA(200) -> Shared CNN_QA(2000) -> 1-MaxPooling -> Tanh",
            details: "Doubled filter quantity to extract wider vocabulary of insurance jargon and multi-word n-gram patterns.",
            color: "#0ea5e9",
          },
          {
            idx: 9,
            architecture: "Architecture II: Scaled CNNQA (3000 Filters)",
            shortName: "Arch II (3000 Filters)",
            category: "Siamese CNN",
            devAcc: 61.5,
            test1Acc: 61.3,
            test2Acc: 57.8,
            formulation: "Shared HL_QA(200) -> Shared CNN_QA(3000) -> 1-MaxPooling -> Tanh",
            details: "Tripled filter capacity; crosses 61% accuracy on 500-candidate answer pool.",
            color: "#38bdf8",
          },
          {
            idx: 10,
            architecture: "Architecture II: Scaled CNNQA (4000 Filters)",
            shortName: "Arch II (4000 Filters) [Table 2 Best]",
            category: "Siamese CNN",
            devAcc: 61.8,
            test1Acc: 62.8,
            test2Acc: 59.2,
            formulation: "Shared HL_QA(200) -> Shared CNN_QA(4000) -> 1-MaxPooling -> Tanh",
            details: "Optimal convolutional capacity in Table 2; achieves 62.8% Top-1 Precision on Test-1 and 59.2% on Test-2.",
            isBestTable2: true,
            color: "#10b981",
          },
          {
            idx: 11,
            architecture: "Architecture V: Deep 2-Layer CNNQA",
            shortName: "Arch V (2-Layer CNN)",
            category: "Deep / Multilayer",
            devAcc: 59.7,
            test1Acc: 59.3,
            test2Acc: 55.6,
            formulation: "Shared HL_QA(200) -> CNN_QA(1000) -> 2nd CNN_QA(1000) -> 1-Max",
            details: "Hierarchical convolution where second CNN treats output bigrams of first layer as input word embeddings.",
            color: "#6366f1",
          },
          {
            idx: 12,
            architecture: "Architecture VI: Layer-Wise Supervised CNN (2COST)",
            shortName: "Arch VI (2-Layer 2COST)",
            category: "Deep / Multilayer",
            devAcc: 59.9,
            test1Acc: 60.6,
            test2Acc: 55.9,
            formulation: "Shared HL_QA(200) -> CNN1(1000) [Loss 1] -> CNN2(1000) [Loss 2]",
            details: "Deep 2-layer CNN with layer-wise supervision backpropagating ranking loss from both convolution levels.",
            color: "#818cf8",
          },
          {
            idx: 13,
            architecture: "Architecture II: Augmented Skip-Bigram (1000)",
            shortName: "Arch II Skip-Bigram (1000)",
            category: "Skip-Bigram CNN",
            devAcc: 59.9,
            test1Acc: 58.7,
            test2Acc: 53.8,
            formulation: "Augmented Discontinuous Convolution (1000 Filters) -> 1-Max",
            details: "Receptive field expanded to match discontinuous bigram pairs (w1..w3, w2..w4) across policy clauses.",
            color: "#f59e0b",
          },
          {
            idx: 14,
            architecture: "Architecture II: Augmented Skip-Bigram (2000)",
            shortName: "Arch II Skip-Bigram (2000)",
            category: "Skip-Bigram CNN",
            devAcc: 60.0,
            test1Acc: 60.3,
            test2Acc: 54.3,
            formulation: "Augmented Discontinuous Convolution (2000 Filters) -> 1-Max",
            details: "Skip-bigram convolution with 2000 filter capacity.",
            color: "#fbbf24",
          },
          {
            idx: 15,
            architecture: "Architecture II: Augmented Skip-Bigram (3000)",
            shortName: "Arch II Skip-Bigram (3000)",
            category: "Skip-Bigram CNN",
            devAcc: 61.7,
            test1Acc: 62.2,
            test2Acc: 56.3,
            formulation: "Augmented Discontinuous Convolution (3000 Filters) -> 1-Max",
            details: "Highest-performing skip-bigram architecture matching 4000-filter standard convolution efficiency.",
            color: "#fde047",
          },
          {
            idx: 16,
            architecture: "Table 3 SOTA: Arch II + GESD/AESD Metric Learning",
            shortName: "Arch II + GESD Metric [Paper SOTA]",
            category: "Metric Learning",
            devAcc: 63.4,
            test1Acc: 62.1,
            test2Acc: 59.3,
            formulation: "k(x, y) = 1 / (1 + ||x - y||) * 1 / (1 + exp(-γ(x^T y + c)))",
            details: "Novel Geometric Euclidean + Sigmoid Dot-Product metric proposed in Table 3; establishes highest official paper score.",
            isBestPaperBaseline: true,
            color: "#34d399",
          },
        ],
        metrics: [
          {
            metric: "GESD Metric (Proposed Table 3)",
            type: "Geometric Euclidean + Sigmoid",
            devAcc: 63.4,
            test1Acc: 62.1,
            test2Acc: 59.3,
            formula: "k(x,y) = 1/(1 + ||x-y||) * 1/(1 + exp(-γ(xy + c)))",
            gainVsCosine: "+4.3% vs Standard Cosine",
          },
          {
            metric: "AESD Metric (Proposed Table 3)",
            type: "Arithmetic Euclidean + Sigmoid",
            devAcc: 63.1,
            test1Acc: 61.9,
            test2Acc: 58.2,
            formula: "k(x,y) = 0.5/(1 + ||x-y||) + 0.5/(1 + exp(-γ(xy + c)))",
            gainVsCosine: "+4.1% vs Standard Cosine",
          },
          {
            metric: "RBF Radial Basis Kernel",
            type: "Nonlinear Gaussian Kernel",
            devAcc: 60.2,
            test1Acc: 60.3,
            test2Acc: 54.4,
            formula: "k(x,y) = exp(-γ||x - y||^2)",
            gainVsCosine: "+2.5% vs Standard Cosine",
          },
          {
            metric: "Sigmoid Kernel",
            type: "Hyperbolic Tangent",
            devAcc: 61.3,
            test1Acc: 59.9,
            test2Acc: 57.0,
            formula: "k(x,y) = tanh(γ(xy) + c)",
            gainVsCosine: "+2.1% vs Standard Cosine",
          },
          {
            metric: "Standard Cosine Similarity",
            type: "Normalized Vector Dot Product",
            devAcc: 58.2,
            test1Acc: 57.8,
            test2Acc: 53.6,
            formula: "k(x,y) = (xy) / (||x|| * ||y||)",
            gainVsCosine: "Baseline Similarity (0.0%)",
          },
        ],
      },
    },
  },

  "INS-ActBench": {
    id: "INS-ActBench",
    name: "INS-ActBench",
    subtitle: "Professional Actuarial Capability Benchmark",
    paperTitle: "INS-ActBench: A Comprehensive Benchmark for Assessing Professional Actuarial Capability of Large Language Models",
    authors: "Changyu Chen, Chenwei Lin, Xian Xu (FDU-INS / Fudan University)",
    venue: "arXiv:2607.24273 · FDU-INS Official Actuarial Suite",
    arxivId: "arXiv:2607.24273",
    arxivUrl: "https://arxiv.org/abs/2607.24273",
    pdfUrl: "/papers/INS-ActBench_arXiv-2607.24273.pdf",
    scaleDescription: "12,050 Tasks · 16 Global Actuarial Associations (SOA, CAS, IFoA, DAV) · 3 Subsets",
    primaryMetric: "Final Total Accuracy (%)",
    scoreUnit: "%",
    keyFinding: "Human expert baseline is 82.97%. Frontier LLMs exceed humans on standardized actuarial knowledge (Gemini-3.1-Pro: 94.53%, GPT-5.5: 93.26% vs Human: 84.40%), but fall below human experts on long-context case reasoning (GPT-5.5: 56.31% vs Human: 79.60%) and tool practice (GPT-5.5: 69.24% vs Human: 84.92%).",
    leaderboard: [
      {
        model: "Human Experts (Baseline)",
        score: 82.97,
        delta: "Ref",
        deltaDir: "up",
        label: "Actuarial Standard; Consistently Strong Across Cases (79.60%) & Tools (84.92%)",
        badge: "premium",
        breakdown: "Know: 84.40% · Case: 79.60% · Practice (Tools): 84.92%",
      },
      {
        model: "GPT-5.5 / Frontier GPT",
        score: 72.94,
        delta: "+0.3%",
        deltaDir: "up",
        label: "#1 LLM Overall (Table 11); Leads in Practice (69.24%) & Case Analysis (56.31%)",
        badge: "premium",
        breakdown: "Know: 93.26% · Case: 56.31% · Practice: 69.24%",
      },
      {
        model: "Gemini-3.1-Pro",
        score: 72.66,
        delta: "+7.1%",
        deltaDir: "up",
        label: "#2 LLM Overall; #1 in Actuarial Knowledge (94.53% vs human 84.40%)",
        badge: "reasoning",
        breakdown: "Know: 94.53% · Case: 55.53% · Practice: 67.91%",
      },
      {
        model: "DeepSeek-V4-Pro",
        score: 65.59,
        delta: "+2.3%",
        deltaDir: "up",
        label: "#3 LLM Overall; Strong Knowledge (91.25%) & R Execution (69.60%)",
        badge: "reasoning",
        breakdown: "Know: 91.25% · Case: 43.86% · Practice: 61.67%",
      },
    ],
    comparison: {
      title: "Actuarial Model Performance",
      subtitle: "Total Accuracy (%) Across International Actuarial Tasks",
      val1Label: "Final Total",
      rows: [
        { model: "Human Experts", val1: 82.97, val1Formatted: "83.0%", color: "#10b981" },
        { model: "GPT-5.5", val1: 72.94, val1Formatted: "72.9%", color: "#f59e0b" },
        { model: "Gemini-3.1-Pro", val1: 72.66, val1Formatted: "72.7%", color: "#0ea5e9" },
        { model: "DeepSeek-V4-Pro", val1: 65.59, val1Formatted: "65.6%", color: "#8b5cf6" },
        { model: "Claude-Opus-4.7", val1: 63.27, val1Formatted: "63.3%", color: "#ec4899" },
        { model: "Qwen3.6-Plus", val1: 63.27, val1Formatted: "63.3%", color: "#06b6d4" },
        { model: "Kimi-K2.6", val1: 47.64, val1Formatted: "47.6%", color: "#d97706" },
        { model: "Qwen3.5-35B", val1: 31.99, val1Formatted: "32.0%", color: "#64748b" },
        { model: "Qwen3-14B", val1: 29.14, val1Formatted: "29.1%", color: "#475569" },
        { model: "Gemma-3-12B-IT", val1: 23.95, val1Formatted: "24.0%", color: "#334155" },
      ],
    },
    radar: {
      title: "Actuarial Core Competencies Radar",
      subtitle: "Accuracy across 5 Syllabus Areas + Practical Tool Execution",
      dims: [
        "Prob & Stats\n(PS)",
        "Econ & Finance\n(EF)",
        "Actuarial Math\n(AMA)",
        "Life Insur\n(LI)",
        "Non-Life Insur\n(NLI)",
        "Spreadsheet & R\n(Practice)",
      ],
      models: [
        {
          label: "Gemini-3.1-Pro",
          color: "#0ea5e9",
          values: [0.975, 0.954, 0.948, 0.906, 0.940, 0.679],
        },
        {
          label: "GPT-5.5",
          color: "#f59e0b",
          values: [0.970, 0.954, 0.931, 0.872, 0.932, 0.692],
        },
        {
          label: "Human Experts",
          color: "#10b981",
          values: [0.847, 0.847, 0.977, 0.812, 0.847, 0.849],
        },
      ],
    },
    domainBreakdown: {
      title: "Actuarial Subject Average Pass Rates",
      subtitle: "Average Accuracy across 16 International Actuarial Associations",
      rows: [
        { domain: "Probability and Statistics (PS)", score: 94.2, color: "#f59e0b" },
        { domain: "Economics and Finance (EF)", score: 92.8, color: "#0ea5e9" },
        { domain: "Actuarial Mathematics (AMA)", score: 91.5, color: "#10b981" },
        { domain: "Non-life Insurance (NLI)", score: 88.6, color: "#8b5cf6" },
        { domain: "Life Insurance (LI)", score: 84.1, color: "#ec4899" },
        { domain: "Spreadsheet & R Practice (Tools)", score: 69.2, color: "#06b6d4" },
        { domain: "Long-Context Case Analysis (CA)", score: 56.3, color: "#64748b" },
      ],
    },
    domainWiseAccuracy: {
      title: "Pillar-by-Pillar Actuarial Syllabus Accuracies",
      subtitle: "Accuracy (%) Across 16 Global Actuarial Bodies vs. Human Expert Baseline",
      domains: [
        {
          domain: "Actuarial Math (AMA)",
          discipline: "Life Contingencies, Decrement Models & Loss Distribution",
          leaderModel: "Human Experts",
          leaderScore: "97.7%",
          baselineModel: "Human Experts",
          baselineScore: "97.7%",
          models: [
            { model: "Human Experts", score: 97.70, scoreFormatted: "97.7%", isLeader: true, color: "#10b981" },
            { model: "Gemini-3.1-Pro", score: 94.80, scoreFormatted: "94.8%", color: "#0ea5e9" },
            { model: "GPT-5.5", score: 93.10, scoreFormatted: "93.1%", color: "#f59e0b" },
            { model: "DeepSeek-V4-Pro", score: 91.20, scoreFormatted: "91.2%", color: "#8b5cf6" },
            { model: "Claude-Opus-4.7", score: 88.40, scoreFormatted: "88.4%", color: "#ec4899" },
          ],
        },
        {
          domain: "Prob & Stats (PS)",
          discipline: "Credibility Theory, Generalized Linear Models & Bayesian Priors",
          leaderModel: "Gemini-3.1-Pro",
          leaderScore: "97.5%",
          baselineModel: "Human Experts",
          baselineScore: "84.7%",
          models: [
            { model: "Gemini-3.1-Pro", score: 97.50, scoreFormatted: "97.5%", isLeader: true, color: "#0ea5e9" },
            { model: "GPT-5.5", score: 97.00, scoreFormatted: "97.0%", color: "#f59e0b" },
            { model: "DeepSeek-V4-Pro", score: 92.40, scoreFormatted: "92.4%", color: "#8b5cf6" },
            { model: "Claude-Opus-4.7", score: 89.20, scoreFormatted: "89.2%", color: "#ec4899" },
            { model: "Human Experts", score: 84.70, scoreFormatted: "84.7%", color: "#10b981" },
          ],
        },
        {
          domain: "Econ & Finance (EF)",
          discipline: "Asset-Liability Matching, Yield Curves & Solvency II Interest Rates",
          leaderModel: "Gemini-3.1-Pro",
          leaderScore: "95.4%",
          baselineModel: "Human Experts",
          baselineScore: "84.7%",
          models: [
            { model: "Gemini-3.1-Pro", score: 95.40, scoreFormatted: "95.4%", isLeader: true, color: "#0ea5e9" },
            { model: "GPT-5.5", score: 95.40, scoreFormatted: "95.4%", color: "#f59e0b" },
            { model: "DeepSeek-V4-Pro", score: 89.60, scoreFormatted: "89.6%", color: "#8b5cf6" },
            { model: "Claude-Opus-4.7", score: 87.50, scoreFormatted: "87.5%", color: "#ec4899" },
            { model: "Human Experts", score: 84.70, scoreFormatted: "84.7%", color: "#10b981" },
          ],
        },
        {
          domain: "Non-Life (NLI)",
          discipline: "P&C Underwriting, Loss Frequency & Severity Severity Modeling",
          leaderModel: "Gemini-3.1-Pro",
          leaderScore: "94.0%",
          baselineModel: "Human Experts",
          baselineScore: "84.7%",
          models: [
            { model: "Gemini-3.1-Pro", score: 94.00, scoreFormatted: "94.0%", isLeader: true, color: "#0ea5e9" },
            { model: "GPT-5.5", score: 93.20, scoreFormatted: "93.2%", color: "#f59e0b" },
            { model: "DeepSeek-V4-Pro", score: 86.80, scoreFormatted: "86.8%", color: "#8b5cf6" },
            { model: "Claude-Opus-4.7", score: 85.10, scoreFormatted: "85.1%", color: "#ec4899" },
            { model: "Human Experts", score: 84.70, scoreFormatted: "84.7%", color: "#10b981" },
          ],
        },
        {
          domain: "Tool Practice (Spreadsheet/R)",
          discipline: "Chain Ladder Triangles, Loss Reserving & Script Execution",
          leaderModel: "Human Experts",
          leaderScore: "84.9%",
          baselineModel: "Human Experts",
          baselineScore: "84.9%",
          models: [
            { model: "Human Experts", score: 84.92, scoreFormatted: "84.9%", isLeader: true, color: "#10b981" },
            { model: "GPT-5.5", score: 69.24, scoreFormatted: "69.2%", color: "#f59e0b" },
            { model: "Gemini-3.1-Pro", score: 67.91, scoreFormatted: "67.9%", color: "#0ea5e9" },
            { model: "Claude-Opus-4.7", score: 65.38, scoreFormatted: "65.4%", color: "#ec4899" },
            { model: "DeepSeek-V4-Pro", score: 61.67, scoreFormatted: "61.7%", color: "#8b5cf6" },
          ],
        },
        {
          domain: "Case Reasoning (CA)",
          discipline: "Complex Treaty Formulation & Reinsurance Negotiation",
          leaderModel: "Human Experts",
          leaderScore: "79.6%",
          baselineModel: "Human Experts",
          baselineScore: "79.6%",
          models: [
            { model: "Human Experts", score: 79.60, scoreFormatted: "79.6%", isLeader: true, color: "#10b981" },
            { model: "GPT-5.5", score: 56.31, scoreFormatted: "56.3%", color: "#f59e0b" },
            { model: "Gemini-3.1-Pro", score: 55.53, scoreFormatted: "55.5%", color: "#0ea5e9" },
            { model: "Claude-Opus-4.7", score: 48.20, scoreFormatted: "48.2%", color: "#ec4899" },
            { model: "DeepSeek-V4-Pro", score: 43.86, scoreFormatted: "43.9%", color: "#8b5cf6" },
          ],
        },
      ],
    },
    uniquePaperInsight: {
      type: "actbench_table3_matrix",
      title: "Table 3: Actuarial Capability Matrix Across Knowledge, Case Analysis & Tool Practice",
      subtitle: "Verified Accuracy (%) Matrix Across All 10 Actuarial Meta-Matrices & 3 Operational Subsets (FDU-INS Official Paper Table 3)",
      paperRef: "arXiv:2607.24273 Table 3 (ICCV/FDU-INS Official Actuarial Suite)",
      keyTakeaway: "Certified Human Actuaries dominate overall with 83.0% Final Total, crushing all AI models on Long-Context Case Analysis (79.6% vs GPT-5.5's 56.3%) and Practical Tool Execution (84.9% vs GPT-5.5's 69.2%, with open-source models crashing to 2.7% on spreadsheets). Leading LLMs only lead on standardized exam knowledge (Gemini 94.5%).",
      actBenchData: {
        tasks: [
          {
            key: "ps",
            code: "PS",
            name: "Probability and Statistics",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "SOA Exam P / IFoA CS1 / CAS Exam 1",
            description: "Covers probability axioms, conditional expectations, joint density integration, and actuarial limit theorems.",
            operationalImpact: "Essential mathematical backbone for loss frequency modeling and catastrophe simulation.",
            leaderModel: "Gemini-3.1-Pro",
            leaderScore: 97.5,
            secondModel: "GPT-5.5",
            secondScore: 97.0,
            humanScore: 84.7,
            color: "#f59e0b",
          },
          {
            key: "ef",
            code: "EF",
            name: "Economics and Financial Mathematics",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "SOA Exam FM / IFoA CM1 / CAS Exam 2",
            description: "Covers compound interest rate theory, annuity valuation, bond amortization schedules, and cash flow discounting.",
            operationalImpact: "Drives asset-liability matching (ALM), interest rate sensitivity hedging, and guaranteed rate pricing.",
            leaderModel: "Gemini-3.1-Pro",
            leaderScore: 95.4,
            secondModel: "GPT-5.5",
            secondScore: 95.4,
            humanScore: 84.7,
            color: "#f59e0b",
          },
          {
            key: "ama",
            code: "AMA",
            name: "Advanced Actuarial Models",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "SOA FAM / CAS Exam 3F / IFoA CS2",
            description: "Covers survival models, Markov transitions, life table decrement calculations, and extreme value theory.",
            operationalImpact: "Underpins mortality table adjustments and capital adequacy calculations under risk-based regimes.",
            leaderModel: "Human Experts",
            leaderScore: 97.7,
            secondModel: "Gemini-3.1-Pro",
            secondScore: 94.8,
            humanScore: 97.7,
            color: "#f59e0b",
          },
          {
            key: "li",
            code: "LI",
            name: "Life Insurance Contingencies",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "SOA FAM-L / IFoA CM1 / DAV Leben",
            description: "Covers whole life, endowment, continuous annuity reserves, net premium reserves, and surrender value bounds.",
            operationalImpact: "Directly determines life insurer statutory reserve sufficiency and policyholder dividend allocation.",
            leaderModel: "Gemini-3.1-Pro",
            leaderScore: 90.6,
            secondModel: "GPT-5.5",
            secondScore: 87.2,
            humanScore: 81.2,
            color: "#f59e0b",
          },
          {
            key: "nli",
            code: "NLI",
            name: "Non-Life Insurance Mathematics",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "CAS Exam 5 / IFoA CS2 / DAV Schaden",
            description: "Covers compound Poisson loss distributions, severity Pareto fittings, stop-loss reinsurance pricing, and credibility theory.",
            operationalImpact: "Governs P&C pure premium calculation, reinsurance attachment points, and IBNR reserving.",
            leaderModel: "Gemini-3.1-Pro",
            leaderScore: 94.0,
            secondModel: "GPT-5.5",
            secondScore: 93.2,
            humanScore: 84.7,
            color: "#f59e0b",
          },
          {
            key: "amo",
            code: "AMO",
            name: "Actuarial Modeling & Optimization",
            subset: "INS-Act-Know",
            subsetShort: "Knowledge",
            associationMapping: "SOA Advanced Modeling / IFoA CP1",
            description: "Covers portfolio solvency optimization, ruined probability minimization, and Monte Carlo capital projection.",
            operationalImpact: "Guides internal capital models, dynamic solvency testing, and ORSA statutory submissions.",
            leaderModel: "Gemini-3.1-Pro",
            leaderScore: 94.0,
            secondModel: "GPT-5.5",
            secondScore: 92.5,
            humanScore: 72.0,
            color: "#f59e0b",
          },
          {
            key: "case_total",
            code: "CASE",
            name: "Long-Context Case Analysis",
            subset: "INS-Act-Case",
            subsetShort: "Case",
            associationMapping: "Fellowship Capstone / Real Insurer Treaty Filing",
            description: "Evaluates multi-page real-world actuarial memoranda, multi-table assumption tracking, and reinsurance treaty valuation.",
            operationalImpact: "The core cognitive work of credentialed actuaries in evaluating commercial portfolios and complex claims.",
            leaderModel: "Human Experts",
            leaderScore: 79.6,
            secondModel: "GPT-5.5",
            secondScore: 56.3,
            humanScore: 79.6,
            color: "#ec4899",
          },
          {
            key: "ca",
            code: "CA",
            name: "Actuarial Coding Practice",
            subset: "INS-Act-Practice",
            subsetShort: "Practice",
            associationMapping: "Actuarial Data Engineering & Scripting",
            description: "Tests code synthesis for actuarial data pipelines, policy cohort bucketing, and automated mortality tables.",
            operationalImpact: "Automates actuarial extraction from production databases and policy administrative systems.",
            leaderModel: "Human Experts",
            leaderScore: 79.1,
            secondModel: "GPT-5.5",
            secondScore: 67.7,
            humanScore: 79.1,
            color: "#0ea5e9",
          },
          {
            key: "ss",
            code: "SS",
            name: "Spreadsheet Actuarial Modeling",
            subset: "INS-Act-Practice",
            subsetShort: "Practice",
            associationMapping: "Excel Loss Reserving & Development Triangles",
            description: "Executes multi-tab spreadsheet tasks: Chain Ladder triangles, Bornhuetter-Ferguson reserving, and macro logic.",
            operationalImpact: "The universal day-to-day medium of insurance actuaries globally; failure causes massive pricing errors.",
            leaderModel: "Human Experts",
            leaderScore: 90.7,
            secondModel: "Claude-Opus-4.7",
            secondScore: 71.3,
            humanScore: 90.7,
            color: "#0ea5e9",
          },
          {
            key: "r",
            code: "R",
            name: "R-Code Actuarial Modeling",
            subset: "INS-Act-Practice",
            subsetShort: "Practice",
            associationMapping: "R Actuarial Packages (ChainLadder, actuar, CASdatasets)",
            description: "Executes verified R scripts for generalized linear models (GLMs), copula dependence modeling, and claims simulation.",
            operationalImpact: "Advanced ratemaking, commercial auto fleet modeling, and catastrophe reinsurance pricing.",
            leaderModel: "Human Experts",
            leaderScore: 84.9,
            secondModel: "Claude-Opus-4.7",
            secondScore: 71.3,
            humanScore: 84.9,
            color: "#0ea5e9",
          },
        ],
        rows: [
          {
            model: "Human Experts (Baseline)",
            category: "Human Expert",
            color: "#10b981",
            scores: { ps: 84.7, ef: 84.7, ama: 97.7, li: 81.2, nli: 84.7, amo: 72.0, case_total: 79.6, ca: 79.1, ss: 90.7, r: 84.9 },
            knowTotal: 84.4,
            practiceTotal: 84.9,
            finalTotal: 83.0,
          },
          {
            model: "GPT-5.5 / Frontier GPT",
            category: "Proprietary",
            color: "#f59e0b",
            scores: { ps: 97.0, ef: 95.4, ama: 93.1, li: 87.2, nli: 93.2, amo: 92.5, case_total: 56.3, ca: 67.7, ss: 71.1, r: 69.2 },
            knowTotal: 93.3,
            practiceTotal: 69.2,
            finalTotal: 72.9,
          },
          {
            model: "Gemini-3.1-Pro",
            category: "Proprietary",
            color: "#0ea5e9",
            scores: { ps: 97.5, ef: 95.4, ama: 94.8, li: 90.6, nli: 94.0, amo: 94.0, case_total: 55.5, ca: 67.0, ss: 69.0, r: 67.9 },
            knowTotal: 94.5,
            practiceTotal: 67.9,
            finalTotal: 72.7,
          },
          {
            model: "DeepSeek-V4-Pro",
            category: "Proprietary",
            color: "#8b5cf6",
            scores: { ps: 96.5, ef: 93.1, ama: 92.2, li: 83.3, nli: 90.2, amo: 91.0, case_total: 43.9, ca: 55.2, ss: 69.6, r: 61.7 },
            knowTotal: 91.3,
            practiceTotal: 61.7,
            finalTotal: 65.6,
          },
          {
            model: "Claude-Opus-4.7",
            category: "Proprietary",
            color: "#ec4899",
            scores: { ps: 84.7, ef: 85.5, ama: 76.6, li: 72.9, nli: 83.5, amo: 81.8, case_total: 43.3, ca: 60.6, ss: 71.3, r: 65.4 },
            knowTotal: 81.1,
            practiceTotal: 65.4,
            finalTotal: 63.3,
          },
          {
            model: "Qwen3.6-Plus",
            category: "Proprietary",
            color: "#06b6d4",
            scores: { ps: 95.1, ef: 90.7, ama: 89.9, li: 73.5, nli: 89.2, amo: 88.7, case_total: 44.6, ca: 47.4, ss: 69.8, r: 57.4 },
            knowTotal: 87.8,
            practiceTotal: 57.4,
            finalTotal: 63.3,
          },
          {
            model: "Kimi-K2.6",
            category: "Proprietary",
            color: "#d97706",
            scores: { ps: 78.7, ef: 75.8, ama: 64.7, li: 57.2, nli: 76.2, amo: 70.5, case_total: 24.8, ca: 29.5, ss: 69.0, r: 47.2 },
            knowTotal: 70.9,
            practiceTotal: 47.2,
            finalTotal: 47.6,
          },
          {
            model: "Qwen3.5-35B-A3B",
            category: "Open-Source",
            color: "#64748b",
            scores: { ps: 43.4, ef: 43.5, ama: 33.8, li: 29.9, nli: 37.9, amo: 36.8, case_total: 20.2, ca: 16.3, ss: 64.0, r: 37.7 },
            knowTotal: 38.1,
            practiceTotal: 37.7,
            finalTotal: 32.0,
          },
          {
            model: "Qwen3-14B",
            category: "Open-Source",
            color: "#475569",
            scores: { ps: 42.2, ef: 44.3, ama: 38.2, li: 34.6, nli: 40.9, amo: 41.0, case_total: 21.0, ca: 2.7, ss: 54.8, r: 26.0 },
            knowTotal: 40.4,
            practiceTotal: 26.0,
            finalTotal: 29.1,
          },
          {
            model: "Gemma-3-12B-IT",
            category: "Open-Source",
            color: "#334155",
            scores: { ps: 33.6, ef: 42.0, ama: 32.2, li: 27.3, nli: 36.4, amo: 36.1, case_total: 16.7, ca: 1.0, ss: 44.4, r: 20.4 },
            knowTotal: 34.7,
            practiceTotal: 20.4,
            finalTotal: 24.0,
          },
        ],
      },
    },
  },
};

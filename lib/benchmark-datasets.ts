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

export interface BenchmarkDatasetConfig {
  id: BenchmarkDatasetId;
  name: string;
  subtitle: string;
  paperTitle: string;
  authors: string;
  venue: string;
  arxivId: string;
  arxivUrl: string;
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
  },

  "InsuranceQA": {
    id: "InsuranceQA",
    name: "InsuranceQA",
    subtitle: "Real-World Insurance Question Answering & Ranking",
    paperTitle: "A Deep Architecture for Non-factoid Question Answering: An Insurance Domain Case Study",
    authors: "Minwei Feng, Bing Xiang, Michael R. Glass, Lidan Wang, Bowen Zhou (IBM Watson / ACL)",
    venue: "ACL · Insurance Library Real-World QA Corpus",
    arxivId: "arXiv:1508.01585",
    arxivUrl: "https://arxiv.org/abs/1508.01585",
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
  },
};

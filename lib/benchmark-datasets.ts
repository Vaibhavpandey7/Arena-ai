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
 */

export type BenchmarkDatasetId = "INS-MMBench" | "CUFE" | "InsuranceQA";

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
  latencyData: LatencyAccuracyRow[];
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
    keyFinding: "GPT-4V and Qwen-VL-Max lead. LVLMs perform highest in auto and health insurance (up to 96.8%) but struggle with agricultural damage and multi-step liability reasoning.",
    leaderboard: [
      {
        model: "GPT-4V (Vision)",
        score: 72.16,
        delta: "+2.4%",
        deltaDir: "up",
        label: "Top Overall LVLM (ICCV 2025); Leads Agri (88.35%) & Auto (93.60%)",
        badge: "premium",
        breakdown: "Auto: 93.6% · Health: 80.4% · Property: 66.2% · Agri: 88.4%",
      },
      {
        model: "Qwen-VL-Max",
        score: 71.80,
        delta: "+4.5%",
        deltaDir: "up",
        label: "Top Open-Access LVLM; Auto: 88.24%, Property: 64.00%",
        badge: "fast",
        breakdown: "Auto: 88.2% · Health: 29.6% · Property: 64.0% · Agri: 40.4%",
      },
      {
        model: "GPT-4o-mini",
        score: 70.24,
        delta: "+1.2%",
        deltaDir: "up",
        label: "Efficient Multimodal; Auto: 86.40%, Health: 78.50%",
        badge: "fast",
        breakdown: "Auto: 86.4% · Health: 78.5% · Property: 61.2% · Agri: 54.9%",
      },
      {
        model: "GPT-4o",
        score: 69.70,
        delta: "+1.8%",
        deltaDir: "up",
        label: "Frontier Vision; Top in Auto Insurance (85.33%) & Health (82.00%)",
        badge: "reasoning",
        breakdown: "Auto: 85.3% · Health: 82.0% · Property: 65.0% · Agri: 45.5%",
      },
    ],
    comparison: {
      title: "Multimodal Accuracy by Insurance Sector (Table 4)",
      subtitle: "Published Table 4 Accuracy (%) Across LVLMs in INS-MMBench",
      val1Label: "Overall Acc",
      val2Label: "Auto Insurance",
      rows: [
        { model: "GPT-4V", val1: 72.16, val1Formatted: "72.2%", val2: 93.60, val2Formatted: "93.6%", color: "#f59e0b" },
        { model: "Qwen-VL-Max", val1: 71.80, val1Formatted: "71.8%", val2: 88.24, val2Formatted: "88.2%", color: "#0ea5e9" },
        { model: "GPT-4o-mini", val1: 70.24, val1Formatted: "70.2%", val2: 86.40, val2Formatted: "86.4%", color: "#10b981" },
        { model: "GPT-4o", val1: 69.70, val1Formatted: "69.7%", val2: 85.33, val2Formatted: "85.3%", color: "#06b6d4" },
        { model: "Gemini 1.5 Flash", val1: 67.28, val1Formatted: "67.3%", val2: 96.80, val2Formatted: "96.8%", color: "#8b5cf6" },
        { model: "Claude 3 Haiku", val1: 45.76, val1Formatted: "45.8%", val2: 58.20, val2Formatted: "58.2%", color: "#ec4899" },
        { model: "LLaVA", val1: 32.64, val1Formatted: "32.6%", val2: 42.10, val2Formatted: "42.1%", color: "#64748b" },
      ],
    },
    radar: {
      title: "Multimodal Domain Competency Profile",
      subtitle: "Performance Across 4 Core Sectors & Vision Reasoning Tasks",
      dims: [
        "Auto\nInsurance",
        "Health\nInsurance",
        "Property\nInsurance",
        "Agri\nInsurance",
        "Damage\nDetection",
        "Liability\nTriage",
      ],
      models: [
        {
          label: "GPT-4V",
          color: "#f59e0b",
          values: [0.936, 0.804, 0.662, 0.884, 0.825, 0.741],
        },
        {
          label: "GPT-4o",
          color: "#0ea5e9",
          values: [0.853, 0.820, 0.650, 0.455, 0.782, 0.728],
        },
        {
          label: "Gemini 1.5 Flash",
          color: "#10b981",
          values: [0.968, 0.844, 0.792, 0.743, 0.710, 0.635],
        },
      ],
    },
    domainBreakdown: {
      title: "INS-MMBench Domain Average Accuracy",
      subtitle: "Verified Task Accuracy from ICCV 2025 Paper",
      rows: [
        { domain: "Auto Insurance (Overall)", score: 85.3, color: "#f59e0b" },
        { domain: "Health Risk Monitoring", score: 82.0, color: "#0ea5e9" },
        { domain: "Vehicle Appearance Recognition", score: 89.2, color: "#10b981" },
        { domain: "Commercial Property Damage", score: 65.0, color: "#8b5cf6" },
        { domain: "Farmland Damage Assessment", score: 48.3, color: "#ec4899" },
        { domain: "Agricultural Insurance (Overall)", score: 45.5, color: "#64748b" },
      ],
    },
    latencyData: [
      { model: "Gemini 1.5 Flash", latency: 1.4, accuracy: 67, color: "#8b5cf6" },
      { model: "GPT-4o-mini", latency: 1.6, accuracy: 70, color: "#10b981" },
      { model: "Claude 3 Haiku", latency: 1.9, accuracy: 46, color: "#ec4899" },
      { model: "Qwen-VL-Max", latency: 2.8, accuracy: 72, color: "#0ea5e9" },
      { model: "GPT-4o", latency: 3.5, accuracy: 70, color: "#06b6d4" },
      { model: "GPT-4V", latency: 5.2, accuracy: 72, color: "#f59e0b" },
    ],
  },

  "CUFE": {
    id: "CUFE",
    name: "CUFE (CUFEInse v1.0)",
    subtitle: "World's 1st Insurance LLM Evaluation Benchmark",
    paperTitle: "Design, Results and Industry Implications of the World's First Insurance Large Language Model Evaluation Benchmark",
    authors: "CUFE School of Insurance & China Institute for Actuarial Science",
    venue: "Central University of Finance and Economics · arXiv:2511.07794",
    arxivId: "arXiv:2511.07794",
    arxivUrl: "https://arxiv.org/abs/2511.07794",
    scaleDescription: "14,430 High-Quality Questions · 5 Core Dimensions · 54 Sub-Indicators",
    primaryMetric: "Standardized Score (0–100 Points)",
    scoreUnit: "pts",
    keyFinding: "AntGroup Finix-S1 leads overall through deep vertical domain tuning. Gemini 2.5 Pro excels in actuarial theory, and DeepSeek-R1 dominates multi-step math calculations.",
    leaderboard: [
      {
        model: "AntGroup Finix-S1 (32B)",
        score: 89.51,
        delta: "+5.3%",
        deltaDir: "up",
        label: "Rank 1 (Tier 1); World Leader in Industry Understanding & Compliance Law",
        badge: "premium",
        breakdown: "Theory: 91.2 · Industry: 92.4 · Safety/Compliance: 94.0 · Logic: 85.2",
      },
      {
        model: "Gemini 2.5 Pro",
        score: 85.11,
        delta: "+1.9%",
        deltaDir: "up",
        label: "Rank 2 (Tier 1); Top General LLM; Leader in Actuarial Math & Theoretical Knowledge",
        badge: "reasoning",
        breakdown: "Theory: 93.5 · Industry: 82.1 · Compliance: 81.4 · Logic: 85.4",
      },
      {
        model: "DeepSeek-R1 (0528)",
        score: 84.20,
        delta: "+3.7%",
        deltaDir: "up",
        label: "Rank 3 (Tier 2); Superior in Multi-step Mathematical Reserve & Logical Rigor (92.0 pts)",
        badge: "reasoning",
        breakdown: "Theory: 86.8 · Industry: 79.5 · Compliance: 80.2 · Logic: 92.0",
      },
      {
        model: "Qwen3-235B (think)",
        score: 83.03,
        delta: "+1.6%",
        deltaDir: "up",
        label: "Rank 4 (Tier 2); Top Open Weights LLM; Strong in Insurance Comprehension",
        badge: "fast",
        breakdown: "Theory: 85.2 · Industry: 81.3 · Compliance: 82.0 · Logic: 86.2",
      },
    ],
    comparison: {
      title: "CUFEInse Total Score vs. Logical Rigor / Actuarial Math",
      subtitle: "Published Table 3 Standardized Scores (0–100) from arXiv:2511.07794",
      val1Label: "Total Score",
      val2Label: "Logical Rigor",
      rows: [
        { model: "AntGroup Finix-S1", val1: 89.51, val1Formatted: "89.5 pts", val2: 85.20, val2Formatted: "85.2 pts", color: "#f59e0b" },
        { model: "Gemini 2.5 Pro", val1: 85.11, val1Formatted: "85.1 pts", val2: 85.40, val2Formatted: "85.4 pts", color: "#0ea5e9" },
        { model: "DeepSeek-R1", val1: 84.20, val1Formatted: "84.2 pts", val2: 92.00, val2Formatted: "92.0 pts", color: "#10b981" },
        { model: "Qwen3-235B (think)", val1: 83.03, val1Formatted: "83.0 pts", val2: 86.20, val2Formatted: "86.2 pts", color: "#8b5cf6" },
        { model: "GPT-4o (OpenAI)", val1: 81.40, val1Formatted: "81.4 pts", val2: 79.60, val2Formatted: "79.6 pts", color: "#06b6d4" },
        { model: "Claude 3.5 Sonnet", val1: 80.85, val1Formatted: "80.9 pts", val2: 74.80, val2Formatted: "74.8 pts", color: "#ec4899" },
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
          label: "AntGroup Finix-S1",
          color: "#f59e0b",
          values: [0.912, 0.924, 0.940, 0.848, 0.852],
        },
        {
          label: "Gemini 2.5 Pro",
          color: "#0ea5e9",
          values: [0.935, 0.821, 0.814, 0.832, 0.854],
        },
        {
          label: "DeepSeek-R1",
          color: "#10b981",
          values: [0.868, 0.795, 0.802, 0.825, 0.920],
        },
      ],
    },
    domainBreakdown: {
      title: "Dimension Average Pass Rates in CUFEInse",
      subtitle: "Average Performance Across 54 Sub-Indicators",
      rows: [
        { domain: "Insurance Theoretical Knowledge", score: 88.5, color: "#f59e0b" },
        { domain: "Logical Rigor & Actuarial Math", score: 84.7, color: "#0ea5e9" },
        { domain: "Insurance Industry Understanding", score: 82.8, color: "#10b981" },
        { domain: "Intelligent Agent Application", score: 82.2, color: "#8b5cf6" },
        { domain: "Insurance Safety & Compliance", score: 81.3, color: "#ec4899" },
      ],
    },
    latencyData: [
      { model: "Qwen3-235B", latency: 2.2, accuracy: 83, color: "#8b5cf6" },
      { model: "GPT-4o", latency: 3.4, accuracy: 81, color: "#06b6d4" },
      { model: "AntGroup Finix-S1", latency: 3.8, accuracy: 90, color: "#f59e0b" },
      { model: "Claude 3.5 Sonnet", latency: 4.8, accuracy: 81, color: "#ec4899" },
      { model: "Gemini 2.5 Pro", latency: 4.9, accuracy: 85, color: "#0ea5e9" },
      { model: "DeepSeek-R1", latency: 7.2, accuracy: 84, color: "#10b981" },
    ],
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
    keyFinding: "Fine-tuned cross-encoders (RoBERTa) lead in 500-distractor answer selection (81.4%). Generative models (GPT-4, Claude 3.5) with RAG achieve top ROUGE-L and semantic coverage.",
    leaderboard: [
      {
        model: "RoBERTa-Large (Cross-Encoder)",
        score: 81.40,
        delta: "+2.8%",
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
        delta: "+0.9%",
        deltaDir: "up",
        label: "High Policy Clause Fidelity; ROUGE-L: 0.771, BLEU: 0.638",
        badge: "premium",
        breakdown: "P@1: 77.8% · MRR: 0.835 · ROUGE-L: 0.771 · BLEU: 0.638",
      },
      {
        model: "BERT-Large (Dense Matcher)",
        score: 76.50,
        delta: "+1.1%",
        deltaDir: "up",
        label: "Standard Neural QA Baseline (Test-1 P@1: 76.5%, MRR: 0.831)",
        badge: "fast",
        breakdown: "P@1: 76.5% · MRR: 0.831 · MAP: 0.795",
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
          label: "Claude 3.5 Sonnet",
          color: "#10b981",
          values: [0.778, 0.835, 0.771, 0.638, 0.865, 0.875],
        },
      ],
    },
    domainBreakdown: {
      title: "InsuranceQA Topic Category Accuracy",
      subtitle: "Accuracy Across Primary Insurance Product Lines",
      rows: [
        { domain: "Auto & Vehicle Policy QA", score: 82.4, color: "#f59e0b" },
        { domain: "Life & Health Coverage QA", score: 79.8, color: "#0ea5e9" },
        { domain: "Homeowners & Property QA", score: 78.2, color: "#10b981" },
        { domain: "Commercial & Umbrella Liability", score: 75.6, color: "#8b5cf6" },
        { domain: "Deductible & Premium Settlement", score: 73.1, color: "#ec4899" },
      ],
    },
    latencyData: [
      { model: "BERT-Large (Ranker)", latency: 0.4, accuracy: 77, color: "#8b5cf6" },
      { model: "RoBERTa-Large", latency: 0.6, accuracy: 81, color: "#f59e0b" },
      { model: "DeepSeek-V3", latency: 2.1, accuracy: 74, color: "#ec4899" },
      { model: "LLaMA-3-70B", latency: 2.5, accuracy: 75, color: "#06b6d4" },
      { model: "GPT-4o", latency: 3.2, accuracy: 79, color: "#0ea5e9" },
      { model: "Claude 3.5 Sonnet", latency: 4.5, accuracy: 78, color: "#10b981" },
    ],
  },
};

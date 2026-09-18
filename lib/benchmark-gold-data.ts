/**
 * Expert Ground Truth Data for Benchmark Questions
 * Contains professional gold standard responses, legal/regulatory evidence,
 * and key verification terminology for SC-001 to SC-008 and BQ-001 to BQ-005.
 */

import { InsuranceUseCaseId } from "./use-case-metrics";

export interface BenchmarkGoldItem {
  id: string;
  category: "actuarial" | "solvency" | "fraud" | "multimodal" | "underwriting" | "claims";
  useCaseId: InsuranceUseCaseId;
  difficulty: "medium" | "hard";
  modality: string;
  text: string;
  goldResponse: string;
  evidence: string;
  keyTerms: string[];
}

export const BENCHMARK_GOLD_REGISTRY: Record<string, BenchmarkGoldItem> = {
  "BQ-001": {
    id: "BQ-001",
    category: "actuarial",
    useCaseId: "actuarial-reasoning",
    difficulty: "hard",
    modality: "Actuarial · Solvency II",
    text: "Calculate the pure premium and risk margin for a commercial portfolio with expected loss ratio 62%, expense ratio 28%, and target combined ratio of 96%.",
    evidence: "Solvency II Directive 2009/138/EC Article 77 (Technical Provisions calculation), Article 86, and Commission Delegated Regulation (EU) 2015/35 Articles 37-39. Pure premium = Expected Loss = Loss Ratio * Gross Earned Premium.",
    keyTerms: [
      "pure premium",
      "expected loss ratio (62%)",
      "expense ratio (28%)",
      "underwriting margin (4%)",
      "combined ratio (96%)",
      "risk margin",
      "cost of capital (6%)",
      "SCR",
      "best estimate",
    ],
    goldResponse: `### Actuarial Determination of Pure Premium and Technical Provisions

1. **Portfolio Premium Composition:**
   - **Gross Written / Earned Premium (GWP/GEP):** Normalized to 100.0%.
   - **Pure Premium (Burning Cost / Expected Losses):**
     $$\\text{Pure Premium} = 62.0\\% \\times \\text{GEP}$$
     This represents the baseline actuarial best estimate of undiscounted claims cash-outflows before expense loadings.
   - **Operational Expense Ratio:** $28.0\\%$ of GEP (allocated loss adjustment expenses + commission + underwriting overhead).
   - **Target Combined Operating Ratio (COR):** $62.0\\% + 28.0\\% = 90.0\\%$, leaving an underwriting profit margin of $10.0\\%$ relative to gross premium, or $4.0\\%$ if target COR is bounded at $96.0\\%$ (accounting for $6.0\\%$ unallocated contingencies).

2. **Solvency II Risk Margin Calculation (Article 77 & Delegated Regulation 2015/35):**
   - The Risk Margin represents the cost of transferring the insurance liabilities to a reference undertaking.
   - Calculated via the Cost-of-Capital formula:
     $$\\text{Risk Margin} = \\text{CoC} \\times \\sum_{t \\ge 0} \\frac{\\text{SCR}_{RU}(t)}{(1 + r_{t+1})^{t+1}}$$
     where $\\text{CoC} = 6.0\\%$ per annum, and $\\text{SCR}_{RU}(t)$ is the projected Solvency Capital Requirement of the reference undertaking at year $t$ covering non-hedgeable underwriting, counterparty, and operational risks.
   - For this portfolio, with an annual loss run-off duration of 2.8 years, the required reference SCR is estimated at $24.5\\%$ of net best estimate claims reserve, yielding a calculated Risk Margin of approximately **$3.8\\% - 4.4\\%$** of the Best Estimate Liabilities (BEL).`,
  },

  "BQ-002": {
    id: "BQ-002",
    category: "solvency",
    useCaseId: "eiopa-regulatory",
    difficulty: "hard",
    modality: "Regulatory · EIOPA",
    text: "Explain the difference between the Solvency Capital Requirement (SCR) and the Minimum Capital Requirement (MCR) under EU Solvency II, and when is the supervisory ladder of intervention triggered?",
    evidence: "Directive 2009/138/EC Articles 100-102 (SCR calibration to 99.5% VaR 1-year), Articles 128-131 (MCR calibration 85% VaR and corridor limits 25%-45% of SCR), and Articles 136-144 (Supervisory Ladder of Intervention).",
    keyTerms: [
      "Solvency Capital Requirement (SCR)",
      "Minimum Capital Requirement (MCR)",
      "99.5% Value-at-Risk (1-year)",
      "85% Value-at-Risk",
      "MCR corridor (25% to 45%)",
      "supervisory ladder of intervention",
      "recovery plan (Article 138 - 6 months)",
      "short-term finance scheme (Article 139 - 3 months)",
      "withdrawal of authorization",
    ],
    goldResponse: `### SCR vs. MCR Framework and Supervisory Ladder of Intervention

#### 1. Core Structural Differences
- **Solvency Capital Requirement (SCR - Article 101):**
  - **Calibration:** 99.5% Value-at-Risk (VaR) over a 1-year time horizon (1-in-200 year extreme shock).
  - **Purpose:** Target level of eligible own funds required to absorb significant economic shocks and ensure ongoing business continuity as a going concern.
  - **Calculation:** Standard Formula or approved Internal Model (covering Market, Counterparty Default, Life/Non-Life Underwriting, and Operational risk).

- **Minimum Capital Requirement (MCR - Article 129):**
  - **Calibration:** 85% Value-at-Risk over a 1-year horizon, subject to an absolute corridor floor (between 25% and 45% of the calculated SCR) and an Absolute Minimum Floor (e.g. €4.0M for non-life).
  - **Purpose:** Absolute ultimate safety threshold below which policyholder security is terminally compromised.

#### 2. The Supervisory Ladder of Intervention
- **Level 1 — Breach of SCR (Article 138):**
  - When eligible own funds fall below the SCR, the insurer must notify National Competent Authorities (NCAs) immediately.
  - Within **2 months**, the insurer must submit a realistic **Recovery Plan** demonstrating how SCR compliance will be restored within **6 months** (extendable by 3 months in exceptional economic distress).
  - The supervisor may restrict free disposal of assets, dividends, and executive bonuses.

- **Level 2 — Breach of MCR (Article 139):**
  - Terminal safety net triggered immediately.
  - The undertaking must submit a realistic **Short-Term Finance Scheme** within **1 month** to restore eligible basic own funds to MCR within **3 months**.
  - If the scheme fails or is not approved, the supervisory authority is legally mandated to initiate formal **withdrawal of insurance authorization** and transfer of portfolio.`,
  },

  "BQ-003": {
    id: "BQ-003",
    category: "fraud",
    useCaseId: "claim-assessment",
    difficulty: "medium",
    modality: "Claims · Legal",
    text: "Analyse whether an insurer can exercise subrogation rights against a co-insured party under standard commercial property coverage where the policy includes a subrogation waiver clause for affiliates.",
    evidence: "Established insurance law principles (*Petrofina (UK) Ltd v Magnaload Ltd* [1984] and *Gard Marine & Energy Ltd v China National Chartering Co Ltd* [2017] UKSC 20). Insurers cannot subrogate against their own insured.",
    keyTerms: [
      "subrogation",
      "co-insured",
      "waiver of subrogation",
      "composite insurance",
      "joint insured",
      "underlying underlying contract",
      "Petrofina principle",
      "Gard Marine",
      "affiliate clause",
      "circuity of action",
    ],
    goldResponse: `### Subrogation Analysis Against Co-Insured Affiliates

#### 1. Fundamental Principle: No Subrogation Against an Insured
Under established common law and international marine/property insurance doctrine (*Petrofina (UK) Ltd v Magnaload Ltd* [1984] and *The Ocean Victory* [2017] UKSC 20), an insurer **cannot subrogate against its own co-insured**. The legal rationale rests on two distinct pillars:
1. **Circuity of Action:** If the insurer recovered from co-insured party B in tort/contract, party B would claim indemnity under the very same policy from the insurer.
2. **Implied Term / Commercial Intent:** The inclusion of multiple parties under a composite policy demonstrates a contractual intention to substitute insurance proceeds for inter-party liability.

#### 2. Effect of Express Subrogation Waiver Clause
Where the contract expressly includes an **Affiliate Subrogation Waiver**:
- The insurer explicitly contracts out of any subrogated recovery against entities designated as subsidiaries, parents, or affiliated sister corporations.
- Provided the co-insured qualifies under the policy's definition of "Affiliate", the waiver serves as an absolute affirmative defense against any third-party action.

#### 3. Exceptions & Scrutiny Checkpoints:
- **Fraud / Willful Misconduct:** Subrogation immunity does not protect a co-insured that committed intentional arson or fraudulent destruction of property.
- **Scope of Interest:** If party B was co-insured only for a specific limited property asset and the damage occurred to an un-shared facility outside the defined schedule, subrogation may survive unless barred by broad affiliate waiver wording.`,
  },

  "BQ-004": {
    id: "BQ-004",
    category: "solvency",
    useCaseId: "eiopa-regulatory",
    difficulty: "hard",
    modality: "Regulatory · Compliance",
    text: "What are the mandatory elements of the Own Risk and Solvency Assessment (ORSA) report required by EIOPA guidelines? How should 'management actions' be documented?",
    evidence: "EIOPA Guidelines on Own Risk and Solvency Assessment (EIOPA-BoS-14/259), Guidelines 1 to 24, Directive 2009/138/EC Article 45. Documentation of realistic management actions in stress testing.",
    keyTerms: [
      "ORSA",
      "EIOPA Guidelines (BoS-14/259)",
      "Article 45 Directive 2009/138/EC",
      "overall solvency needs",
      "continuous compliance with SCR/MCR",
      "deviations from standard formula",
      "stress testing and reverse stress testing",
      "realistic management actions",
      "governing body approval",
    ],
    goldResponse: `### Mandatory ORSA Components & Documentation of Management Actions

#### 1. Mandatory Elements of the ORSA Supervisory Report (EIOPA-BoS-14/259)
Under Article 45 of Directive 2009/138/EC and EIOPA ORSA Guidelines 1–24, an undertaking must document:
1. **Assessment of Overall Solvency Needs:** Quantitative and qualitative evaluation of all material risks (underwriting, market, credit, operational, strategic, and emerging risks like climate/cyber) taking into account the specific risk profile beyond standard formula assumptions.
2. **Continuous Compliance Assessment:** Forward-looking projections (typically 3–5 years matching the business planning horizon) testing prospective adherence to technical provisions, SCR, and MCR under baseline and stress scenarios.
3. **Standard Formula Significance Check:** Detailed assessment of whether the undertaking’s risk profile deviates significantly from the calibration assumptions of the standard formula.
4. **Stress Testing and Reverse Stress Testing:** Sensitivity analyses identifying extreme combinations of risk events that could cause the insurer’s business model to fail.
5. **Integration with Capital & Strategic Management:** Clear evidentiary trail proving that the Administrative, Management or Supervisory Body (AMSB) actively reviewed, challenged, and steered commercial decisions using ORSA results.

#### 2. Standard for Documenting "Management Actions" in Stress Scenarios
Under EIOPA Guideline 12, management actions modeled to restore solvency under stressed conditions must satisfy strict realism standards:
- **Feasibility & Timeline:** Specific operational lead times required to execute capital injections, reinsurance treaty restructuring, or dividend reductions.
- **Market Impact:** Realism in asset disposal assumptions during systemic market illiquidity.
- **Contractual & Legal Enforceability:** Verification that policy wordings, treaty commutation clauses, or debt covenants permit the projected action.
- **AMSB Formal Approval:** Explicit documentation showing executive committee approval for each contingent action plan.`,
  },

  "BQ-005": {
    id: "BQ-005",
    category: "multimodal",
    useCaseId: "fraud-detection",
    difficulty: "hard",
    modality: "Multimodal · Fraud · INS-MMBench",
    text: "Given a claim with three attached images (vehicle damage, repair estimate, accident scene), identify inconsistencies that may indicate a staged accident. Classify signals as primary vs. corroborative.",
    evidence: "INS-MMBench Multimodal Insurance Benchmark protocols, Insurance Fraud Bureau (IFB) staged collision indicators, and ISO/SAE collision trajectory forensic standards.",
    keyTerms: [
      "staged collision",
      "damage inconsistency",
      "primary fraud signals",
      "corroborative fraud signals",
      "impact direction mismatch",
      "pre-existing damage / oxidation",
      "repair estimate padding",
      "SIU referral",
      "photo metadata / EXIF",
    ],
    goldResponse: `### Multimodal Fraud Inconsistency Analysis (Vehicle Damage vs. Scene vs. Estimate)

#### 1. Primary Fraud Signals (High Forensic Weight — Direct Inconsistencies)
- **Impact Physics & Height Mismatch:** Structural damage height on the claimant vehicle bumper does not align with the impact point or bumper beam height of the alleged adverse vehicle or static barrier shown in scene imagery.
- **Damage Orientation / Trajectory Discrepancy:** Scrape patterns running vertically or obliquely despite the police report describing a straight linear low-speed rear-end shunt.
- **Pre-Existing Rust & Paint Oxidation:** Exposed metal along crush lines exhibits corrosion or rust accumulation, proving the fracture occurred weeks before the alleged FNOL timestamp.
- **Estimate Part Padding vs. Photo Reality:** The written estimate bills for complete replacement of headlights, radiator core support, and steering rack, yet photographic analysis shows no front-quarter crushing or fluid discharge.

#### 2. Corroborative Signals (Contextual / Environmental Indicators)
- **EXIF / Metadata Discordance:** Image capture timestamps or GPS geotags deviate from the reported accident location or time of day (e.g. midday shadows when crash reported at 11:30 PM).
- **Scene Debris Absence:** Photographs of the alleged scene show zero plastic shards, headlamp lens glass, or coolant stain on the tarmac despite total crumple claimed.
- **Tire Skid Mark Inconsistency:** Complete lack of panic braking tire marks or atypical single-vehicle scrape lines inconsistent with a two-car collision.

#### 3. Recommended Action Plan:
Immediate freeze on automated STP payout. Route file to Special Investigation Unit (SIU), preserve uncompressed image files, and issue formal request for digital vehicle telematics / EDR event data recorder records.`,
  },

  "SC-001": {
    id: "SC-001",
    category: "actuarial",
    useCaseId: "data-extraction",
    difficulty: "hard",
    modality: "Policy + Regulatory + Compliance Table · 8-step scenario",
    text: "Policy Slip Extraction & EIOPA Gap Audit: Extract all coverage terms → Cross-reference against EIOPA GL 21–26 → Calculate SCR impact → Classify findings by supervisory materiality → Draft referral notice.",
    evidence: "EIOPA Guidelines on Systems of Governance (EIOPA-BoS-14/253, Guidelines 21-26 on Operational Risk, Outsource Policy, and Underwriting limits), Solvency II SCR standard formula capital charges.",
    keyTerms: [
      "policy slip extraction",
      "EIOPA Guidelines 21-26",
      "SCR capital impact",
      "supervisory materiality (Tier 1/2/3)",
      "limit of indemnity",
      "aggregate deduction",
      "gap audit table",
      "referral notice",
    ],
    goldResponse: `### Policy Slip Extraction & EIOPA Gap Audit Report

#### Step 1: Structured Coverage Extraction
- **Named Insured:** Global Logistics Holding B.V.
- **Coverage Type:** Marine Cargo & Comprehensive Transit Liability.
- **Sum Insured / Limit of Indemnity:** €50,000,000 any one conveyance / €100,000,000 annual aggregate.
- **Deductible:** €250,000 per occurrence.
- **Territorial Scope:** Worldwide excluding sanctioned territories.

#### Step 2: Cross-Reference Against EIOPA GL 21–26 (Governance & Underwriting)
- **GL 21 (Underwriting Risk Acceptance):** The slip lacks clear documentation of treaty retrocession boundaries for aggregate accumulation across Antwerp port storage.
- **GL 24 (Contract Design):** Exclusions for cyber-induced navigational disruption rely on ambiguous Institute Cyber Attack Clause CL 380 wording without explicit LMA5403 affirmative write-back.
- **GL 26 (Outsourced Underwriting Limits):** Binder delegated authority exceeds MGA authorized capital deployment thresholds.

#### Step 3: SCR Capital Charge Assessment
- Unhedged marine underwriting exposure increases Marine/Aviation/Transport (MAT) premium risk standard formula factor by **+14.2%**, requiring **€3,840,000** additional Tier 1 basic own funds to maintain 145% target SCR coverage.

#### Step 4: Materiality Classification & Notice Draft
- **Materiality:** High (EIOPA Tier 1 supervisory concern).
- **Referral Notice:** Formally lodged to Chief Underwriting Officer and Risk Committee recommending moratorium on binding until retrocessional excess-of-loss capacity is validated.`,
  },

  "SC-002": {
    id: "SC-002",
    category: "underwriting",
    useCaseId: "policy-translation",
    difficulty: "hard",
    modality: "Multilingual · Policy · Legal",
    text: "Trilingual Clause Harmonisation: French source clause + IUA reference + flawed 2022 English translation → Identify untranslatable concepts → Diagnose prior errors → Produce corrected wording → Jurisdiction decision.",
    evidence: "Code des assurances (Articles L113-1, L113-8, L121-12), IUA / Lloyd's Market Association standard wordings, and comparative Anglo-French insurance jurisprudence.",
    keyTerms: [
      "force majeure",
      "déchéance de garantie",
      "faute intentionnelle",
      "subrogation",
      "condition precedent",
      "warranty vs condition",
      "corrected policy wording",
      "governing law & jurisdiction",
    ],
    goldResponse: `### Trilingual Policy Clause Harmonisation & Reconciliation

#### 1. Untranslatable Concepts & Legal Asymmetries
- **"Déchéance de garantie":** Flawed prior translation treated this as "policy voidance ab initio". Under French law, *déchéance* is the forfeiture of the right to indemnity for a specific claim due to post-loss breach (e.g. late notification), whereas the policy contract itself remains fully valid.
- **"Faute lourde" vs. "Gross Negligence":** French insurance law (*Cass. Civ.*) strictly distinguishes intentional fault (*faute intentionnelle*, non-insurable by public policy) from *faute lourde* (insurable unless expressly excluded), unlike common law gross negligence doctrines.

#### 2. Prior Translation Defect Diagnosis
The 2022 translation mistakenly drafted warranty clauses under English law terminology ("breach of warranty automatically discharges the insurer from liability under Section 33 Marine Insurance Act 1906"), which is legally invalid and unenforceable before French commercial courts (*Cour de cassation*).

#### 3. Corrected Harmonized Clause (Bilingual):
> *"Any failure by the Insured to submit claims documentation within thirty (30) days of discovery shall entitle the Insurer to claim compensation proportional to the demonstrated prejudice suffered, but shall not constitute forfeiture of cover unless caused by fraud."*

#### 4. Jurisdiction Recommendation:
Paris Commercial Court (*Tribunal de Commerce de Paris*) under French substantive law with standard English arbitration alternative (LCIA) for reinsurance disputes.`,
  },

  "SC-003": {
    id: "SC-003",
    category: "claims",
    useCaseId: "ai-triage",
    difficulty: "hard",
    modality: "Claims · Trimodal · FNOL",
    text: "Multi-Claim Inbound Triage: FNOL notification + Policy schedule + Loss history + UW file note → Coverage trigger → Policy defence (breach of condition) → Subrogation preservation → Gross/net reserve → SLA triage.",
    evidence: "Insurance Act 2015 Sections 10-11, ABI Claims Triage best practices, and standard commercial property damage claims adjusting procedures.",
    keyTerms: [
      "FNOL triage",
      "coverage trigger",
      "breach of condition precedent",
      "Insurance Act 2015 s.11",
      "subrogation preservation",
      "gross reserve",
      "net reserve",
      "SLA routing",
    ],
    goldResponse: `### Inbound FNOL Multi-Claim Triage Decision

#### 1. Coverage Trigger Analysis
- **Incident:** Fire outbreak in warehouse Sector C with water inundation damages.
- **Policy In-Force:** Commercial Combined Policy valid; peril "Fire & Extinguishing Expenses" triggered under Section 1.

#### 2. Potential Policy Defenses (Breach of Condition)
- **Alarm / Sprinkler Maintenance Warranty:** File notes reveal the quarterly sprinkler inspection was overdue by 42 days.
- **Statutory Evaluation (UK Insurance Act 2015 s.11):** Because the insured proves the fire originated from lightning ignition unaffected by sprinkler sensor delays, the insurer cannot repudiate liability if the breach could not have increased the risk of the loss occurring in the circumstances in which it occurred.

#### 3. Subrogation Rights Preservation
- Maintenance was contracted to third-party vendor *AquaFlow Ltd*. Notice must be dispatched within 48 hours to preserve rights against *AquaFlow's* public liability insurer for failure to repair pump valve.

#### 4. Reserves & Triage Routing:
- **Initial Gross Reserve:** €1,850,000 (Property damage €1.2M + Business Interruption €650k).
- **Net Reserve:** €1,100,000 (after €750k treaty excess-of-loss recovery).
- **SLA Classification:** **Tier 1 Complex / Major Loss**. Escalated immediately to Senior Chartered Adjuster (Loss Adjusting Partner) with 4-hour initial contact SLA.`,
  },

  "SC-004": {
    id: "SC-004",
    category: "claims",
    useCaseId: "claim-assessment",
    difficulty: "medium",
    modality: "Motor · Actuarial · Claims",
    text: "Motor Total Loss — GAP Reconciliation: Claim file + Valuation matrix + PHEV market data → TL threshold test → Agreed value → Net settlement → Finance shortfall → GAP trigger calculation.",
    evidence: "ABI Total Loss Code of Practice, Glass's / CAP HPI market valuation methods, and standard Finance GAP insurance policy wording.",
    keyTerms: [
      "total loss threshold",
      "constructive total loss (CTL)",
      "Glass's Guide / CAP HPI",
      "salvage category (Cat S/N)",
      "market value payout",
      "GAP insurance trigger",
      "finance shortfall reconciliation",
    ],
    goldResponse: `### Motor Total Loss & GAP Insurance Settlement Reconciliation

#### 1. Constructive Total Loss (CTL) Threshold Test
- **Pre-Accident Vehicle Value (CAP HPI Average):** £34,500 (2023 BMW 330e PHEV).
- **Repair Estimate:** £23,800 + Estimated supplementals £2,500 = £26,300.
- **Salvage Valuation (Category S - Structural Repairable):** £11,200 (32.5% of PAV).
- **Threshold Formula:** $\\text{Repair Cost} + \\text{Salvage} = £26,300 + £11,200 = £37,500 > \\text{PAV} (£34,500)$.
- **Determination:** **Constructive Total Loss (CTL) Category S confirmed.**

#### 2. Comprehensive Motor Policy Net Settlement
- Pre-Accident Agreed Market Value: £34,500.
- Less Policy Excess: -£500.
- **Net Motor Insurer Payout to Finance Company:** **£34,000**.

#### 3. Finance GAP Reconciliation
- Outstanding Contract Hire / PCP Settlement Balance: £39,850.
- Comprehensive Motor Settlement: £34,000.
- **GAP Shortfall:** $£39,850 - £34,000 = £5,850$.
- Plus Excess Contribution Waiver: +£500.
- **Total Approved GAP Settlement:** **£6,350 directly to finance creditor**. Complete settlement cleanly discharges policyholder liability.`,
  },

  "SC-005": {
    id: "SC-005",
    category: "solvency",
    useCaseId: "eiopa-regulatory",
    difficulty: "hard",
    modality: "Regulatory · EIOPA · Audit",
    text: "SFCR Compliance Audit: SFCR narrative extract + EIOPA GL 21–26 + Section audit checklist → Scope present/absent → Cite each legal requirement → Rank by supervisory materiality → Calibrated ratings → Internal audit notice.",
    evidence: "Directive 2009/138/EC Articles 51-56, Commission Delegated Regulation (EU) 2015/35 Articles 290-300 (SFCR Structure and Public Disclosure requirements).",
    keyTerms: [
      "SFCR audit",
      "EIOPA disclosure rules",
      "Article 51 Solvency II",
      "system of governance",
      "risk profile disclosure",
      "valuation for solvency purposes",
      "capital management section",
      "supervisory materiality",
    ],
    goldResponse: `### Solvency and Financial Condition Report (SFCR) Audit Findings

#### 1. Checklist Evaluation Against Delegated Regulation (EU) 2015/35
- **Section A (Business and Performance):** Compliant. Material business lines, geographical areas, and underwriting results disclosed.
- **Section B (System of Governance):** **Material Deficit Identified.** Fails to document the independent assessment of fit and proper requirements for key control function holders under Article 294.
- **Section C (Risk Profile):** **Deficit.** Off-balance sheet exposures and collateral arrangements under credit risk concentration lack required sensitivity tables.
- **Section D (Valuation for Solvency Purposes):** Partially compliant. Reinsurance recoverable valuation differences against IFRS 17 lack quantitative bridge table.
- **Section E (Capital Management):** Compliant. Tier 1/2 own funds reconciliation, SCR composition, and MCR calculation fully reported.

#### 2. Supervisory Materiality Ranking:
1. **High Priority (Supervisory Notice Risk):** Fit & Proper governance narrative omissions (Article 294).
2. **Medium Priority:** Reinsurance recoverables reconciliation bridge table (Article 296).
3. **Low Priority:** Graphical formatting enhancements in risk sensitivity charts.

#### 3. Formal Audit Notice Recommendation:
Issue immediate revision memorandum requiring Head of Regulatory Reporting to draft addendum for AMSB signature before public repository upload deadline.`,
  },

  "SC-006": {
    id: "SC-006",
    category: "underwriting",
    useCaseId: "underwriting-risk",
    difficulty: "hard",
    modality: "Underwriting · Property · Risk",
    text: "Commercial Property UW Referral: Risk submission + Rating matrix + ABI benchmarks + Market loss history → Composite risk profile → Sum insured adequacy (RICS) → Bristol 2024 precedent → EML + premium + BI calculations → Conditional accept/decline.",
    evidence: "ABI Technical Underwriting Guidelines for Commercial Property, RICS Rebuilding Cost Information Service standards, and BI Max Indemnity Period assessment guidelines.",
    keyTerms: [
      "underwriting referral",
      "composite risk profile",
      "RICS average condition",
      "Estimated Maximum Loss (EML / PML)",
      "Business Interruption (BI)",
      "maximum indemnity period (24 months)",
      "conditional acceptance terms",
    ],
    goldResponse: `### Commercial Property Underwriting Referral & Decision

#### 1. Composite Risk & Building Sum Insured Adequacy (RICS)
- **Risk Type:** Grade II listed industrial distribution warehouse with cold storage ammonia refrigeration.
- **Declared Building Sum Insured:** £18,500,000.
- **RICS Benchmark Rebuild Assessment:** Grade II historical building rebuild rate (£2,850/m² × 7,800m²) = £22,230,000.
- **Finding:** Under-insurance of approximately **16.8%**. Average clause condition must be explicitly invoked unless sum insured is adjusted upwards.

#### 2. Estimated Maximum Loss (EML / PML) Calculation
- Total Sum Insured (Building + Contents + 24-month BI): £34,000,000.
- Given the presence of fire-rated compartment walls and automatic deluge systems in cold-storage units, **EML is calibrated at 38% (£12,920,000)**.

#### 3. Rating & Terms Determination:
- **Base Rate:** 0.32% on Declared Values.
- **Hazard Surcharge:** +20% for ammonia refrigeration and lithium fork-lift charging bay.
- **Technical Premium:** £130,560 per annum net of IPT.
- **Decision:** **Conditional Acceptance** subject to:
  1. Increase in Building Declared Value to minimum £21,500,000;
  2. Warranty for 6-month thermal imaging inspection on electrical switchboards;
  3. £25,000 Flood & Storm excess.`,
  },

  "SC-007": {
    id: "SC-007",
    category: "fraud",
    useCaseId: "fraud-detection",
    difficulty: "hard",
    modality: "Fraud · Intelligence · Claims",
    text: "Staged Accident Fraud: PI claim file + Fraud signal matrix + Intel history (Apex Claims / Dr Shah / CFIT flag) → Primary vs. corroborative signals → Network link analysis → CFIT obligation → Fraud score → SIU referral + 14-day action plan.",
    evidence: "Insurance Fraud Enforcement Department (IFED) protocol, Insurance Fraud Bureau (IFB) intelligence dissemination, and SRA / GMC referral guidelines for organized cash-for-crash rings.",
    keyTerms: [
      "staged crash ring",
      "CFIT flag",
      "network link analysis",
      "Dr Shah / Apex Claims",
      "fraud propensity score (88/100)",
      "SIU escalation",
      "14-day action plan",
      "SRA / IFED referral",
    ],
    goldResponse: `### Fraud Intelligence & SIU Referral Escalation: Coordinated Crash Ring

#### 1. Fraud Signal Assessment
- **Primary Signals (Score: 50/50):**
  - Claim involves sudden, unexplained emergency braking on roundabout entry slip without third-party vehicle contact.
  - Medical report issued by *Dr. Shah* — previously flagged on Insurance Fraud Bureau (IFB) Watchlist for identical templated soft-tissue prognosis across 14 unrelated claims.
  - Claimant representative is *Apex Claims Management*, subject to active SRA regulatory intervention notice.
- **Corroborative Signals (Score: 38/50):**
  - All 4 occupants in claimant vehicle retained identical legal representation within 2 hours of incident.
  - Pre-existing bumper scuffs visible in recovered MOT inspection photographs from 3 months prior.

#### 2. Overall Fraud Risk Score: **88 / 100 (Critical Fraud Probability)**

#### 3. Mandatory Reporting & Regulatory Duty:
- Trigger statutory filing under the **Central Fraud Intelligence Threat (CFIT)** index and submit suspicious intelligence package to the **Insurance Fraud Enforcement Department (IFED)**.

#### 4. 14-Day SIU Operational Action Plan:
- **Days 1–3:** Secure digital preservation of council highway CCTV and claimant vehicle telematics.
- **Days 4–7:** Instruct forensic collision reconstruction engineer to model delta-V occupant acceleration forces.
- **Days 8–10:** Issue formal Section 29 Data Protection Act disclosure requests to co-insurers of the passengers.
- **Days 11–14:** Repudiate indemnity under Fraudulent Claims Condition and serve CPR Part 18 questions.`,
  },

  "SC-008": {
    id: "SC-008",
    category: "actuarial",
    useCaseId: "actuarial-reasoning",
    difficulty: "hard",
    modality: "Actuarial · Solvency II · Reserve",
    text: "Chain Ladder Reserve — Solvency II BE: Paid loss triangle + Development factors + Art. 77 + Ogden rate note → Triangle interpretation → EIOPA adjustments (inflation + Ogden) → Ultimate projection → IBNR → Discounted BE → Prudence assessment.",
    evidence: "Directive 2009/138/EC Article 77 (Best Estimate liabilities discount curve), UK Ogden discount rate revision (-0.25%), Mack Chain Ladder method.",
    keyTerms: [
      "paid loss triangle",
      "link ratios / development factors",
      "Mack method",
      "Ogden discount rate (-0.25%)",
      "claims inflation adjustment",
      "ultimate losses",
      "IBNR reserve",
      "discounted best estimate",
      "Solvency II Art. 77",
    ],
    goldResponse: `### Actuarial Chain Ladder Valuation & Solvency II Best Estimate

#### 1. Triangle Interpretation & Link Ratios ($f_j$)
- Standard volume-weighted link ratios derived across accident years 2021–2024:
  - $f_{12-24} = 1.482$
  - $f_{24-36} = 1.165$
  - $f_{36-48} = 1.042$
  - Tail factor to ultimate: $1.018$.

#### 2. Actuarial Adjustments (Macro & Legislative)
- **Ogden Rate Shock:** Shift in bodily injury discount rate from +0.25% to -0.25% increases catastrophic bodily injury lump-sum capitalization by an actuarial loading factor of **+11.4%** across open litigated claims in AY 2022–2024.
- **Excess Claims Inflation:** Medical and motor repair inflation applied at **+7.8%** above baseline CPI.

#### 3. Reserve Projection (Nominal & Discounted)
- **Cumulative Paid Losses:** €44,200,000.
- **Projected Undiscounted Ultimate Claims:** €68,450,000.
- **Total Undiscounted Reserve (Outstanding Case Reserves + IBNR):**
  $$\\text{IBNR} + \\text{OCR} = €68,450,000 - €44,200,000 = €24,250,000$$
- **Discounted Best Estimate Liabilities (BEL) via EIOPA Risk-Free Rate Curve:**
  Applying EIOPA Euro risk-free spot yield curve with volatility adjustment yields a discounted claims BEL of **€22,640,000**.
- **Solvency II Compliance Note:** Under Article 77, reserves must represent the probability-weighted expected present value without artificial margins of prudence; prudence is strictly segregated into the external Risk Margin.`,
  },
};

export function getBenchmarkGoldItem(id: string): BenchmarkGoldItem | undefined {
  return BENCHMARK_GOLD_REGISTRY[id];
}

export const pipelineStages = [
  "new",
  "researching",
  "shortlisted",
  "contacted",
  "diligence",
  "passed",
  "closed",
] as const;

export type PipelineStage = (typeof pipelineStages)[number];
export type EvidenceClassification = "observed" | "inferred" | "contradicted" | "unknown";

export type EvidenceItem = {
  id: string;
  category: string;
  classification: EvidenceClassification;
  claim: string;
  excerpt?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  confidence: number;
  observedAt: string;
};

export type AgencyRecord = {
  id: string;
  slug: string;
  name: string;
  city: string;
  countyName: string;
  countyCode?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  ownerName?: string;
  ownerAgeBand?: string;
  officeCount: number;
  agentCount: number;
  staffLow: number;
  staffBase: number;
  staffHigh: number;
  estimatedPremiumLow: number;
  estimatedPremiumBase: number;
  estimatedPremiumHigh: number;
  estimatedRevenue: number;
  estimatedEbitda: number;
  estimatedSde: number;
  successionScore: number;
  opportunityScore: number;
  confidenceScore: number;
  riskScore: number;
  pipelineStage: PipelineStage;
  researchStatus: string;
  summary: string;
  tags: string[];
  flags: string[];
  lastSourceRefreshAt?: string;
  lastResearchedAt?: string;
  evidence: EvidenceItem[];
};

export type FinancialAssumptions = {
  commissionRate: number;
  producerLoadedCost: number;
  supportLoadedCost: number;
  supportPerAgents: number;
  ownerReplacementComp: number;
  rentPerSquareFoot: number;
  squareFeetPerFte: number;
  minimumSquareFeetPerOffice: number;
  otherOpexRate: number;
};

export type FinancialResult = {
  premiumLow: number;
  premiumBase: number;
  premiumHigh: number;
  revenueLow: number;
  revenueBase: number;
  revenueHigh: number;
  producerPayroll: number;
  supportPayroll: number;
  occupancy: number;
  otherOpex: number;
  normalizedEbitda: number;
  sde: number;
  ebitdaMargin: number;
};

export type DealInputs = {
  purchaseMultiple: number;
  equityPercent: number;
  seniorDebtPercent: number;
  sellerNotePercent: number;
  earnoutPercent: number;
  seniorRate: number;
  seniorYears: number;
  sellerRate: number;
  sellerYears: number;
  yearOneRetention: number;
  annualGrowth: number;
  exitMultiple: number;
};

export type DealResult = {
  purchasePrice: number;
  buyerEquity: number;
  seniorDebt: number;
  sellerNote: number;
  earnout: number;
  annualSeniorDebtService: number;
  annualSellerDebtService: number;
  monthlySeniorDebtService: number;
  monthlySellerDebtService: number;
  dscr: number;
  yearOneCashFlow: number;
  fiveYearCashFlows: number[];
  fiveYearIrr: number;
  cashOnCash: number;
  exitValue: number;
  exitEquityValue: number;
};

export type AppMetrics = {
  totalAgencies: number;
  researched: number;
  shortlisted: number;
  averageOpportunityScore: number;
  totalEstimatedPremium: number;
  aiSpend: number;
  aiBudget: number;
};

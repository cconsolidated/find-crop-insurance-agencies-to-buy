import type { DealInputs, DealResult, FinancialAssumptions, FinancialResult } from "./types";

export const defaultFinancialAssumptions: FinancialAssumptions = {
  commissionRate: 0.14,
  producerLoadedCost: 75_250,
  supportLoadedCost: 63_650,
  supportPerAgents: 3,
  ownerReplacementComp: 115_000,
  rentPerSquareFoot: 24,
  squareFeetPerFte: 175,
  minimumSquareFeetPerOffice: 1_200,
  otherOpexRate: 0.08,
};

export const defaultDealInputs: DealInputs = {
  purchaseMultiple: 6,
  equityPercent: 0.1,
  seniorDebtPercent: 0.7,
  sellerNotePercent: 0.1,
  earnoutPercent: 0.1,
  seniorRate: 0.0975,
  seniorYears: 10,
  sellerRate: 0.07,
  sellerYears: 5,
  yearOneRetention: 0.92,
  annualGrowth: 0.02,
  exitMultiple: 6,
};

export function calculateFinancials(
  premiumBase: number,
  agents: number,
  offices: number,
  assumptions: FinancialAssumptions = defaultFinancialAssumptions,
  availablePremium = Number.POSITIVE_INFINITY,
): FinancialResult {
  const premiumLow = premiumBase * 0.5;
  const premiumHigh = Math.min(premiumBase * 1.5, availablePremium);
  const revenueLow = premiumLow * assumptions.commissionRate;
  const revenueBase = premiumBase * assumptions.commissionRate;
  const revenueHigh = premiumHigh * assumptions.commissionRate;
  const supportFte = Math.max(1, Math.ceil(agents / assumptions.supportPerAgents));
  const staffBase = agents + supportFte;
  const producerPayroll = Math.max(0, agents - 1) * assumptions.producerLoadedCost;
  const supportPayroll = supportFte * assumptions.supportLoadedCost;
  const squareFeet = Math.max(
    assumptions.minimumSquareFeetPerOffice * Math.max(1, offices),
    assumptions.squareFeetPerFte * staffBase,
  );
  const occupancy = squareFeet * assumptions.rentPerSquareFoot;
  const otherOpex = revenueBase * assumptions.otherOpexRate;
  const normalizedEbitda = Math.max(
    0,
    revenueBase - producerPayroll - supportPayroll - assumptions.ownerReplacementComp - occupancy - otherOpex,
  );
  const sde = normalizedEbitda + assumptions.ownerReplacementComp;

  return {
    premiumLow,
    premiumBase,
    premiumHigh,
    revenueLow,
    revenueBase,
    revenueHigh,
    producerPayroll,
    supportPayroll,
    occupancy,
    otherOpex,
    normalizedEbitda,
    sde,
    ebitdaMargin: revenueBase > 0 ? normalizedEbitda / revenueBase : 0,
  };
}

export function payment(principal: number, annualRate: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const periods = years * 12;
  if (monthlyRate === 0) return principal / periods;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -periods));
}

export function remainingBalance(principal: number, annualRate: number, years: number, paymentsMade: number) {
  if (principal <= 0) return 0;
  const periods = years * 12;
  const paid = Math.min(periods, Math.max(0, paymentsMade));
  if (paid >= periods) return 0;
  const monthlyPayment = payment(principal, annualRate, years);
  const rate = annualRate / 12;
  if (rate === 0) return Math.max(0, principal - monthlyPayment * paid);
  return Math.max(0, principal * Math.pow(1 + rate, paid) - monthlyPayment * ((Math.pow(1 + rate, paid) - 1) / rate));
}

export function internalRateOfReturn(cashFlows: number[]) {
  if (cashFlows.length < 2 || cashFlows[0] >= 0) return 0;
  let low = -0.95;
  let high = 5;

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const rate = (low + high) / 2;
    const npv = cashFlows.reduce((total, cashFlow, index) => total + cashFlow / Math.pow(1 + rate, index), 0);
    if (Math.abs(npv) < 0.01) return rate;
    if (npv > 0) low = rate;
    else high = rate;
  }

  return (low + high) / 2;
}

export function calculateDeal(
  normalizedEbitda: number,
  inputs: DealInputs = defaultDealInputs,
): DealResult {
  const purchasePrice = Math.max(0, normalizedEbitda * inputs.purchaseMultiple);
  const buyerEquity = purchasePrice * inputs.equityPercent;
  const seniorDebt = purchasePrice * inputs.seniorDebtPercent;
  const sellerNote = purchasePrice * inputs.sellerNotePercent;
  const earnout = purchasePrice * inputs.earnoutPercent;
  const annualSeniorDebtService = payment(seniorDebt, inputs.seniorRate, inputs.seniorYears) * 12;
  const annualSellerDebtService = payment(sellerNote, inputs.sellerRate, inputs.sellerYears) * 12;
  const totalDebtService = annualSeniorDebtService + annualSellerDebtService;
  const yearOneEbitda = normalizedEbitda * inputs.yearOneRetention;
  const dscr = totalDebtService > 0 ? yearOneEbitda / totalDebtService : 0;
  const yearOneCashFlow = yearOneEbitda - totalDebtService - earnout / 3;
  const operatingCashFlows = Array.from({ length: 5 }, (_, index) => {
    const ebitda = yearOneEbitda * Math.pow(1 + inputs.annualGrowth, index);
    const earnoutPayment = index < 3 ? earnout / 3 : 0;
    return ebitda - totalDebtService - earnoutPayment;
  });
  const yearFiveEbitda = yearOneEbitda * Math.pow(1 + inputs.annualGrowth, 4);
  const exitValue = yearFiveEbitda * inputs.exitMultiple;
  const seniorBalanceAtExit = remainingBalance(seniorDebt, inputs.seniorRate, inputs.seniorYears, 60);
  const sellerBalanceAtExit = remainingBalance(sellerNote, inputs.sellerRate, inputs.sellerYears, 60);
  const exitEquityValue = Math.max(0, exitValue - seniorBalanceAtExit - sellerBalanceAtExit);
  const fiveYearCashFlows = [-buyerEquity, ...operatingCashFlows];
  fiveYearCashFlows[fiveYearCashFlows.length - 1] += exitEquityValue;

  return {
    purchasePrice,
    buyerEquity,
    seniorDebt,
    sellerNote,
    earnout,
    annualSeniorDebtService,
    annualSellerDebtService,
    monthlySeniorDebtService: annualSeniorDebtService / 12,
    monthlySellerDebtService: annualSellerDebtService / 12,
    dscr,
    yearOneCashFlow,
    fiveYearCashFlows,
    fiveYearIrr: internalRateOfReturn(fiveYearCashFlows),
    cashOnCash: buyerEquity > 0 ? yearOneCashFlow / buyerEquity : 0,
    exitValue,
    exitEquityValue,
  };
}

export function canStartResearch(spent: number, budget = 20, reserve = 0.75) {
  return budget - spent >= reserve;
}

export function allocateCountyPremiums(
  markets: Array<{ countyCode: string; totalPremium: number }>,
  coverage: Array<{ agencyId: string; countyCode: string; activeAgentCount: number }>,
) {
  const agentTotals = new Map<string, number>();
  for (const link of coverage) agentTotals.set(link.countyCode, (agentTotals.get(link.countyCode) ?? 0) + link.activeAgentCount);
  const marketMap = new Map(markets.map((market) => [market.countyCode, market]));
  const allocations = new Map<string, { low: number; base: number; high: number }>();
  for (const link of coverage) {
    const market = marketMap.get(link.countyCode);
    const denominator = agentTotals.get(link.countyCode) ?? 0;
    if (!market || denominator <= 0 || link.activeAgentCount <= 0) continue;
    const base = Math.min(market.totalPremium, market.totalPremium * (link.activeAgentCount / denominator));
    const current = allocations.get(link.agencyId) ?? { low: 0, base: 0, high: 0 };
    current.low += base * .5;
    current.base += base;
    current.high += Math.min(market.totalPremium, base * 1.5);
    allocations.set(link.agencyId, current);
  }
  return allocations;
}

export function calculateOpportunityScore(input: {
  succession: number;
  financial: number;
  ownerOperated: number;
  confidence: number;
  risk: number;
}) {
  return Math.round(
    input.succession * 0.35 +
      input.financial * 0.25 +
      input.ownerOperated * 0.15 +
      input.confidence * 0.15 +
      (100 - input.risk) * 0.1,
  );
}

export function formatCurrency(value: number, compact = true) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateCountyPremiums,
  calculateDeal,
  calculateFinancials,
  calculateOpportunityScore,
  canStartResearch,
  defaultDealInputs,
  internalRateOfReturn,
  payment,
  remainingBalance,
} from "../lib/calculations";

test("county premium is allocated by active-agent share with capped high cases", () => {
  const result = allocateCountyPremiums(
    [{ countyCode: "303", totalPremium: 9_000_000 }],
    [{ agencyId: "a", countyCode: "303", activeAgentCount: 1 }, { agencyId: "b", countyCode: "303", activeAgentCount: 2 }],
  );
  assert.deepEqual(result.get("a"), { low: 1_500_000, base: 3_000_000, high: 4_500_000 });
  assert.deepEqual(result.get("b"), { low: 3_000_000, base: 6_000_000, high: 9_000_000 });
});

test("14% commission and normalized EBITDA/SDE math is transparent", () => {
  const result = calculateFinancials(10_000_000, 3, 1);
  assert.ok(Math.abs(result.revenueBase - 1_400_000) < .01);
  assert.equal(result.premiumLow, 5_000_000);
  assert.equal(result.premiumHigh, 15_000_000);
  assert.equal(result.producerPayroll, 150_500);
  assert.equal(result.supportPayroll, 63_650);
  assert.equal(result.occupancy, 28_800);
  assert.ok(Math.abs(result.otherOpex - 112_000) < .01);
  assert.ok(Math.abs(result.normalizedEbitda - 930_050) < .01);
  assert.ok(Math.abs(result.sde - 1_045_050) < .01);
});

test("high book estimate is capped by available county premium", () => {
  assert.equal(calculateFinancials(8_000_000, 2, 1, undefined, 10_000_000).premiumHigh, 10_000_000);
});

test("opportunity score follows the published weights", () => {
  assert.equal(calculateOpportunityScore({ succession: 80, financial: 70, ownerOperated: 90, confidence: 60, risk: 20 }), 76);
});

test("debt payment, remaining balance, DSCR, and exit debt payoff are calculated", () => {
  const monthly = payment(700_000, .0975, 10);
  assert.ok(monthly > 9_000 && monthly < 9_300);
  const balance = remainingBalance(700_000, .0975, 10, 60);
  assert.ok(balance > 420_000 && balance < 500_000);
  const deal = calculateDeal(500_000, defaultDealInputs);
  assert.equal(deal.purchasePrice, 3_000_000);
  assert.equal(deal.monthlySeniorDebtService, deal.annualSeniorDebtService / 12);
  assert.ok(deal.dscr > 1);
  assert.ok(deal.exitEquityValue < deal.exitValue);
  assert.ok(Number.isFinite(deal.fiveYearIrr));
});

test("IRR solver handles a standard investment", () => {
  const irr = internalRateOfReturn([-100, 60, 60]);
  assert.ok(Math.abs(irr - .13066) < .001);
});

test("research reserve stops the next request before the $20 cap", () => {
  assert.equal(canStartResearch(19.24, 20, .75), true);
  assert.equal(canStartResearch(19.26, 20, .75), false);
});

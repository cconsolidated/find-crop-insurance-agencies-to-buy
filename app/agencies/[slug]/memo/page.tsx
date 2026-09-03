import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAgencyBySlug } from "@/lib/agencies";
import { calculateDeal, formatCurrency, formatPercent } from "@/lib/calculations";
import { Classification } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function MemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) notFound();
  const deal = calculateDeal(agency.estimatedEbitda);
  return <div className="memo-page">
    <div className="memo-actions no-print"><Link href={`/agencies/${agency.slug}`}><ChevronLeft size={15}/>Back to profile</Link><PrintButton/></div>
    <header className="memo-header"><div><p>FIELDNOTE · ACQUISITION SCREEN</p><h1>{agency.name}</h1><span>{agency.city}, {agency.countyName} County, Texas</span></div><div><small>Opportunity score</small><strong>{agency.opportunityScore}</strong><span>of 100</span></div></header>
    <section className="memo-summary"><h2>Screening thesis</h2><p>{agency.summary}</p><div>{agency.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
    <section className="memo-metrics"><div><small>Estimated premium</small><strong>{formatCurrency(agency.estimatedPremiumBase)}</strong><span>{formatCurrency(agency.estimatedPremiumLow)}–{formatCurrency(agency.estimatedPremiumHigh)}</span></div><div><small>Gross revenue</small><strong>{formatCurrency(agency.estimatedRevenue)}</strong><span>14% commission assumption</span></div><div><small>Normalized EBITDA</small><strong>{formatCurrency(agency.estimatedEbitda)}</strong><span>{formatPercent(agency.estimatedRevenue ? agency.estimatedEbitda / agency.estimatedRevenue : 0)} margin</span></div><div><small>Estimated team</small><strong>{agency.staffLow}–{agency.staffHigh}</strong><span>{agency.officeCount} office(s)</span></div></section>
    <div className="memo-columns"><section><h2>Succession & ownership</h2><dl><div><dt>Principal</dt><dd>{agency.ownerName ?? "Not established"}</dd></div><div><dt>Age band</dt><dd>{agency.ownerAgeBand ?? "Unknown"}</dd></div><div><dt>Succession likelihood</dt><dd>{agency.successionScore}/100</dd></div><div><dt>Evidence confidence</dt><dd>{agency.confidenceScore}%</dd></div><div><dt>Research status</dt><dd>{agency.researchStatus}</dd></div></dl></section><section><h2>Base deal screen</h2><dl><div><dt>Indicative price</dt><dd>{formatCurrency(deal.purchasePrice)}</dd></div><div><dt>Buyer cash</dt><dd>{formatCurrency(deal.buyerEquity)}</dd></div><div><dt>Monthly debt service</dt><dd>{formatCurrency(deal.monthlySeniorDebtService + deal.monthlySellerDebtService)}</dd></div><div><dt>Year-one DSCR</dt><dd>{deal.dscr.toFixed(2)}x</dd></div><div><dt>5-year levered IRR</dt><dd>{formatPercent(deal.fiveYearIrr)}</dd></div></dl></section></div>
    <section className="memo-evidence"><h2>Evidence ledger</h2>{agency.evidence.map((item) => <article key={item.id}><Classification value={item.classification}/><div><strong>{item.claim}</strong><span>{item.sourceTitle ?? "Source not captured"} · confidence {item.confidence}%</span></div></article>)}</section>
    <footer className="memo-footer"><strong>Screening estimate — not diligence</strong><p>County allocation does not establish the agency’s actual book. This memo does not verify commissions, expenses, ownership, succession, seller interest, valuation, or financing eligibility. “No named successor appeared” never means no successor exists.</p></footer>
  </div>;
}

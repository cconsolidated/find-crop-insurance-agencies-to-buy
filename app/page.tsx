import Link from "next/link";
import { ArrowRight, DatabaseZap, Search, Sparkles } from "lucide-react";
import { AgencyMap } from "@/components/agency-map";
import { OpportunityChart } from "@/components/dashboard-charts";
import { OpportunityFunnel } from "@/components/opportunity-funnel";
import { ConfidenceBar, Eyebrow, Score, StagePill } from "@/components/ui";
import { getAgencies, getAppMetrics } from "@/lib/agencies";
import { formatCurrency } from "@/lib/calculations";
import { hasDatabase } from "@/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const agencies = await getAgencies();
  const metrics = await getAppMetrics(agencies);
  const leaders = [...agencies].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
  return <div className="page-shell">
    <header className="page-header"><div><Eyebrow>Texas acquisition desk</Eyebrow><h1>Find the next book worth owning.</h1><p>Rank independent crop-insurance agencies by economics, succession signals, and the quality of the public evidence.</p></div><div className="header-actions"><Link href="/agencies" className="button secondary"><Search size={16}/>Search agencies</Link><Link href="/settings" className="button primary"><Sparkles size={16}/>Run research</Link></div></header>
    {!hasDatabase() && <div className="demo-banner"><DatabaseZap size={18}/><span><strong>Demo mode:</strong> these are synthetic profiles, not real acquisition targets.</span><Link href="/settings">Connect data <ArrowRight size={14}/></Link></div>}
    <section className="metric-strip"><div><small>Agency locations</small><strong>{metrics.totalAgencies.toLocaleString()}</strong><span>Texas crop directory</span></div><div><small>Research complete</small><strong>{metrics.researched}</strong><span>of 25 deep profiles</span></div><div><small>Pipeline priority</small><strong>{metrics.shortlisted}</strong><span>shortlisted or diligence</span></div><div><small>Estimated premium</small><strong>{formatCurrency(metrics.totalEstimatedPremium)}</strong><span>base allocation</span></div><div className="budget-card"><small>AI research budget</small><strong>${metrics.aiSpend.toFixed(2)} <em>/ ${metrics.aiBudget}</em></strong><span className="budget-track"><i style={{ width: `${Math.min(100, (metrics.aiSpend / metrics.aiBudget) * 100)}%` }}/></span></div></section>
    <div className="dashboard-grid"><section className="map-section"><div className="section-heading"><div><Eyebrow>Market landscape</Eyebrow><h2>Opportunity across Texas</h2></div><Link href="/agencies">Open directory <ArrowRight size={14}/></Link></div><AgencyMap agencies={agencies}/></section><section className="panel chart-panel"><div className="section-heading"><div><Eyebrow>Ranked signal</Eyebrow><h2>Top opportunity scores</h2></div><span>0–100</span></div><OpportunityChart agencies={leaders}/><p>Score blends succession likelihood, economics, owner-operated fit, confidence, and risk.</p><div className="funnel-heading"><strong>Opportunity funnel</strong><span>Screening stages</span></div><OpportunityFunnel agencies={agencies}/></section></div>
    <section className="panel lead-panel"><div className="section-heading"><div><Eyebrow>Acquisition queue</Eyebrow><h2>Highest-priority agencies</h2></div><Link href="/agencies">View all {agencies.length}<ArrowRight size={14}/></Link></div><div className="lead-list">{leaders.map((agency, index) => <Link href={`/agencies/${agency.slug}`} key={agency.id} className="lead-row"><span className="rank">{String(index + 1).padStart(2, "0")}</span><Score value={agency.opportunityScore} size="sm"/><span className="lead-name"><strong>{agency.name}</strong><small>{agency.city} · {agency.countyName} County</small></span><span><small>Est. revenue</small><strong>{formatCurrency(agency.estimatedRevenue)}</strong></span><span><small>Team</small><strong>{agency.staffLow}–{agency.staffHigh}</strong></span><span><small>Evidence</small><ConfidenceBar value={agency.confidenceScore}/></span><StagePill stage={agency.pipelineStage}/><ArrowRight className="row-arrow" size={17}/></Link>)}</div></section>
    <footer className="method-note"><strong>Decision-use note</strong><p>Every figure is a screening estimate. It does not verify the book, commissions, expenses, ownership, family situation, willingness to sell, or financing eligibility.</p></footer>
  </div>;
}

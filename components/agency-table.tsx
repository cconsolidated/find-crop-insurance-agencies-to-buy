"use client";

import Link from "next/link";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { AgencyRecord, PipelineStage } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { ConfidenceBar, StagePill } from "./ui";

export function AgencyTable({ agencies }: { agencies: AgencyRecord[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<PipelineStage | "all">("all");
  const [minimum, setMinimum] = useState(0);
  const [county, setCounty] = useState("all");
  const [targetFit, setTargetFit] = useState(false);
  const counties = useMemo(() => [...new Set(agencies.map((agency) => agency.countyName))].sort(), [agencies]);
  const filtered = useMemo(() => agencies.filter((agency) => {
    const haystack = `${agency.name} ${agency.city} ${agency.countyName}`.toLowerCase();
    const inTarget = agency.estimatedRevenue >= 300_000 && agency.estimatedRevenue <= 3_000_000 && agency.staffBase >= 2 && agency.staffBase <= 15;
    return haystack.includes(query.toLowerCase()) && (stage === "all" || agency.pipelineStage === stage) && (county === "all" || agency.countyName === county) && agency.opportunityScore >= minimum && (!targetFit || inTarget);
  }), [agencies, county, minimum, query, stage, targetFit]);
  return <>
    <div className="table-tools">
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agency, city, or county" aria-label="Search agencies" /></label>
      <label className="select-box">Stage<select value={stage} onChange={(event) => setStage(event.target.value as PipelineStage | "all")}><option value="all">All stages</option><option value="new">New</option><option value="researching">Researching</option><option value="shortlisted">Shortlisted</option><option value="contacted">Contacted</option><option value="diligence">Diligence</option><option value="passed">Passed</option></select></label>
      <label className="select-box">County<select value={county} onChange={(event) => setCounty(event.target.value)}><option value="all">All counties</option>{counties.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="select-box"><SlidersHorizontal size={15} />Min score<select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}><option value="0">Any</option><option value="60">60+</option><option value="70">70+</option><option value="80">80+</option></select></label>
      <label className="target-toggle"><input type="checkbox" checked={targetFit} onChange={(event) => setTargetFit(event.target.checked)}/><span>Target profile</span></label>
      <a className="button secondary" href="/api/export"><Download size={16} />Export CSV</a>
    </div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Agency</th><th>County</th><th>Est. revenue</th><th>Staff</th><th>Succession</th><th>Confidence</th><th>Stage</th><th>Score</th></tr></thead><tbody>{filtered.map((agency) => <tr key={agency.id}><td><Link href={`/agencies/${agency.slug}`} className="agency-link"><strong>{agency.name}</strong><small>{agency.city}, TX · {agency.researchStatus}</small></Link></td><td>{agency.countyName}</td><td><strong>{formatCurrency(agency.estimatedRevenue)}</strong><small>14% of est. premium</small></td><td>{agency.staffLow}–{agency.staffHigh}</td><td><span className={agency.successionScore >= 75 ? "signal-high" : "signal-mid"}>{agency.successionScore}/100</span></td><td><ConfidenceBar value={agency.confidenceScore} /></td><td><StagePill stage={agency.pipelineStage} /></td><td><span className="table-score">{agency.opportunityScore}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">No agencies match these filters.</div>}</div>
  </>;
}

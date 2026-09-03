"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Plus, Printer } from "lucide-react";
import type { AgencyRecord, PipelineStage } from "@/lib/types";
import { pipelineStages } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { Classification, ConfidenceBar, Score, StagePill } from "./ui";
import { DealLab } from "./deal-lab";

const tabs = ["Overview", "Evidence", "Economics", "Deal model", "Activity"] as const;

export function AgencyProfile({ agency }: { agency: AgencyRecord }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [stage, setStage] = useState(agency.pipelineStage);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  async function updateStage(next: PipelineStage) {
    const prior = stage; setStage(next); setMessage("Saving…");
    const response = await fetch(`/api/agencies/${agency.slug}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ pipelineStage: next }) });
    const data = await response.json();
    if (!response.ok) setStage(prior);
    setMessage(response.ok ? "Pipeline updated." : data.error ?? "Could not save.");
  }
  async function addNote() {
    if (!note.trim()) return;
    setMessage("Saving…");
    const response = await fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "note", agencyId: agency.id, body: note }) });
    const data = await response.json();
    if (response.ok) setNote("");
    setMessage(response.ok ? "Note saved." : data.error ?? "Could not save note.");
  }
  async function addTask() {
    if (!task.trim()) return;
    setMessage("Saving…");
    const response = await fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "task", agencyId: agency.id, title: task }) });
    const data = await response.json();
    if (response.ok) setTask("");
    setMessage(response.ok ? "Follow-up task saved." : data.error ?? "Could not save task.");
  }
  return <>
    <div className="profile-hero panel">
      <div className="profile-score"><Score value={agency.opportunityScore} size="lg" /><span>Opportunity score</span></div>
      <div className="profile-title"><div className="title-line"><h1>{agency.name}</h1><StagePill stage={stage} /></div><p>{agency.city}, {agency.countyName} County, Texas · {agency.agentCount} licensed/RMA agent{agency.agentCount === 1 ? "" : "s"}</p><div className="tag-row">{agency.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      <div className="profile-actions no-print"><label>Pipeline stage<select value={stage} onChange={(event) => updateStage(event.target.value as PipelineStage)}>{pipelineStages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><Link className="button secondary" href={`/agencies/${agency.slug}/memo`}><Printer size={16} />Print memo</Link></div>
    </div>
    <div className="tabbar no-print" role="tablist">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Overview" && <div className="two-col">
      <section className="panel prose-panel"><p className="eyebrow">Screening brief</p><h2>Why it is on the board</h2><p className="lead">{agency.summary}</p><div className="signal-grid"><div><small>Succession likelihood</small><strong>{agency.successionScore}/100</strong><span>{agency.successionScore >= 75 ? "Priority signal" : "Needs more evidence"}</span></div><div><small>Evidence confidence</small><strong>{agency.confidenceScore}%</strong><ConfidenceBar value={agency.confidenceScore} /></div><div><small>Owner / principal</small><strong>{agency.ownerName ?? "Not established"}</strong><span>{agency.ownerAgeBand ?? "Age band unknown"}</span></div><div><small>Team estimate</small><strong>{agency.staffLow}–{agency.staffHigh}</strong><span>employees / contractors</span></div></div></section>
      <section className="panel source-panel"><p className="eyebrow">Decision discipline</p><h3>What the signal means</h3><div className="callout"><CheckCircle2 size={19}/><p><strong>No successor found</strong> means none appeared in the sources reviewed. It does not mean no successor exists.</p></div><ul className="check-list"><li>Premium is allocated from county market share.</li><li>Revenue assumes 14% gross commission.</li><li>Employee count is a cited or modelled range.</li><li>Seller interest has not been verified.</li></ul>{message && <p className="form-notice">{message}</p>}</section>
    </div>}
    {tab === "Evidence" && <section className="panel evidence-panel"><div className="section-heading"><div><p className="eyebrow">Research ledger</p><h2>Claims and supporting sources</h2></div><span>{agency.evidence.length} items</span></div>{agency.evidence.length ? <div className="evidence-list">{agency.evidence.map((item) => <article key={item.id}><div><Classification value={item.classification} /><span className="category">{item.category}</span></div><h3>{item.claim}</h3>{item.excerpt && <p>“{item.excerpt}”</p>}<footer><span>Confidence {item.confidence}%</span>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceTitle ?? "Source"}<ExternalLink size={13} /></a>}</footer></article>)}</div> : <div className="empty-state">Research has not added source-backed evidence yet.</div>}</section>}
    {tab === "Economics" && <div className="economics-grid">
      <section className="panel"><p className="eyebrow">Estimated book</p><h2>{formatCurrency(agency.estimatedPremiumBase)}</h2><p className="muted">Attributable annual premium — base case</p><div className="estimate-band"><span><small>Low · 50%</small><strong>{formatCurrency(agency.estimatedPremiumLow)}</strong></span><span className="base"><small>Base · 100%</small><strong>{formatCurrency(agency.estimatedPremiumBase)}</strong></span><span><small>High · 150%</small><strong>{formatCurrency(agency.estimatedPremiumHigh)}</strong></span></div><p className="disclosure">Equal-agent allocation across reported office/service counties, capped by the county market. Agents may write business outside their listed county.</p></section>
      <section className="panel"><p className="eyebrow">Normalized earnings</p><div className="waterfall"><div><span>Gross commission revenue</span><strong>{formatCurrency(agency.estimatedRevenue)}</strong></div><div><span>Normalized EBITDA</span><strong>{formatCurrency(agency.estimatedEbitda)}</strong></div><div><span>SDE</span><strong>{formatCurrency(agency.estimatedSde)}</strong></div><div><span>EBITDA margin</span><strong>{formatPercent(agency.estimatedRevenue ? agency.estimatedEbitda / agency.estimatedRevenue : 0)}</strong></div></div><p className="disclosure">Includes wage-benchmark payroll, 20% burden, replacement management, modelled occupancy, and 8% other operating expenses.</p></section>
      <section className="panel valuation-panel"><p className="eyebrow">Valuation cross-check</p><h3>Two lenses, one diligence range</h3><div className="valuation-row"><span>4x / 6x / 8x EBITDA</span><strong>{formatCurrency(agency.estimatedEbitda * 4)} · {formatCurrency(agency.estimatedEbitda * 6)} · {formatCurrency(agency.estimatedEbitda * 8)}</strong></div><div className="valuation-row"><span>1.5x / 2.0x / 2.5x revenue</span><strong>{formatCurrency(agency.estimatedRevenue * 1.5)} · {formatCurrency(agency.estimatedRevenue * 2)} · {formatCurrency(agency.estimatedRevenue * 2.5)}</strong></div></section>
    </div>}
    {tab === "Deal model" && <DealLab agency={agency} />}
    {tab === "Activity" && <div className="two-col"><section className="panel"><p className="eyebrow">Deal notes</p><h2>Add a note</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={6} placeholder="Record a call, diligence question, or thesis update…"/><button className="button primary" onClick={addNote}><Plus size={16}/>Save note</button><div className="task-entry"><input value={task} onChange={(event) => setTask(event.target.value)} placeholder="Add a follow-up task…"/><button className="button secondary" onClick={addTask}>Add task</button></div>{message && <p className="form-notice">{message}</p>}</section><section className="panel"><p className="eyebrow">Suggested next step</p><h2>Verify the book before contact</h2><ol className="numbered"><li>Confirm carrier appointments and active producer licenses.</li><li>Request 3 years of policy-level retention and commissions.</li><li>Normalize owner compensation and producer agreements.</li><li>Ask directly about timing and succession preferences.</li></ol></section></div>}
  </>;
}

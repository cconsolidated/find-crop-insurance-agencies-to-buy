"use client";

import Link from "next/link";
import { useState } from "react";
import type { AgencyRecord, PipelineStage } from "@/lib/types";
import { pipelineStages } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";

const labels: Record<PipelineStage, string> = { new: "New", researching: "Researching", shortlisted: "Shortlisted", contacted: "Contacted", diligence: "Diligence", passed: "Passed", closed: "Closed" };

export function PipelineBoard({ initial }: { initial: AgencyRecord[] }) {
  const [agencies, setAgencies] = useState(initial);
  const [notice, setNotice] = useState("");
  async function move(agency: AgencyRecord, stage: PipelineStage) {
    setAgencies((rows) => rows.map((row) => row.id === agency.id ? { ...row, pipelineStage: stage } : row));
    const response = await fetch("/api/pipeline", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ agencyId: agency.id, stage }) });
    const data = await response.json();
    if (!response.ok) {
      setAgencies(initial);
      setNotice(data.error ?? "Could not save pipeline change.");
    } else setNotice("Pipeline saved.");
  }
  return <>{notice && <div className="inline-notice">{notice}</div>}<div className="pipeline-board">{pipelineStages.map((stage) => { const rows = agencies.filter((agency) => agency.pipelineStage === stage); return <section className="pipeline-column" key={stage}><header><span>{labels[stage]}</span><b>{rows.length}</b></header><div>{rows.map((agency) => <article className="pipeline-card" key={agency.id}><Link href={`/agencies/${agency.slug}`}><strong>{agency.name}</strong><span>{agency.city} · {formatCurrency(agency.estimatedRevenue)} rev.</span></Link><div><span className="mini-score">{agency.opportunityScore}</span><select aria-label={`Move ${agency.name}`} value={stage} onChange={(event) => move(agency, event.target.value as PipelineStage)}>{pipelineStages.map((option) => <option key={option} value={option}>{labels[option]}</option>)}</select></div></article>)}</div></section>; })}</div></>;
}


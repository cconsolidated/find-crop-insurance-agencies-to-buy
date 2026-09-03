import { count, desc, eq } from "drizzle-orm";
import { DataControls } from "@/components/data-controls";
import { MatchQueue, type MatchItem } from "@/components/match-queue";
import { Eyebrow } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { agencies, ambiguousMatches, appSettings, importRuns } from "@/db/schema";
import { defaultFinancialAssumptions } from "@/lib/calculations";
import type { FinancialAssumptions } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const connected = hasDatabase();
  let ambiguous = 0;
  let matchItems: MatchItem[] = [];
  let initialAssumptions = defaultFinancialAssumptions;
  let freshness: Array<{ source: string; status: string; at: string; message: string }> = [];
  if (connected) {
    const [result] = await getDb().select({ value: count() }).from(ambiguousMatches).where(eq(ambiguousMatches.status, "pending"));
    ambiguous = result?.value ?? 0;
    const rows = await getDb().select({ id: ambiguousMatches.id, source: ambiguousMatches.source, reason: ambiguousMatches.reason, payload: ambiguousMatches.candidatePayload, agencyName: agencies.name })
      .from(ambiguousMatches).innerJoin(agencies, eq(ambiguousMatches.agencyId, agencies.id)).where(eq(ambiguousMatches.status, "pending")).limit(12);
    matchItems = rows.map((row) => ({ id: row.id, source: row.source, reason: row.reason, agencyName: row.agencyName, candidateName: String(row.payload.org_name ?? row.payload.licensee_name ?? row.payload.name ?? "Unnamed TDI record") }));
    const [saved] = await getDb().select().from(appSettings).where(eq(appSettings.key, "financial-assumptions")).limit(1);
    if (saved) initialAssumptions = { ...defaultFinancialAssumptions, ...saved.value } as FinancialAssumptions;
    const recentRuns = await getDb().select().from(importRuns).orderBy(desc(importRuns.startedAt)).limit(40);
    const seen = new Set<string>();
    freshness = recentRuns.filter((run) => { if (seen.has(run.source)) return false; seen.add(run.source); return true; }).map((run) => ({ source: run.source, status: run.status, at: (run.completedAt ?? run.startedAt).toISOString(), message: run.message ?? "No run detail" }));
  }
  return <div className="page-shell"><header className="page-header compact"><div><Eyebrow>Data room</Eyebrow><h1>Sources, research & assumptions</h1><p>Imports and AI research are manual by design. A failed refresh leaves the prior records in place and marks them stale.</p></div><div className="review-count"><small>Manual match queue</small><strong>{ambiguous}</strong><span>pending review</span></div></header><DataControls connected={connected} hasResearchKey={Boolean(process.env.OPENROUTER_API_KEY)} initialAssumptions={initialAssumptions}/><section className="panel freshness-panel"><div className="section-heading"><div><p className="eyebrow">Source freshness</p><h2>Last import state</h2></div><span>{freshness.length || "No"} sources</span></div>{freshness.length ? <div className="freshness-list">{freshness.map((item) => <article key={item.source}><div><strong>{item.source.replaceAll("-", " ")}</strong><span>{new Date(item.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></div><p>{item.message}</p><b className={item.status === "failed" ? "fresh-stale" : "fresh-ok"}>{item.status}</b></article>)}</div> : <div className="empty-state">No source import has run against this database.</div>}</section><MatchQueue initial={matchItems}/><section className="source-footer"><p><strong>Primary sources:</strong> <a href="https://www.rma.usda.gov/tools-reports/agent-locator" target="_blank" rel="noreferrer">USDA RMA Agent Locator</a>, <a href="https://www.rma.usda.gov/tools-reports/summary-of-business/state-county-crop-summary-business" target="_blank" rel="noreferrer">USDA 2025 Summary of Business</a>, and <a href="https://tdi.texas.gov/agent/agentlists.html" target="_blank" rel="noreferrer">Texas Department of Insurance open datasets</a>.</p><p>Only public business information is used. No logins, paywalls, CAPTCHAs, or site restrictions are bypassed.</p></section></div>;
}

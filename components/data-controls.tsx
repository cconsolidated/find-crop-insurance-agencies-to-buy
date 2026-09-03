"use client";

import { useState } from "react";
import { Bot, Database, DownloadCloud, Play, Save } from "lucide-react";
import { defaultFinancialAssumptions } from "@/lib/calculations";
import type { FinancialAssumptions } from "@/lib/types";

type Log = { label: string; tone: "ok" | "warn" | "info" };

export function DataControls({ connected, hasResearchKey, initialAssumptions = defaultFinancialAssumptions }: { connected: boolean; hasResearchKey: boolean; initialAssumptions?: FinancialAssumptions }) {
  const [running, setRunning] = useState("");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const [assumptions, setAssumptions] = useState(initialAssumptions);
  function log(label: string, tone: Log["tone"] = "info") { setLogs((rows) => [{ label, tone }, ...rows].slice(0, 12)); }
  async function request(body: Record<string, unknown>) {
    const response = await fetch("/api/imports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Import failed");
    return data;
  }
  async function runRma() {
    setRunning("rma"); setProgress(0);
    try {
      let cursor = 0; let done = false;
      while (!done) {
        const data = await request({ source: "rma-agents", cursor, batchSize: 5 });
        cursor = data.nextCursor; done = data.done; setProgress(Math.round((cursor / data.total) * 100));
        log(`${cursor}/${data.total} counties · ${data.processed} agency locations in latest batch`, data.warnings?.length ? "warn" : "info");
      }
      log("Texas RMA agent directory import completed.", "ok");
    } catch (error) { log(error instanceof Error ? error.message : "Import failed", "warn"); }
    setRunning("");
  }
  async function runPremiums() {
    setRunning("premium");
    try { const data = await request({ source: "rma-premiums" }); log(`${data.processed} county premium markets imported and agency economics recalculated.`, "ok"); }
    catch (error) { log(error instanceof Error ? error.message : "Import failed", "warn"); }
    setRunning("");
  }
  async function runTdi() {
    setRunning("tdi"); setProgress(0);
    try {
      const sources = ["tdi-agencies", "tdi-people", "tdi-relationships", "tdi-appointments"];
      for (const [sourceIndex, source] of sources.entries()) {
        let cursor = 0; let done = false; let pages = 0;
        while (!done && pages < 500) {
          const data = await request({ source, cursor, batchSize: 500 });
          cursor = data.nextCursor; done = data.done; pages += 1;
          setProgress(Math.round(((sourceIndex + (done ? 1 : .5)) / sources.length) * 100));
          log(`${source.replace("tdi-", "TDI ")} · ${cursor.toLocaleString()} scanned · ${data.matched} latest matches`, data.ambiguous ? "warn" : "info");
        }
        if (!done) log(`${source} safety stop reached; resume with its API cursor.`, "warn");
      }
      log("TDI licensing, person, relationship, and appointment enrichment completed.", "ok");
    } catch (error) { log(error instanceof Error ? error.message : "Import failed", "warn"); }
    setRunning("");
  }
  async function research(auto: boolean) {
    setRunning("research");
    try {
      for (let i = 0; i < (auto ? 25 : 1); i += 1) {
        const response = await fetch("/api/research", { method: "POST" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Research failed");
        if (data.status !== "researched") { log(`Research stopped: ${String(data.status).replaceAll("_", " ")}.`, data.status === "target_complete" ? "ok" : "warn"); break; }
        log(`${data.agency.name} researched · $${Number(data.cost).toFixed(4)} · $${Number(data.budget.remaining).toFixed(2)} remaining`, "ok");
        setProgress(Math.round(((i + 1) / (auto ? 25 : 1)) * 100));
      }
    } catch (error) { log(error instanceof Error ? error.message : "Research failed", "warn"); }
    setRunning("");
  }
  async function saveAssumptions() {
    setRunning("settings");
    const response = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(assumptions) });
    const data = await response.json(); log(response.ok ? "Screening assumptions saved." : data.error ?? "Could not save.", response.ok ? "ok" : "warn"); setRunning("");
  }
  return <div className="settings-layout">
    <section className="panel settings-panel"><div className="section-heading"><div><p className="eyebrow">Manual source imports</p><h2>Build the Texas directory</h2></div><span className={connected ? "connection-ok" : "connection-off"}>{connected ? "Neon connected" : "Demo mode"}</span></div>
      <div className="job-list"><article><span className="job-icon"><DownloadCloud size={20}/></span><div><h3>USDA RMA agent locator</h3><p>County-by-county crop-agent locations, deduplicated by agency and agent.</p></div><button disabled={!connected || Boolean(running)} onClick={runRma} className="button secondary"><Play size={15}/>Import all</button></article><article><span className="job-icon"><Database size={20}/></span><div><h3>2025 Summary of Business</h3><p>Completed Texas premium, liability, policy, and crop-mix totals.</p></div><button disabled={!connected || Boolean(running)} onClick={runPremiums} className="button secondary"><Play size={15}/>Import</button></article><article><span className="job-icon"><Database size={20}/></span><div><h3>Texas DOI agency records</h3><p>Licensing records matched conservatively to the crop-agent directory.</p></div><button disabled={!connected || Boolean(running)} onClick={runTdi} className="button secondary"><Play size={15}/>Enrich</button></article></div>
      {running && <div className="progress-track"><i style={{ width: `${progress || 4}%` }}/></div>}
    </section>
    <section className="panel research-control"><div className="research-head"><span><Bot size={22}/></span><div><p className="eyebrow">OpenRouter research</p><h2>$20 lifetime guardrail</h2></div></div><p>Research runs only when you start it. Candidates process sequentially, and the application stops before the reserved request budget is crossed.</p><div className="button-row"><button className="button primary" disabled={!connected || !hasResearchKey || Boolean(running)} onClick={() => research(false)}>Research next</button><button className="button secondary" disabled={!connected || !hasResearchKey || Boolean(running)} onClick={() => research(true)}>Run top 25</button></div><small>{hasResearchKey ? "Dedicated key detected server-side." : "Add OPENROUTER_API_KEY to enable research."}</small></section>
    <section className="panel assumption-settings"><p className="eyebrow">Screening assumptions</p><h2>Operating model defaults</h2><div className="input-grid"><label>Commission rate<input type="number" step=".01" value={assumptions.commissionRate} onChange={(e) => setAssumptions({ ...assumptions, commissionRate: Number(e.target.value) })}/></label><label>Rent / sq. ft.<input type="number" value={assumptions.rentPerSquareFoot} onChange={(e) => setAssumptions({ ...assumptions, rentPerSquareFoot: Number(e.target.value) })}/></label><label>Other opex rate<input type="number" step=".01" value={assumptions.otherOpexRate} onChange={(e) => setAssumptions({ ...assumptions, otherOpexRate: Number(e.target.value) })}/></label><label>Owner replacement<input type="number" value={assumptions.ownerReplacementComp} onChange={(e) => setAssumptions({ ...assumptions, ownerReplacementComp: Number(e.target.value) })}/></label><label>Agents per support FTE<input type="number" value={assumptions.supportPerAgents} onChange={(e) => setAssumptions({ ...assumptions, supportPerAgents: Number(e.target.value) })}/></label></div><button className="button secondary" disabled={Boolean(running)} onClick={saveAssumptions}><Save size={15}/>Save assumptions</button></section>
    <section className="panel activity-log"><p className="eyebrow">Session log</p><h2>Import & research activity</h2>{logs.length ? <ul>{logs.map((item, index) => <li key={`${item.label}-${index}`} className={`log-${item.tone}`}><i/>{item.label}</li>)}</ul> : <div className="empty-state">Run an import or research job to see live status.</div>}</section>
  </div>;
}

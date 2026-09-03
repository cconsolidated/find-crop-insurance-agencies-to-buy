"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Save } from "lucide-react";
import { calculateDeal, calculateFinancials, defaultDealInputs, defaultFinancialAssumptions, formatCurrency, formatPercent } from "@/lib/calculations";
import type { AgencyRecord, DealInputs } from "@/lib/types";

function RangeField({ label, value, min, max, step, suffix = "x", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<strong>{suffix === "%" ? `${(value * 100).toFixed(step < .01 ? 1 : 0)}%` : `${value.toFixed(1)}${suffix}`}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function DealLab({ agency }: { agency: AgencyRecord }) {
  const [inputs, setInputs] = useState<DealInputs>(defaultDealInputs);
  const [notice, setNotice] = useState("");
  const result = useMemo(() => calculateDeal(agency.estimatedEbitda, inputs), [agency.estimatedEbitda, inputs]);
  const annualDebt = result.annualSeniorDebtService + result.annualSellerDebtService;
  const projection = result.fiveYearCashFlows.slice(1).map((cash, index) => {
    const earnout = index < 3 ? result.earnout / 3 : 0;
    return {
      year: `Y${index + 1}`,
      base: cash - (index === 4 ? result.exitEquityValue : 0),
      low: agency.estimatedEbitda * .85 * Math.pow(.99, index) - annualDebt - earnout,
      high: agency.estimatedEbitda * .97 * Math.pow(1.04, index) - annualDebt - earnout,
    };
  });
  const sensitivity = [.85, .92, .97].map((retention) => ({ retention, values: [4, 6, 8].map((multiple) => calculateDeal(agency.estimatedEbitda, { ...inputs, yearOneRetention: retention, purchaseMultiple: multiple }).dscr) }));
  const rateSensitivity = [.08, .0975, .12].map((rate) => ({ rate, values: [4, 6, 8].map((multiple) => calculateDeal(agency.estimatedEbitda, { ...inputs, seniorRate: rate, purchaseMultiple: multiple }).dscr) }));
  const operatingSensitivity = [.12, .14, .16].map((commissionRate) => ({ commissionRate, values: [.06, .08, .10].map((otherOpexRate) => calculateFinancials(agency.estimatedPremiumBase, agency.agentCount, agency.officeCount, { ...defaultFinancialAssumptions, commissionRate, otherOpexRate }).normalizedEbitda) }));
  function update<K extends keyof DealInputs>(key: K, value: DealInputs[K]) { setInputs((current) => ({ ...current, [key]: value })); }
  async function save() {
    setNotice("Saving…");
    const response = await fetch("/api/scenarios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agencyId: agency.id, name: "Base case", normalizedEbitda: agency.estimatedEbitda, inputs }) });
    const data = await response.json();
    setNotice(response.ok ? "Scenario saved to Neon." : data.error ?? "Could not save scenario.");
  }
  return <div className="deal-grid">
    <section className="panel assumption-panel"><div className="panel-heading"><div><p className="eyebrow">Editable assumptions</p><h3>Acquisition structure</h3></div><Calculator size={20} /></div>
      <RangeField label="Purchase multiple" value={inputs.purchaseMultiple} min={4} max={8} step={.25} onChange={(v) => update("purchaseMultiple", v)} />
      <RangeField label="Year-one retention" value={inputs.yearOneRetention} min={.75} max={1} step={.01} suffix="%" onChange={(v) => update("yearOneRetention", v)} />
      <RangeField label="Senior interest" value={inputs.seniorRate} min={.07} max={.14} step={.0025} suffix="%" onChange={(v) => update("seniorRate", v)} />
      <RangeField label="Annual growth" value={inputs.annualGrowth} min={-.05} max={.08} step={.005} suffix="%" onChange={(v) => update("annualGrowth", v)} />
      <RangeField label="Exit multiple" value={inputs.exitMultiple} min={4} max={8} step={.25} onChange={(v) => update("exitMultiple", v)} />
      <div className="capital-stack"><span><i style={{ width: "10%" }} />Buyer equity <b>10%</b></span><span><i style={{ width: "70%" }} />Senior debt <b>70%</b></span><span><i style={{ width: "10%" }} />Seller note <b>10%</b></span><span><i style={{ width: "10%" }} />Earn-out <b>10%</b></span></div>
      <button className="button primary" onClick={save}><Save size={16} />Save scenario</button>{notice && <p className="form-notice">{notice}</p>}
    </section>
    <section className="panel result-panel"><p className="eyebrow">Base case output</p><div className="deal-hero"><div><small>Indicative price</small><strong>{formatCurrency(result.purchasePrice)}</strong><span>{inputs.purchaseMultiple.toFixed(1)}x normalized EBITDA</span></div><div className={result.dscr >= 1.25 ? "positive" : "warning"}><small>Year-one DSCR</small><strong>{result.dscr.toFixed(2)}x</strong><span>{result.dscr >= 1.25 ? "Above screening floor" : "Below 1.25x floor"}</span></div></div>
      <div className="metric-row"><div><small>Buyer cash</small><strong>{formatCurrency(result.buyerEquity)}</strong></div><div><small>Monthly debt</small><strong>{formatCurrency(result.monthlySeniorDebtService + result.monthlySellerDebtService)}</strong></div><div><small>Year-one cash after debt</small><strong>{formatCurrency(result.yearOneCashFlow)}</strong></div><div><small>Cash-on-cash</small><strong>{formatPercent(result.cashOnCash)}</strong></div><div><small>5-year levered IRR</small><strong>{formatPercent(result.fiveYearIrr)}</strong></div></div>
      <div className="projection-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={projection} margin={{ left: 2, right: 12, top: 12 }}><defs><linearGradient id="cash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c47a48" stopOpacity={.4}/><stop offset="1" stopColor="#c47a48" stopOpacity={.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7e1d5" /><XAxis dataKey="year" axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => formatCurrency(value)} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="low" stroke="#9b9387" fill="transparent" strokeWidth={1.5} name="Low" /><Area type="monotone" dataKey="base" stroke="#b76634" fill="url(#cash)" strokeWidth={2} name="Base" /><Area type="monotone" dataKey="high" stroke="#244d40" fill="transparent" strokeWidth={1.5} name="High" /></AreaChart></ResponsiveContainer></div>
      <div className="sensitivity-grid">
        <div className="sensitivity"><div><strong>DSCR sensitivity</strong><span>Retention × purchase multiple</span></div><table><thead><tr><th>Retention</th><th>4x</th><th>6x</th><th>8x</th></tr></thead><tbody>{sensitivity.map((row) => <tr key={row.retention}><th>{formatPercent(row.retention)}</th>{row.values.map((value, index) => <td key={index} className={value >= 1.25 ? "cell-good" : "cell-warn"}>{value.toFixed(2)}x</td>)}</tr>)}</tbody></table></div>
        <div className="sensitivity"><div><strong>Rate sensitivity</strong><span>Senior rate × multiple</span></div><table><thead><tr><th>Rate</th><th>4x</th><th>6x</th><th>8x</th></tr></thead><tbody>{rateSensitivity.map((row) => <tr key={row.rate}><th>{formatPercent(row.rate, 2)}</th>{row.values.map((value, index) => <td key={index} className={value >= 1.25 ? "cell-good" : "cell-warn"}>{value.toFixed(2)}x</td>)}</tr>)}</tbody></table></div>
        <div className="sensitivity"><div><strong>Operating sensitivity</strong><span>Commission × other opex</span></div><table><thead><tr><th>Commission</th><th>6%</th><th>8%</th><th>10%</th></tr></thead><tbody>{operatingSensitivity.map((row) => <tr key={row.commissionRate}><th>{formatPercent(row.commissionRate)}</th>{row.values.map((value, index) => <td key={index}>{formatCurrency(value)}</td>)}</tr>)}</tbody></table></div>
      </div>
      <p className="disclosure">Screening model only. Excludes taxes, transaction fees, working capital, prepayment penalties, and lender underwriting adjustments.</p>
    </section>
  </div>;
}

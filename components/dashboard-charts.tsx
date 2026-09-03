"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AgencyRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";

export function OpportunityChart({ agencies }: { agencies: AgencyRecord[] }) {
  const data = agencies.slice(0, 6).map((agency) => ({ name: agency.name.replace("Demo · ", "").split(" ").slice(0, 2).join(" "), score: agency.opportunityScore, revenue: agency.estimatedRevenue }));
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7e1d5" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} /><Tooltip cursor={{ fill: "#f2eee5" }} formatter={(value, key) => key === "score" ? [`${value}/100`, "Opportunity"] : [formatCurrency(Number(value)), "Revenue"]} /><Bar dataKey="score" radius={[5, 5, 0, 0]}>{data.map((item) => <Cell key={item.name} fill={item.score >= 75 ? "#27584a" : "#c47a48"} />)}</Bar></BarChart></ResponsiveContainer></div>;
}


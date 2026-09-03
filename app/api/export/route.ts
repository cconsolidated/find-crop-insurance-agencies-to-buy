import { NextResponse } from "next/server";
import { getAgencies } from "@/lib/agencies";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const rows = await getAgencies();
  const header = ["Agency", "City", "County", "Opportunity score", "Succession score", "Confidence", "Pipeline", "Estimated premium", "Estimated revenue", "Estimated EBITDA", "Staff low", "Staff high", "Research status"];
  const csv = [header, ...rows.map((row) => [row.name, row.city, row.countyName, row.opportunityScore, row.successionScore, row.confidenceScore, row.pipelineStage, row.estimatedPremiumBase, row.estimatedRevenue, row.estimatedEbitda, row.staffLow, row.staffHigh, row.researchStatus])]
    .map((row) => row.map(cell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=texas-agency-screening.csv", "cache-control": "no-store" } });
}


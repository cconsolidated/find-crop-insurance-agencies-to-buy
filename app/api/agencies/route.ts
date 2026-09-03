import { NextRequest, NextResponse } from "next/server";
import { getAgencies } from "@/lib/agencies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").toLowerCase();
  const stage = params.get("stage");
  const county = params.get("county");
  const minimumRevenue = Number(params.get("minRevenue") ?? 0);
  const maximumRevenue = Number(params.get("maxRevenue") ?? Number.POSITIVE_INFINITY);
  const rows = (await getAgencies()).filter((agency) => {
    const text = `${agency.name} ${agency.city} ${agency.countyName}`.toLowerCase();
    return (!query || text.includes(query)) && (!stage || agency.pipelineStage === stage) && (!county || agency.countyName === county) && agency.estimatedRevenue >= minimumRevenue && agency.estimatedRevenue <= maximumRevenue;
  });
  return NextResponse.json({ agencies: rows, count: rows.length });
}

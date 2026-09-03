import { NextRequest, NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/db";
import { desc } from "drizzle-orm";
import { researchRuns } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";
import { getBudgetStatus, researchNextAgency } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ connected: false, budget: { spent: 0, budget: 20, reserve: 0.75, remaining: 20, canStart: false }, runs: [] });
  const runs = await getDb().select().from(researchRuns).orderBy(desc(researchRuns.startedAt)).limit(20);
  return NextResponse.json({ connected: true, budget: await getBudgetStatus(), runs });
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon before running research." }, { status: 503 });
    if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 503 });
    return NextResponse.json(await researchNextAgency());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Research failed" }, { status: 400 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { countyPremiums, importRuns, sourceRecords } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";
import { fetchTexasCounties, fetchRmaAgentsForCounty } from "@/lib/imports/rma";
import { downloadTexasPremiums } from "@/lib/imports/sob";
import { fetchTdiBatch } from "@/lib/imports/tdi";
import { storeCountyPremiums, storeRmaCounty, storeTdiAgencies, storeTdiAppointments, storeTdiPeople, storeTdiRelationships } from "@/lib/imports/store";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const ImportSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("rma-agents"), cursor: z.number().int().min(0).default(0), batchSize: z.number().int().min(1).max(10).default(3) }),
  z.object({ source: z.literal("rma-premiums") }),
  z.object({ source: z.literal("tdi-agencies"), cursor: z.number().int().min(0).default(0), batchSize: z.number().int().min(100).max(1000).default(500) }),
  z.object({ source: z.literal("tdi-people"), cursor: z.number().int().min(0).default(0), batchSize: z.number().int().min(100).max(1000).default(500) }),
  z.object({ source: z.literal("tdi-relationships"), cursor: z.number().int().min(0).default(0), batchSize: z.number().int().min(100).max(1000).default(500) }),
  z.object({ source: z.literal("tdi-appointments"), cursor: z.number().int().min(0).default(0), batchSize: z.number().int().min(100).max(1000).default(500) }),
]);

export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ connected: false, runs: [] });
  const runs = await getDb().select().from(importRuns).orderBy(desc(importRuns.startedAt)).limit(20);
  return NextResponse.json({ connected: true, runs });
}

export async function POST(request: NextRequest) {
  let runId: string | undefined;
  let source = "unknown";
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is required before imports can run." }, { status: 503 });
    const input = ImportSchema.parse(await request.json());
    source = input.source;
    const [run] = await getDb().insert(importRuns).values({ source, status: "running", cursor: "cursor" in input ? String(input.cursor) : null }).returning();
    runId = run.id;

    if (input.source === "rma-agents") {
      const counties = await fetchTexasCounties();
      const batch = counties.slice(input.cursor, input.cursor + input.batchSize);
      let processed = 0;
      const warnings: string[] = [];
      for (const county of batch) {
        const result = await fetchRmaAgentsForCounty(county.code);
        if (result.capped) warnings.push(`${county.name} reached the 999-record cap and needs geographic subdivision review.`);
        processed += await storeRmaCounty(county, result.agents);
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
      const nextCursor = input.cursor + batch.length;
      const done = nextCursor >= counties.length;
      await getDb().update(importRuns).set({
        status: done ? "completed" : "completed_batch",
        processed,
        total: counties.length,
        cursor: String(nextCursor),
        message: warnings.join(" ") || `${batch.length} counties processed.`,
        completedAt: new Date(), updatedAt: new Date(),
      }).where(eq(importRuns.id, run.id));
      return NextResponse.json({ source, processed, countyCount: batch.length, nextCursor, done, total: counties.length, warnings });
    }

    if (input.source === "rma-premiums") {
      const rows = await downloadTexasPremiums();
      const processed = await storeCountyPremiums(rows);
      const totalPremium = rows.reduce((sum, row) => sum + row.totalPremium, 0);
      await getDb().update(importRuns).set({ status: "completed", processed, total: processed, message: `${processed} counties; $${Math.round(totalPremium).toLocaleString()} premium.`, completedAt: new Date(), updatedAt: new Date() }).where(eq(importRuns.id, run.id));
      return NextResponse.json({ source, processed, totalPremium, done: true });
    }

    const dataset = input.source.replace("tdi-", "") as "agencies" | "people" | "relationships" | "appointments";
    const rows = await fetchTdiBatch(dataset, input.cursor, input.batchSize);
    const result = dataset === "agencies" ? await storeTdiAgencies(rows)
      : dataset === "people" ? await storeTdiPeople(rows)
      : dataset === "relationships" ? await storeTdiRelationships(rows)
      : await storeTdiAppointments(rows);
    const nextCursor = input.cursor + rows.length;
    const done = rows.length < input.batchSize;
    await getDb().update(importRuns).set({ status: done ? "completed" : "completed_batch", processed: rows.length, total: nextCursor, cursor: String(nextCursor), message: `${result.matched} matched; ${result.ambiguous} queued for review.`, completedAt: new Date(), updatedAt: new Date() }).where(eq(importRuns.id, run.id));
    return NextResponse.json({ source, processed: rows.length, ...result, nextCursor, done });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    if (hasDatabase()) {
      if (runId) await getDb().update(importRuns).set({ status: "failed", message, completedAt: new Date(), updatedAt: new Date() }).where(eq(importRuns.id, runId));
      if (source !== "unknown") await getDb().update(sourceRecords).set({ stale: true }).where(eq(sourceRecords.source, source === "rma-agents" ? "rma-agent-locator" : source === "tdi-agencies" ? "tdi-agencies" : source));
      if (source === "rma-premiums") await getDb().update(countyPremiums).set({ stale: true }).where(eq(countyPremiums.commodityYear, 2025));
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

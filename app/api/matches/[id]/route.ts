import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { agencies, ambiguousMatches, sourceRecords } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";

const Schema = z.object({ status: z.enum(["accepted", "ignored"]) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to resolve matches." }, { status: 503 });
    const input = Schema.parse(await request.json());
    const { id } = await context.params;
    const [existing] = await getDb().select().from(ambiguousMatches).where(eq(ambiguousMatches.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (input.status === "accepted") {
      const npn = String(existing.candidatePayload.npn ?? existing.candidatePayload.licensee_npn ?? existing.candidatePayload.associated_licensee_npn ?? "");
      if (npn) {
        await getDb().update(sourceRecords).set({ agencyId: existing.agencyId }).where(and(eq(sourceRecords.source, existing.source), sql`${sourceRecords.payload}->>'npn' = ${npn}`));
      }
      await getDb().update(agencies).set({ confidenceScore: sql`least(100, ${agencies.confidenceScore} + 5)`, updatedAt: new Date() }).where(eq(agencies.id, existing.agencyId));
    }
    const [match] = await getDb().update(ambiguousMatches).set({ status: input.status, updatedAt: new Date() }).where(eq(ambiguousMatches.id, id)).returning();
    return match ? NextResponse.json({ match }) : NextResponse.json({ error: "Match not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

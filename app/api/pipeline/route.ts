import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { agencies, pipelineEntries } from "@/db/schema";
import { pipelineStages } from "@/lib/types";
import { assertSameOrigin } from "@/lib/security";

const Schema = z.object({ agencyId: z.string().uuid(), stage: z.enum(pipelineStages) });

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to persist changes." }, { status: 503 });
    const input = Schema.parse(await request.json());
    const [before] = await getDb().select({ stage: agencies.pipelineStage }).from(agencies).where(eq(agencies.id, input.agencyId)).limit(1);
    const [agency] = await getDb().update(agencies).set({ pipelineStage: input.stage, updatedAt: new Date() }).where(eq(agencies.id, input.agencyId)).returning();
    if (agency) await getDb().insert(pipelineEntries).values({ agencyId: input.agencyId, fromStage: before?.stage, toStage: input.stage });
    return NextResponse.json({ agency });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

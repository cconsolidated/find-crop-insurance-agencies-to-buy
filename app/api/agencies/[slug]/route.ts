import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { agencies, pipelineEntries } from "@/db/schema";
import { getDb, hasDatabase } from "@/db";
import { getAgencyBySlug } from "@/lib/agencies";
import { pipelineStages } from "@/lib/types";
import { assertSameOrigin } from "@/lib/security";

const PatchSchema = z.object({ pipelineStage: z.enum(pipelineStages) });

export async function GET(_: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const agency = await getAgencyBySlug(slug);
  return agency ? NextResponse.json({ agency }) : NextResponse.json({ error: "Agency not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to persist pipeline changes." }, { status: 503 });
    const body = PatchSchema.parse(await request.json());
    const { slug } = await context.params;
    const [before] = await getDb().select({ id: agencies.id, stage: agencies.pipelineStage }).from(agencies).where(eq(agencies.slug, slug)).limit(1);
    const [agency] = await getDb().update(agencies).set({ pipelineStage: body.pipelineStage, updatedAt: new Date() })
      .where(eq(agencies.slug, slug)).returning();
    if (agency && before) await getDb().insert(pipelineEntries).values({ agencyId: before.id, fromStage: before.stage, toStage: body.pipelineStage });
    return agency ? NextResponse.json({ agency }) : NextResponse.json({ error: "Agency not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

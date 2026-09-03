import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { appSettings } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";
import { recalculateAgencyEconomics } from "@/lib/imports/store";

const Schema = z.object({
  commissionRate: z.number().min(0).max(.5), rentPerSquareFoot: z.number().min(0).max(200),
  otherOpexRate: z.number().min(0).max(.5), ownerReplacementComp: z.number().min(0).max(1_000_000),
  supportPerAgents: z.number().min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to save assumptions." }, { status: 503 });
    const value = Schema.parse(await request.json());
    const [setting] = await getDb().insert(appSettings).values({ key: "financial-assumptions", value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } }).returning();
    await recalculateAgencyEconomics();
    return NextResponse.json({ setting });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid assumptions" }, { status: 400 });
  }
}

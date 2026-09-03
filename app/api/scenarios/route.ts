import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { dealScenarios } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";
import { calculateDeal } from "@/lib/calculations";

const InputSchema = z.object({
  agencyId: z.string().uuid(), name: z.string().min(1).max(80), normalizedEbitda: z.number().min(0),
  inputs: z.object({
    purchaseMultiple: z.number().min(1).max(15), equityPercent: z.number().min(0).max(1), seniorDebtPercent: z.number().min(0).max(1),
    sellerNotePercent: z.number().min(0).max(1), earnoutPercent: z.number().min(0).max(1), seniorRate: z.number().min(0).max(0.5),
    seniorYears: z.number().int().min(1).max(30), sellerRate: z.number().min(0).max(0.5), sellerYears: z.number().int().min(1).max(20),
    yearOneRetention: z.number().min(0).max(1.5), annualGrowth: z.number().min(-0.5).max(0.5), exitMultiple: z.number().min(1).max(15),
  }),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to save scenarios." }, { status: 503 });
    const input = InputSchema.parse(await request.json());
    const outputs = calculateDeal(input.normalizedEbitda, input.inputs);
    const [scenario] = await getDb().insert(dealScenarios).values({ agencyId: input.agencyId, name: input.name, inputs: input.inputs, outputs }).returning();
    return NextResponse.json({ scenario });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid scenario" }, { status: 400 });
  }
}


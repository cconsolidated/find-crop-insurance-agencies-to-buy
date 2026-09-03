import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { notes, tasks } from "@/db/schema";
import { assertSameOrigin } from "@/lib/security";

const Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("note"), agencyId: z.string().uuid(), body: z.string().min(1).max(4000) }),
  z.object({ kind: z.literal("task"), agencyId: z.string().uuid(), title: z.string().min(1).max(300), dueAt: z.string().datetime().optional() }),
]);

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!hasDatabase()) return NextResponse.json({ error: "Connect Neon to save activity." }, { status: 503 });
    const input = Schema.parse(await request.json());
    if (input.kind === "note") {
      const [item] = await getDb().insert(notes).values({ agencyId: input.agencyId, body: input.body }).returning();
      return NextResponse.json({ item });
    }
    const [item] = await getDb().insert(tasks).values({ agencyId: input.agencyId, title: input.title, dueAt: input.dueAt ? new Date(input.dueAt) : null }).returning();
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid activity" }, { status: 400 });
  }
}


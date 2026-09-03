import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { agencies, aiUsage, evidence, importRuns, researchRuns, successionAssessments } from "@/db/schema";
import { calculateOpportunityScore, canStartResearch } from "./calculations";

const EvidenceSchema = z.object({
  category: z.enum(["ownership", "succession", "leadership", "tenure", "family", "bench", "scale", "corporate", "risk", "other"]),
  classification: z.enum(["observed", "inferred", "contradicted", "unknown"]),
  claim: z.string().min(8).max(600),
  excerpt: z.string().max(500).optional().default(""),
  source_url: z.string().url().refine((value) => /^https?:\/\//i.test(value), "Only HTTP(S) evidence URLs are allowed.").nullable().optional().transform((value) => value ?? undefined),
  source_title: z.string().max(200).optional().default("Public source"),
  confidence: z.number().int().min(0).max(100),
});

const ResearchSchema = z.object({
  owner_name: z.string().max(160).nullable(),
  owner_age_band: z.enum(["under 45", "45–54", "55–64", "65–74", "75+", "unknown"]),
  founding_year: z.number().int().min(1800).max(2026).nullable(),
  office_count: z.number().int().min(1).max(100).nullable(),
  staff_low: z.number().int().min(1).max(500).nullable(),
  staff_high: z.number().int().min(1).max(500).nullable(),
  succession_score: z.number().int().min(0).max(100),
  confidence_score: z.number().int().min(0).max(100),
  risk_score: z.number().int().min(0).max(100),
  owner_operated_score: z.number().int().min(0).max(100),
  summary: z.string().min(30).max(1200),
  tags: z.array(z.string().max(60)).max(8),
  flags: z.array(z.string().max(100)).max(8),
  evidence: z.array(EvidenceSchema).min(1).max(20),
});

type OpenRouterPayload = {
  id?: string;
  choices?: Array<{ message?: { content?: string; annotations?: unknown[] } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  error?: { message?: string };
};

function stripCodeFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function parseResearch(value: string) {
  try {
    return ResearchSchema.safeParse(JSON.parse(stripCodeFence(value)));
  } catch {
    return ResearchSchema.safeParse(null);
  }
}

async function openRouterRequest(prompt: string, repair = false) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured.");
  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-5-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Fieldnote Agency Intelligence",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: repair ? 2600 : 3600,
      usage: { include: true },
      tools: repair ? undefined : [{
        type: "openrouter:web_search",
        parameters: { engine: "perplexity", max_results: 8, search_context_size: "medium" },
      }],
      messages: [
        {
          role: "system",
          content: "You are a careful acquisition-research analyst. Use only public business sources. Never infer family relationships from surnames. Do not report exact birth dates or home addresses. Every observed claim must have a directly supporting URL. 'No successor found' means only that none appeared in sources reviewed; never state that no successor exists. Return JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agency_research",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["owner_name", "owner_age_band", "founding_year", "office_count", "staff_low", "staff_high", "succession_score", "confidence_score", "risk_score", "owner_operated_score", "summary", "tags", "flags", "evidence"],
            properties: {
              owner_name: { type: ["string", "null"] },
              owner_age_band: { enum: ["under 45", "45–54", "55–64", "65–74", "75+", "unknown"] },
              founding_year: { type: ["integer", "null"] },
              office_count: { type: ["integer", "null"] },
              staff_low: { type: ["integer", "null"] },
              staff_high: { type: ["integer", "null"] },
              succession_score: { type: "integer", minimum: 0, maximum: 100 },
              confidence_score: { type: "integer", minimum: 0, maximum: 100 },
              risk_score: { type: "integer", minimum: 0, maximum: 100 },
              owner_operated_score: { type: "integer", minimum: 0, maximum: 100 },
              summary: { type: "string" },
              tags: { type: "array", items: { type: "string" }, maxItems: 8 },
              flags: { type: "array", items: { type: "string" }, maxItems: 8 },
              evidence: {
                type: "array",
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["category", "classification", "claim", "excerpt", "source_url", "source_title", "confidence"],
                  properties: {
                    category: { enum: ["ownership", "succession", "leadership", "tenure", "family", "bench", "scale", "corporate", "risk", "other"] },
                    classification: { enum: ["observed", "inferred", "contradicted", "unknown"] },
                    claim: { type: "string" }, excerpt: { type: "string" },
                    source_url: { type: ["string", "null"] }, source_title: { type: "string" },
                    confidence: { type: "integer", minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  const data = (await response.json()) as OpenRouterPayload;
  if (!response.ok) throw new Error(data.error?.message ?? `OpenRouter request failed (${response.status}).`);
  return { data, model };
}

async function requestCost(generationId: string | undefined, fallback: number) {
  if (!generationId || fallback > 0 || !process.env.OPENROUTER_API_KEY) return fallback;
  try {
    const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`, {
      headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    const payload = await response.json() as { data?: { total_cost?: number } };
    return Number(payload.data?.total_cost ?? fallback);
  } catch {
    return fallback;
  }
}

async function recordUsage(
  response: { data: OpenRouterPayload; model: string },
  researchRunId: string,
  agencyId: string,
) {
  const usage = response.data.usage;
  const cost = await requestCost(response.data.id, Number(usage?.cost ?? 0));
  await getDb().insert(aiUsage).values({
    researchRunId,
    agencyId,
    generationId: response.data.id,
    model: response.model,
    promptTokens: Number(usage?.prompt_tokens ?? 0),
    completionTokens: Number(usage?.completion_tokens ?? 0),
    costUsd: cost,
  });
  return cost;
}

export async function getBudgetStatus() {
  const db = getDb();
  const [usage] = await db.select({ total: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)` }).from(aiUsage);
  const spent = Number(usage?.total ?? 0);
  const budget = Number(process.env.RESEARCH_BUDGET_USD ?? 20);
  const reserve = Number(process.env.RESEARCH_REQUEST_RESERVE_USD ?? 0.75);
  return { spent, budget, reserve, remaining: Math.max(0, budget - spent), canStart: canStartResearch(spent, budget, reserve) };
}

export async function researchNextAgency() {
  const db = getDb();
  const budget = await getBudgetStatus();
  if (!budget.canStart) return { status: "budget_stop" as const, budget };

  const [agentImport] = await db.select({ id: importRuns.id }).from(importRuns).where(and(eq(importRuns.source, "rma-agents"), eq(importRuns.status, "completed"))).limit(1);
  const [premiumImport] = await db.select({ id: importRuns.id }).from(importRuns).where(and(eq(importRuns.source, "rma-premiums"), eq(importRuns.status, "completed"))).limit(1);
  if (!agentImport || !premiumImport) return { status: "data_incomplete" as const, budget };

  const [researchedCount] = await db.select({ count: sql<number>`count(*)` }).from(agencies).where(eq(agencies.researchStatus, "researched"));
  if (Number(researchedCount?.count ?? 0) >= 25) return { status: "target_complete" as const, budget };

  const [agency] = await db.select().from(agencies)
    .where(and(ne(agencies.researchStatus, "researched"), ne(agencies.researchStatus, "researching"), ne(agencies.researchStatus, "failed")))
    .orderBy(desc(agencies.opportunityScore), desc(agencies.estimatedRevenue), asc(agencies.name)).limit(1);
  if (!agency) return { status: "no_candidates" as const, budget };

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-5-mini";
  const [run] = await db.insert(researchRuns).values({ agencyId: agency.id, status: "running", model }).returning();
  await db.update(agencies).set({ researchStatus: "researching", pipelineStage: agency.pipelineStage === "new" ? "researching" : agency.pipelineStage }).where(eq(agencies.id, agency.id));

  const prompt = `Research this Texas crop-insurance agency for acquisition screening:\nName: ${agency.name}\nCity/county: ${agency.city}, ${agency.countyName ?? "Texas"}\nPhone: ${agency.phone ?? "unknown"}\nEmail: ${agency.email ?? "unknown"}\nWebsite: ${agency.website ?? "unknown"}\nLicensed/RMA agents: ${agency.agentCount}\n\nFind public evidence about owner/founder, ownership concentration, leadership tenure, founding year, offices, staff, named successors, sale/retirement language, family involvement only when explicitly documented, and corporate/bank/carrier/PE affiliation. Give an age BAND only when responsibly supported. Classify every claim. For no successor, write exactly that no named successor appeared in reviewed sources. Observed claims without a URL will be discarded.`;

  try {
    let response = await openRouterRequest(prompt);
    const annotations: unknown[] = [...(response.data.choices?.[0]?.message?.annotations ?? [])];
    let totalCost = await recordUsage(response, run.id, agency.id);
    let content = response.data.choices?.[0]?.message?.content ?? "";
    let parsed = parseResearch(content);
    if (!parsed.success) {
      const repairBudget = await getBudgetStatus();
      if (!repairBudget.canStart) throw new Error("Invalid structured output; repair was not started because the application budget reserve was exhausted.");
      response = await openRouterRequest(`Repair the following invalid JSON so it matches the requested agency_research schema. Preserve only supported content. Return JSON only.\n\n${content.slice(0, 12000)}`, true);
      annotations.push(...(response.data.choices?.[0]?.message?.annotations ?? []));
      totalCost += await recordUsage(response, run.id, agency.id);
      content = response.data.choices?.[0]?.message?.content ?? "";
      parsed = parseResearch(content);
    }
    if (!parsed.success) throw new Error(`Structured research output was rejected: ${parsed.error.issues[0]?.message ?? "invalid output"}`);

    const result = parsed.data;
    const supported = result.evidence.filter((item) => item.classification !== "observed" || Boolean(item.source_url));
    const annotatedSources = annotations.flatMap((annotation) => {
      if (!annotation || typeof annotation !== "object") return [];
      const citation = (annotation as { url_citation?: { url?: string; title?: string; content?: string } }).url_citation;
      if (!citation?.url || !/^https?:\/\//i.test(citation.url)) return [];
      return [{
        category: "other" as const,
        classification: "observed" as const,
        claim: `Web-search source reviewed: ${citation.title ?? new URL(citation.url).hostname}`.slice(0, 600),
        excerpt: (citation.content ?? "").slice(0, 500),
        source_url: citation.url,
        source_title: (citation.title ?? new URL(citation.url).hostname).slice(0, 200),
        confidence: 50,
      }];
    });
    await db.delete(evidence).where(eq(evidence.agencyId, agency.id));
    if (supported.length || annotatedSources.length) {
      await db.insert(evidence).values([...supported, ...annotatedSources].map((item) => ({
        agencyId: agency.id,
        category: item.category,
        classification: item.classification,
        claim: item.claim,
        excerpt: item.excerpt,
        sourceUrl: item.source_url,
        sourceTitle: item.source_title,
        confidence: item.confidence,
      })));
    }

    const financialScore = agency.estimatedRevenue >= 300_000 && agency.estimatedRevenue <= 3_000_000 ? 92 : 48;
    const opportunityScore = calculateOpportunityScore({
      succession: result.succession_score,
      financial: financialScore,
      ownerOperated: result.owner_operated_score,
      confidence: result.confidence_score,
      risk: result.risk_score,
    });
    await db.update(agencies).set({
      ownerName: result.owner_name,
      ownerAgeBand: result.owner_age_band === "unknown" ? null : `${result.owner_age_band} (estimated)`,
      officeCount: result.office_count ?? agency.officeCount,
      staffLow: result.staff_low ?? agency.staffLow,
      staffBase: result.staff_low && result.staff_high ? Math.round((result.staff_low + result.staff_high) / 2) : agency.staffBase,
      staffHigh: result.staff_high ?? agency.staffHigh,
      successionScore: result.succession_score,
      confidenceScore: result.confidence_score,
      riskScore: result.risk_score,
      opportunityScore,
      researchStatus: "researched",
      summary: result.summary,
      tags: result.tags,
      flags: result.flags,
      lastResearchedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agencies.id, agency.id));
    await db.update(successionAssessments).set({ isCurrent: false, updatedAt: new Date() }).where(eq(successionAssessments.agencyId, agency.id));
    await db.insert(successionAssessments).values({
      agencyId: agency.id,
      ownerName: result.owner_name,
      ownerAgeBand: result.owner_age_band === "unknown" ? null : result.owner_age_band,
      successionScore: result.succession_score,
      ownerOperatedScore: result.owner_operated_score,
      confidenceScore: result.confidence_score,
      riskScore: result.risk_score,
      summary: result.summary,
      isCurrent: true,
    });

    await db.update(researchRuns).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(researchRuns.id, run.id));
    return { status: "researched" as const, agency: { id: agency.id, name: agency.name, slug: agency.slug }, cost: totalCost, budget: await getBudgetStatus() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown research failure";
    await db.update(researchRuns).set({ status: "failed", error: message, completedAt: new Date(), updatedAt: new Date() }).where(eq(researchRuns.id, run.id));
    await db.update(agencies).set({ researchStatus: "failed", updatedAt: new Date() }).where(eq(agencies.id, agency.id));
    throw error;
  }
}

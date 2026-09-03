import { desc, eq, sql } from "drizzle-orm";
import { agencies, aiUsage, evidence } from "@/db/schema";
import { getDb, hasDatabase } from "@/db";
import { demoAgencies } from "./demo-data";
import type { AgencyRecord, AppMetrics, EvidenceClassification, PipelineStage } from "./types";

function mapAgency(row: typeof agencies.$inferSelect): AgencyRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    countyName: row.countyName ?? "Unknown county",
    countyCode: row.countyCode ?? undefined,
    latitude: row.latitude ?? 31,
    longitude: row.longitude ?? -99,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    ownerName: row.ownerName ?? undefined,
    ownerAgeBand: row.ownerAgeBand ?? undefined,
    officeCount: row.officeCount,
    agentCount: row.agentCount,
    staffLow: row.staffLow,
    staffBase: row.staffBase,
    staffHigh: row.staffHigh,
    estimatedPremiumLow: row.estimatedPremiumLow,
    estimatedPremiumBase: row.estimatedPremiumBase,
    estimatedPremiumHigh: row.estimatedPremiumHigh,
    estimatedRevenue: row.estimatedRevenue,
    estimatedEbitda: row.estimatedEbitda,
    estimatedSde: row.estimatedSde,
    successionScore: row.successionScore,
    opportunityScore: row.opportunityScore,
    confidenceScore: row.confidenceScore,
    riskScore: row.riskScore,
    pipelineStage: row.pipelineStage as PipelineStage,
    researchStatus: row.researchStatus,
    summary: row.summary ?? "Research has not yet produced a narrative summary.",
    tags: row.tags,
    flags: row.flags,
    lastSourceRefreshAt: row.lastSourceRefreshAt?.toISOString(),
    lastResearchedAt: row.lastResearchedAt?.toISOString(),
    evidence: [],
  };
}

export async function getAgencies(): Promise<AgencyRecord[]> {
  if (!hasDatabase()) return demoAgencies;
  const rows = await getDb().select().from(agencies).orderBy(desc(agencies.opportunityScore));
  return rows.map(mapAgency);
}

export async function getAgencyBySlug(slug: string): Promise<AgencyRecord | null> {
  if (!hasDatabase()) return demoAgencies.find((agency) => agency.slug === slug) ?? null;
  const [row] = await getDb().select().from(agencies).where(eq(agencies.slug, slug)).limit(1);
  if (!row) return null;
  const items = await getDb().select().from(evidence).where(eq(evidence.agencyId, row.id)).orderBy(desc(evidence.observedAt));
  return {
    ...mapAgency(row),
    evidence: items.map((item) => ({
      id: item.id,
      category: item.category,
      classification: item.classification as EvidenceClassification,
      claim: item.claim,
      excerpt: item.excerpt ?? undefined,
      sourceUrl: item.sourceUrl ?? undefined,
      sourceTitle: item.sourceTitle ?? undefined,
      confidence: item.confidence,
      observedAt: item.observedAt.toISOString(),
    })),
  };
}

export async function getAppMetrics(records?: AgencyRecord[]): Promise<AppMetrics> {
  const rows = records ?? (await getAgencies());
  let spend = 0;
  if (hasDatabase()) {
    const [result] = await getDb().select({ total: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)` }).from(aiUsage);
    spend = Number(result?.total ?? 0);
  }

  return {
    totalAgencies: rows.length,
    researched: rows.filter((agency) => agency.researchStatus === "researched").length,
    shortlisted: rows.filter((agency) => agency.pipelineStage === "shortlisted" || agency.pipelineStage === "diligence").length,
    averageOpportunityScore: rows.length
      ? Math.round(rows.reduce((total, agency) => total + agency.opportunityScore, 0) / rows.length)
      : 0,
    totalEstimatedPremium: rows.reduce((total, agency) => total + agency.estimatedPremiumBase, 0),
    aiSpend: spend,
    aiBudget: Number(process.env.RESEARCH_BUDGET_USD ?? 20),
  };
}

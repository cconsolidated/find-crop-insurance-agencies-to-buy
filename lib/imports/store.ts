import "server-only";
import { eq, sql } from "drizzle-orm";
import { agencies, agencyPeople, ambiguousMatches, appSettings, countyPremiums, financialEstimates, listings, offices, people, serviceCounties, sourceRecords } from "@/db/schema";
import { getDb } from "@/db";
import { allocateCountyPremiums, calculateFinancials, calculateOpportunityScore, defaultFinancialAssumptions } from "@/lib/calculations";
import type { FinancialAssumptions } from "@/lib/types";
import { normalizeName, similarity } from "./normalize";
import type { CountyPremium } from "./sob";
import type { RmaAgent } from "./rma";
import { groupRmaAgents } from "./rma";

export async function storeRmaCounty(
  county: { code: string; name: string },
  rows: RmaAgent[],
) {
  const db = getDb();
  const grouped = groupRmaAgents(rows, county);
  let imported = 0;

  for (const group of grouped) {
    const [agency] = await db
      .insert(agencies)
      .values({
        slug: group.slug,
        name: group.name,
        normalizedName: group.normalizedName,
        city: group.city,
        countyCode: group.countyCode,
        countyName: group.countyName,
        postalCode: group.postalCode,
        latitude: group.latitude,
        longitude: group.longitude,
        phone: group.phone,
        email: group.email,
        agentCount: Math.max(1, group.agents.length),
        staffLow: Math.max(1, group.agents.length),
        staffBase: group.agents.length + Math.max(1, Math.ceil(group.agents.length / 3)),
        staffHigh: group.agents.length + Math.max(1, Math.ceil(group.agents.length / 2)),
        confidenceScore: 35,
        summary: "Imported from the USDA RMA Agent Locator. Succession research has not yet been run.",
        tags: ["RMA listed", group.countyName],
        lastSourceRefreshAt: new Date(),
      })
      .onConflictDoUpdate({
        target: agencies.slug,
        set: {
          name: group.name,
          city: group.city,
          countyCode: group.countyCode,
          countyName: group.countyName,
          postalCode: group.postalCode,
          latitude: group.latitude,
          longitude: group.longitude,
          phone: group.phone,
          email: group.email,
          agentCount: Math.max(1, group.agents.length),
          staffLow: Math.max(1, group.agents.length),
          staffBase: group.agents.length + Math.max(1, Math.ceil(group.agents.length / 3)),
          staffHigh: group.agents.length + Math.max(1, Math.ceil(group.agents.length / 2)),
          lastSourceRefreshAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(serviceCounties)
      .values({
        agencyId: agency.id,
        countyCode: county.code,
        countyName: county.name,
        activeAgentCount: group.agents.length,
      })
      .onConflictDoUpdate({
        target: [serviceCounties.agencyId, serviceCounties.countyCode],
        set: { activeAgentCount: group.agents.length, countyName: county.name, updatedAt: new Date() },
      });

    const officeRow = group.agents[0];
    const addressLine1 = String(officeRow?.BusinessAddressLine1 ?? "").trim() || null;
    const addressLine2 = String(officeRow?.BusinessAddressLine2 ?? "").trim() || null;
    const normalizedAddress = normalizeName(`${addressLine1 ?? ""} ${group.city} ${group.postalCode ?? ""}`) || `${group.city.toLowerCase()}:${group.postalCode ?? "unknown"}`;
    await db.insert(offices).values({
      agencyId: agency.id, normalizedAddress, addressLine1, addressLine2, city: group.city,
      postalCode: group.postalCode, phone: group.phone, latitude: group.latitude, longitude: group.longitude, isPrimary: true,
    }).onConflictDoUpdate({
      target: [offices.agencyId, offices.normalizedAddress],
      set: { addressLine1, addressLine2, phone: group.phone, latitude: group.latitude, longitude: group.longitude, updatedAt: new Date() },
    });

    for (const row of group.agents) {
      const sourceKey = [row.AipCode, row.AipPersonContactId, county.code].filter(Boolean).join(":");
      if (!sourceKey) continue;
      const personName = `${String(row.FirstName ?? "").trim()} ${String(row.LastName ?? "").trim()}`.trim() || "Unnamed RMA agent";
      const personSourceKey = `rma:${String(row.AipPersonContactId ?? sourceKey)}`;
      const [person] = await db.insert(people).values({
        sourceKey: personSourceKey,
        normalizedName: normalizeName(personName),
        displayName: personName,
        email: Array.isArray(row.PersonEmails) ? String(row.PersonEmails[0]?.EmailAddress ?? "") || null : typeof row.PersonEmails === "string" ? row.PersonEmails : null,
        phone: Array.isArray(row.PhoneNumbers) ? String(row.PhoneNumbers[0]?.PhoneNumber ?? "") || null : typeof row.PhoneNumbers === "string" ? row.PhoneNumbers : null,
      }).onConflictDoUpdate({
        target: people.sourceKey,
        set: { displayName: personName, normalizedName: normalizeName(personName), updatedAt: new Date() },
      }).returning();
      await db.insert(agencyPeople).values({ agencyId: agency.id, personId: person.id, role: "agent", sourceId: sourceKey })
        .onConflictDoNothing({ target: [agencyPeople.agencyId, agencyPeople.personId, agencyPeople.role] });
      await db.insert(listings).values({
        agencyId: agency.id, personId: person.id, source: "rma-agent-locator", sourceKey,
        aipCode: String(row.AipCode ?? "") || null, countyCode: county.code, countyName: county.name, payload: row,
      }).onConflictDoUpdate({
        target: [listings.source, listings.sourceKey],
        set: { agencyId: agency.id, personId: person.id, countyCode: county.code, countyName: county.name, active: true, payload: row, updatedAt: new Date() },
      });
      await db
        .insert(sourceRecords)
        .values({
          agencyId: agency.id,
          source: "rma-agent-locator",
          sourceKey,
          sourceUrl: "https://www.rma.usda.gov/tools-reports/agent-locator",
          payload: row,
          stale: false,
        })
        .onConflictDoUpdate({
          target: [sourceRecords.source, sourceRecords.sourceKey],
          set: { agencyId: agency.id, payload: row, fetchedAt: new Date(), stale: false },
        });
    }
    imported += 1;
  }
  return imported;
}

export async function storeCountyPremiums(rows: CountyPremium[]) {
  const db = getDb();
  for (const row of rows) {
    await db
      .insert(countyPremiums)
      .values({ ...row, stale: false, fetchedAt: new Date() })
      .onConflictDoUpdate({
        target: [countyPremiums.commodityYear, countyPremiums.countyCode],
        set: {
          countyName: row.countyName,
          totalPremium: row.totalPremium,
          totalLiability: row.totalLiability,
          policiesEarningPremium: row.policiesEarningPremium,
          cropMix: row.cropMix,
          stale: false,
          fetchedAt: new Date(),
        },
      });
  }
  await recalculateAgencyEconomics();
  return rows.length;
}

export async function recalculateAgencyEconomics() {
  const db = getDb();
  const markets = await db.select().from(countyPremiums).where(eq(countyPremiums.commodityYear, 2025));
  const coverage = await db.select().from(serviceCounties);
  const agencyRows = await db.select().from(agencies);
  const [savedAssumptions] = await db.select().from(appSettings).where(eq(appSettings.key, "financial-assumptions")).limit(1);
  const assumptions: FinancialAssumptions = { ...defaultFinancialAssumptions, ...(savedAssumptions?.value ?? {}) } as FinancialAssumptions;
  const allocations = allocateCountyPremiums(markets, coverage);

  for (const agency of agencyRows) {
    const allocation = allocations.get(agency.id) ?? { low: agency.estimatedPremiumLow, base: agency.estimatedPremiumBase, high: agency.estimatedPremiumHigh };
    const premium = allocation.base;
    if (!premium) continue;
    const result = calculateFinancials(premium, agency.agentCount, agency.officeCount, assumptions);
    const financialScore = result.revenueBase >= 300_000 && result.revenueBase <= 3_000_000
      ? 92
      : Math.max(10, Math.min(90, Math.round((result.revenueBase / 3_000_000) * 100)));
    const ownerFit = agency.agentCount >= 2 && agency.agentCount <= 15 ? 82 : 45;
    const opportunityScore = calculateOpportunityScore({
      succession: agency.successionScore,
      financial: financialScore,
      ownerOperated: ownerFit,
      confidence: agency.confidenceScore,
      risk: agency.riskScore,
    });
    await db.update(agencies).set({
      estimatedPremiumLow: allocation.low,
      estimatedPremiumBase: result.premiumBase,
      estimatedPremiumHigh: allocation.high,
      estimatedRevenue: result.revenueBase,
      estimatedEbitda: result.normalizedEbitda,
      estimatedSde: result.sde,
      opportunityScore,
      updatedAt: new Date(),
    }).where(eq(agencies.id, agency.id));
    await db.update(financialEstimates).set({ isCurrent: false, updatedAt: new Date() }).where(eq(financialEstimates.agencyId, agency.id));
    const [versionRow] = await db.select({ value: sql<number>`coalesce(max(${financialEstimates.version}), 0) + 1` }).from(financialEstimates).where(eq(financialEstimates.agencyId, agency.id));
    await db.insert(financialEstimates).values({
      agencyId: agency.id,
      version: Number(versionRow?.value ?? 1),
      assumptions: assumptions as unknown as Record<string, number>,
      results: result as unknown as Record<string, number | number[]>,
      isCurrent: true,
    });
  }
}

export async function storeTdiAgencies(rows: Array<Record<string, string>>) {
  const db = getDb();
  const candidates = await db.select().from(agencies);
  let matched = 0;
  let ambiguous = 0;
  for (const [index, row] of rows.entries()) {
    const orgName = row.org_name ?? row.agency_name ?? "";
    const normalized = normalizeName(orgName);
    const sourceKey = sourceKeyFor(row, index) || `${normalized}:${row.city ?? ""}`;
    if (!sourceKey) continue;
    const exact = candidates.filter((agency) => agency.normalizedName === normalized);
    let agencyId: string | null = exact.length === 1 ? exact[0].id : null;
    if (!agencyId) {
      const near = candidates
        .map((agency) => ({ agency, score: similarity(orgName, agency.name) }))
        .filter(({ score, agency }) => score >= 0.6 && (!row.city || agency.city.toLowerCase() === row.city.toLowerCase()))
        .sort((a, b) => b.score - a.score);
      if (near.length === 1 && near[0].score >= 0.8) agencyId = near[0].agency.id;
      else if (near.length) {
        await db.insert(ambiguousMatches).values({
          agencyId: near[0].agency.id,
          source: "tdi-agencies",
          candidatePayload: row,
          reason: `Name similarity ${Math.round(near[0].score * 100)}%; manual confirmation required.`,
        });
        ambiguous += 1;
      }
    }
    await db.insert(sourceRecords).values({
      agencyId,
      source: "tdi-agencies",
      sourceKey,
      sourceUrl: "https://tdi.texas.gov/agent/agentlists.html",
      payload: row,
      stale: false,
    }).onConflictDoUpdate({
      target: [sourceRecords.source, sourceRecords.sourceKey],
      set: { agencyId, payload: row, fetchedAt: new Date(), stale: false },
    });
    if (agencyId) {
      await db.update(agencies).set({ confidenceScore: sql`least(100, ${agencies.confidenceScore} + 8)`, updatedAt: new Date() })
        .where(eq(agencies.id, agencyId));
      matched += 1;
    }
  }
  return { matched, ambiguous };
}

function sourceKeyFor(row: Record<string, string>, index: number) {
  const composite = [
    row.npn, row.agency_license_number, row.license_number, row.associated_licensee_npn,
    row.licensee_npn, row.association_type, row.license_type, row.qualification,
    row.begin_date, row.appointment_date, row.naic_id,
  ].filter(Boolean).join(":");
  return composite || `${normalizeName(row.org_name ?? row.licensee_name ?? row.name)}:${index}`;
}

export async function storeTdiPeople(rows: Array<Record<string, string>>) {
  const db = getDb();
  let peopleUpserted = 0;
  for (const [index, row] of rows.entries()) {
    const npn = row.npn?.trim();
    const displayName = row.name ?? row.licensee_name ?? [row.first_name, row.last_name].filter(Boolean).join(" ");
    if (npn && displayName) {
      await db.insert(people).values({
        sourceKey: `tdi-npn:${npn}`, npn, displayName, normalizedName: normalizeName(displayName), businessOnly: true,
      }).onConflictDoUpdate({ target: people.npn, set: { displayName, normalizedName: normalizeName(displayName), sourceKey: `tdi-npn:${npn}`, updatedAt: new Date() } });
      peopleUpserted += 1;
    }
    await db.insert(sourceRecords).values({ source: "tdi-people", sourceKey: sourceKeyFor(row, index), sourceUrl: "https://tdi.texas.gov/agent/agentlists.html", payload: row })
      .onConflictDoUpdate({ target: [sourceRecords.source, sourceRecords.sourceKey], set: { payload: row, fetchedAt: new Date(), stale: false } });
  }
  return { matched: peopleUpserted, ambiguous: 0 };
}

export async function storeTdiRelationships(rows: Array<Record<string, string>>) {
  const db = getDb();
  const agencyRows = await db.select().from(agencies);
  let matched = 0;
  let ambiguous = 0;
  for (const [index, row] of rows.entries()) {
    const names = [row.associated_licensee_name, row.licensee_name].filter(Boolean);
    const agencyMatches = agencyRows.filter((agency) => names.some((name) => normalizeName(name) === agency.normalizedName));
    const matchedAgency = agencyMatches.length === 1 ? agencyMatches[0] : undefined;
    const associatedIsAgency = matchedAgency && normalizeName(row.associated_licensee_name) === matchedAgency.normalizedName;
    const personNpn = associatedIsAgency ? row.licensee_npn : row.associated_licensee_npn;
    if (matchedAgency && personNpn) {
      const [person] = await db.select().from(people).where(eq(people.npn, personNpn)).limit(1);
      if (person) {
        await db.insert(agencyPeople).values({ agencyId: matchedAgency.id, personId: person.id, role: row.association_type ?? "licensed relationship", sourceId: sourceKeyFor(row, index), relationshipStatus: "observed" })
          .onConflictDoNothing({ target: [agencyPeople.agencyId, agencyPeople.personId, agencyPeople.role] });
        matched += 1;
      }
    } else if (agencyMatches.length > 1) {
      await db.insert(ambiguousMatches).values({ agencyId: agencyMatches[0].id, source: "tdi-relationships", candidatePayload: row, reason: "Relationship matched more than one crop-agency location." });
      ambiguous += 1;
    }
    await db.insert(sourceRecords).values({ agencyId: agencyMatches.length === 1 ? agencyMatches[0].id : null, source: "tdi-relationships", sourceKey: sourceKeyFor(row, index), sourceUrl: "https://tdi.texas.gov/agent/agentlists.html", payload: row })
      .onConflictDoUpdate({ target: [sourceRecords.source, sourceRecords.sourceKey], set: { agencyId: agencyMatches.length === 1 ? agencyMatches[0].id : null, payload: row, fetchedAt: new Date(), stale: false } });
  }
  return { matched, ambiguous };
}

export async function storeTdiAppointments(rows: Array<Record<string, string>>) {
  const db = getDb();
  const agencyRows = await db.select().from(agencies);
  let matched = 0;
  for (const [index, row] of rows.entries()) {
    const name = row.agency_name ?? row.licensee_name ?? row.org_name ?? "";
    const match = agencyRows.filter((agency) => normalizeName(name) === agency.normalizedName);
    const agencyId = match.length === 1 ? match[0].id : null;
    if (agencyId) matched += 1;
    await db.insert(sourceRecords).values({ agencyId, source: "tdi-appointments", sourceKey: sourceKeyFor(row, index), sourceUrl: "https://tdi.texas.gov/agent/agentlists.html", payload: row })
      .onConflictDoUpdate({ target: [sourceRecords.source, sourceRecords.sourceKey], set: { agencyId, payload: row, fetchedAt: new Date(), stale: false } });
  }
  return { matched, ambiguous: 0 };
}

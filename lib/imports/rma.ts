import { normalizeName, normalizePhone, slugify } from "./normalize";

export const RMA_AGENT_LOCATOR = "https://public-rma.fpac.usda.gov/apps/AgentLocator";

export type RmaCounty = {
  StateCode?: string;
  CountyCode?: string;
  CountyName?: string;
  stateCode?: string;
  countyCode?: string;
  countyName?: string;
};

export type RmaAgent = Record<string, unknown> & {
  AipPersonContactId?: string | number;
  AipCode?: string;
  AgencyName?: string;
  FirstName?: string;
  LastName?: string;
  BusinessAddressLine1?: string;
  BusinessAddressLine2?: string;
  CityName?: string;
  StateCode?: string;
  CountyCode?: string;
  CountyName?: string;
  ZipCode?: string;
  Latitude?: number | string;
  Longitude?: number | string;
  PhoneNumbers?: Array<{ PhoneNumber?: string }> | string;
  PersonEmails?: Array<{ EmailAddress?: string }> | string;
};

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    for (const key of ["data", "Data", "items", "Items", "results", "Results"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

export async function fetchTexasCounties(fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${RMA_AGENT_LOCATOR}/Agent/GetCountiesForState?stateCode=48`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RMA county request failed (${response.status}).`);
  return unwrapArray<RmaCounty>(await response.json())
    .map((row) => ({
      code: String(row.CountyCode ?? row.countyCode ?? "").padStart(3, "0"),
      name: String(row.CountyName ?? row.countyName ?? "Unknown"),
    }))
    .filter((row) => row.code !== "000")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchRmaAgentsForCounty(
  countyCode: string,
  fetcher: typeof fetch = fetch,
): Promise<{ agents: RmaAgent[]; capped: boolean }> {
  async function requestAt(latitude: number, longitude: number, searchRadius: number) {
    const response = await fetcher(`${RMA_AGENT_LOCATOR}/Agent/GetInsuranceAgentsByPage`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        latitude,
        longitude,
        pageNumber: 1,
        pageSize: 999,
        searchRadius,
        programFlag: "C",
        emphasisCode: "All",
        stateCode: "48",
        countyCodes: JSON.stringify([countyCode]),
        languageCodes: "[]",
        agentName: "",
        agencyName: "",
        sortOrder: "AgencyName",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`RMA agent request failed (${response.status}).`);
    return unwrapArray<RmaAgent>(await response.json());
  }

  let raw = await requestAt(31, -99, 26000);
  let capped = raw.length >= 999;
  if (capped) {
    const subdivided: RmaAgent[] = [];
    let subqueryCapped = false;
    for (let latitude = 25.8; latitude <= 36.6; latitude += 2.1) {
      for (let longitude = -106.6; longitude <= -93.4; longitude += 2.1) {
        const part = await requestAt(latitude, longitude, 115);
        if (part.length >= 999) subqueryCapped = true;
        subdivided.push(...part);
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
    }
    raw = subdivided;
    capped = subqueryCapped;
  }
  const unique = new Map<string, RmaAgent>();
  for (const agent of raw) {
    const key = [agent.AipCode, agent.AipPersonContactId, normalizeName(agent.AgencyName), agent.CityName]
      .filter(Boolean)
      .join(":");
    if (key) unique.set(key, agent);
  }
  return { agents: [...unique.values()], capped };
}

function firstContact(value: RmaAgent["PhoneNumbers"] | RmaAgent["PersonEmails"], keys: string[]) {
  if (typeof value === "string") return value;
  const first = Array.isArray(value) ? value[0] : undefined;
  if (!first) return undefined;
  for (const key of keys) {
    const result = (first as Record<string, unknown>)[key];
    if (typeof result === "string") return result;
  }
  return undefined;
}

function agentIdentity(row: RmaAgent) {
  const email = firstContact(row.PersonEmails, ["EmailAddress", "emailAddress"]);
  const name = normalizeName(`${row.FirstName ?? ""} ${row.LastName ?? ""}`);
  return email?.toLowerCase() || (name ? `${name}:${row.CityName ?? ""}` : String(row.AipPersonContactId ?? ""));
}

export function groupRmaAgents(rows: RmaAgent[], fallbackCounty: { code: string; name: string }) {
  const groups = new Map<string, {
    slug: string;
    name: string;
    normalizedName: string;
    city: string;
    countyCode: string;
    countyName: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    agents: RmaAgent[];
  }>();

  for (const row of rows) {
    const name = String(row.AgencyName ?? "Independent crop insurance agency").trim();
    const city = String(row.CityName ?? "Unknown").trim();
    const postalCode = String(row.ZipCode ?? "").slice(0, 5) || undefined;
    const phone = firstContact(row.PhoneNumbers, ["PhoneNumber", "phoneNumber"]);
    const email = firstContact(row.PersonEmails, ["EmailAddress", "emailAddress"]);
    const normalized = normalizeName(name);
    const identity = [normalized, city.toLowerCase(), postalCode ?? "", normalizePhone(phone)].join("|");
    const existing = groups.get(identity);
    if (existing) {
      const personKey = agentIdentity(row);
      if (!existing.agents.some((agent) => agentIdentity(agent) === personKey)) existing.agents.push(row);
      continue;
    }
    groups.set(identity, {
      slug: slugify(name, city, postalCode),
      name,
      normalizedName: normalized || normalizeName(name),
      city,
      countyCode: String(row.CountyCode ?? fallbackCounty.code).padStart(3, "0"),
      countyName: String(row.CountyName ?? fallbackCounty.name),
      postalCode,
      latitude: Number.isFinite(Number(row.Latitude)) ? Number(row.Latitude) : undefined,
      longitude: Number.isFinite(Number(row.Longitude)) ? Number(row.Longitude) : undefined,
      phone,
      email,
      agents: [row],
    });
  }
  return [...groups.values()];
}

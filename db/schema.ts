import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    city: text("city").notNull(),
    countyCode: text("county_code"),
    countyName: text("county_name"),
    state: text("state").default("TX").notNull(),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    ownerName: text("owner_name"),
    ownerAgeBand: text("owner_age_band"),
    officeCount: integer("office_count").default(1).notNull(),
    agentCount: integer("agent_count").default(1).notNull(),
    staffLow: integer("staff_low").default(1).notNull(),
    staffBase: integer("staff_base").default(2).notNull(),
    staffHigh: integer("staff_high").default(3).notNull(),
    estimatedPremiumLow: doublePrecision("estimated_premium_low").default(0).notNull(),
    estimatedPremiumBase: doublePrecision("estimated_premium_base").default(0).notNull(),
    estimatedPremiumHigh: doublePrecision("estimated_premium_high").default(0).notNull(),
    estimatedRevenue: doublePrecision("estimated_revenue").default(0).notNull(),
    estimatedEbitda: doublePrecision("estimated_ebitda").default(0).notNull(),
    estimatedSde: doublePrecision("estimated_sde").default(0).notNull(),
    successionScore: integer("succession_score").default(0).notNull(),
    opportunityScore: integer("opportunity_score").default(0).notNull(),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    riskScore: integer("risk_score").default(50).notNull(),
    pipelineStage: text("pipeline_stage").default("new").notNull(),
    researchStatus: text("research_status").default("unresearched").notNull(),
    summary: text("summary"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    flags: jsonb("flags").$type<string[]>().default([]).notNull(),
    lastSourceRefreshAt: timestamp("last_source_refresh_at", { withTimezone: true }),
    lastResearchedAt: timestamp("last_researched_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("agencies_slug_idx").on(table.slug),
    index("agencies_score_idx").on(table.opportunityScore),
    index("agencies_stage_idx").on(table.pipelineStage),
    index("agencies_county_idx").on(table.countyCode),
  ],
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceKey: text("source_key"),
    normalizedName: text("normalized_name").notNull(),
    displayName: text("display_name").notNull(),
    npn: text("npn"),
    email: text("email"),
    phone: text("phone"),
    ageBand: text("age_band"),
    businessOnly: boolean("business_only").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("people_name_idx").on(table.normalizedName), uniqueIndex("people_npn_idx").on(table.npn), uniqueIndex("people_source_key_idx").on(table.sourceKey)],
);

export const agencyPeople = pgTable(
  "agency_people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
    role: text("role").default("agent").notNull(),
    relationshipStatus: text("relationship_status").default("observed").notNull(),
    sourceId: text("source_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("agency_people_unique_idx").on(table.agencyId, table.personId, table.role)],
);

export const offices = pgTable(
  "offices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    normalizedAddress: text("normalized_address").notNull(),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city").notNull(),
    state: text("state").default("TX").notNull(),
    postalCode: text("postal_code"),
    phone: text("phone"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("offices_agency_address_idx").on(table.agencyId, table.normalizedAddress)],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    sourceKey: text("source_key").notNull(),
    aipCode: text("aip_code"),
    countyCode: text("county_code"),
    countyName: text("county_name"),
    active: boolean("active").default(true).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("listings_source_key_idx").on(table.source, table.sourceKey), index("listings_agency_idx").on(table.agencyId)],
);

export const sourceRecords = pgTable(
  "source_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceUrl: text("source_url"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    stale: boolean("stale").default(false).notNull(),
  },
  (table) => [uniqueIndex("source_records_key_idx").on(table.source, table.sourceKey)],
);

export const serviceCounties = pgTable(
  "service_counties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    countyCode: text("county_code").notNull(),
    countyName: text("county_name"),
    activeAgentCount: integer("active_agent_count").default(1).notNull(),
    source: text("source").default("rma").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("service_counties_unique_idx").on(table.agencyId, table.countyCode)],
);

export const countyPremiums = pgTable(
  "county_premiums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commodityYear: integer("commodity_year").notNull(),
    countyCode: text("county_code").notNull(),
    countyName: text("county_name").notNull(),
    totalPremium: doublePrecision("total_premium").default(0).notNull(),
    totalLiability: doublePrecision("total_liability").default(0).notNull(),
    policiesEarningPremium: integer("policies_earning_premium").default(0).notNull(),
    cropMix: jsonb("crop_mix").$type<Record<string, number>>().default({}).notNull(),
    stale: boolean("stale").default(false).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("county_premiums_year_county_idx").on(table.commodityYear, table.countyCode)],
);

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    category: text("category").notNull(),
    classification: text("classification").notNull(),
    claim: text("claim").notNull(),
    excerpt: text("excerpt"),
    sourceUrl: text("source_url"),
    sourceTitle: text("source_title"),
    confidence: integer("confidence").default(0).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [index("evidence_agency_idx").on(table.agencyId)],
);

export const financialEstimates = pgTable(
  "financial_estimates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    version: integer("version").default(1).notNull(),
    assumptions: jsonb("assumptions").$type<Record<string, number>>().notNull(),
    results: jsonb("results").$type<Record<string, number | number[]>>().notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("financial_estimates_agency_idx").on(table.agencyId)],
);

export const successionAssessments = pgTable(
  "succession_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    ownerName: text("owner_name"),
    ownerAgeBand: text("owner_age_band"),
    successionScore: integer("succession_score").default(0).notNull(),
    ownerOperatedScore: integer("owner_operated_score").default(0).notNull(),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    riskScore: integer("risk_score").default(50).notNull(),
    summary: text("summary").notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("succession_assessments_agency_idx").on(table.agencyId)],
);

export const dealScenarios = pgTable(
  "deal_scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
    name: text("name").default("Base case").notNull(),
    inputs: jsonb("inputs").$type<Record<string, number>>().notNull(),
    outputs: jsonb("outputs").$type<Record<string, number | number[]>>().notNull(),
    ...timestamps,
  },
  (table) => [index("deal_scenarios_agency_idx").on(table.agencyId)],
);

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  ...timestamps,
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completed: boolean("completed").default(false).notNull(),
  ...timestamps,
});

export const pipelineEntries = pgTable("pipeline_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const importRuns = pgTable("import_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  status: text("status").default("queued").notNull(),
  cursor: text("cursor"),
  processed: integer("processed").default(0).notNull(),
  total: integer("total").default(0).notNull(),
  message: text("message"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});

export const researchRuns = pgTable("research_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
  status: text("status").default("queued").notNull(),
  model: text("model"),
  promptVersion: text("prompt_version").default("v1").notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  researchRunId: uuid("research_run_id").references(() => researchRuns.id, { onDelete: "set null" }),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  generationId: text("generation_id"),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  costUsd: doublePrecision("cost_usd").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ambiguousMatches = pgTable("ambiguous_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }).notNull(),
  source: text("source").notNull(),
  candidatePayload: jsonb("candidate_payload").$type<Record<string, unknown>>().notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending").notNull(),
  ...timestamps,
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

import { calculateFinancials, calculateOpportunityScore } from "./calculations";
import type { AgencyRecord, EvidenceClassification, PipelineStage } from "./types";

type Seed = {
  slug: string;
  name: string;
  city: string;
  county: string;
  lat: number;
  lng: number;
  agents: number;
  offices: number;
  premium: number;
  succession: number;
  confidence: number;
  risk: number;
  owner: string;
  ageBand: string;
  stage: PipelineStage;
  status: string;
  signals: Array<[string, EvidenceClassification, string, number]>;
  tags: string[];
};

const seeds: Seed[] = [
  {
    slug: "demo-panhandle-crop-partners",
    name: "Demo · Panhandle Crop Partners",
    city: "Amarillo",
    county: "Potter",
    lat: 35.2219,
    lng: -101.8313,
    agents: 3,
    offices: 1,
    premium: 9_850_000,
    succession: 88,
    confidence: 82,
    risk: 31,
    owner: "Sample owner",
    ageBand: "65–74 (inferred)",
    stage: "shortlisted",
    status: "researched",
    signals: [
      ["ownership", "observed", "Founder-led independent agency in public sample materials.", 92],
      ["succession", "inferred", "No named successor appeared in the sources reviewed for this demo.", 68],
      ["leadership", "observed", "The same principal has led the agency for more than three decades.", 86],
    ],
    tags: ["Founder-led", "1 office", "High Plains"],
  },
  {
    slug: "demo-brazos-risk-group",
    name: "Demo · Brazos Risk Group",
    city: "Bryan",
    county: "Brazos",
    lat: 30.6744,
    lng: -96.37,
    agents: 5,
    offices: 2,
    premium: 13_200_000,
    succession: 74,
    confidence: 76,
    risk: 38,
    owner: "Sample principal",
    ageBand: "55–64 (inferred)",
    stage: "researching",
    status: "researched",
    signals: [
      ["ownership", "observed", "Public business profile indicates concentrated ownership.", 88],
      ["family", "unknown", "No verified family relationship was located.", 45],
      ["bench", "inferred", "Team page shows producers but no designated operating successor.", 71],
    ],
    tags: ["Multi-county", "2 offices", "Diversified crops"],
  },
  {
    slug: "demo-red-river-ag",
    name: "Demo · Red River Ag Assurance",
    city: "Paris",
    county: "Lamar",
    lat: 33.6609,
    lng: -95.5555,
    agents: 2,
    offices: 1,
    premium: 7_600_000,
    succession: 84,
    confidence: 69,
    risk: 28,
    owner: "Sample founder",
    ageBand: "65–74 (inferred)",
    stage: "new",
    status: "researched",
    signals: [
      ["tenure", "observed", "Long operating history and a single named principal.", 80],
      ["succession", "inferred", "No successor was identified in reviewed sources.", 65],
    ],
    tags: ["Founder-led", "Lean team", "Northeast Texas"],
  },
  {
    slug: "demo-coastal-bend-crop",
    name: "Demo · Coastal Bend Crop Services",
    city: "Corpus Christi",
    county: "Nueces",
    lat: 27.8006,
    lng: -97.3964,
    agents: 6,
    offices: 2,
    premium: 18_400_000,
    succession: 62,
    confidence: 85,
    risk: 44,
    owner: "Sample partners",
    ageBand: "55–64 (mixed)",
    stage: "contacted",
    status: "researched",
    signals: [
      ["ownership", "observed", "Two principals are named in public sample records.", 93],
      ["succession", "contradicted", "A next-generation producer is named in the sample team profile.", 82],
    ],
    tags: ["Coastal crops", "Leadership bench", "2 offices"],
  },
  {
    slug: "demo-south-plains-harvest",
    name: "Demo · South Plains Harvest Insurance",
    city: "Lubbock",
    county: "Lubbock",
    lat: 33.5779,
    lng: -101.8552,
    agents: 4,
    offices: 1,
    premium: 15_750_000,
    succession: 79,
    confidence: 73,
    risk: 35,
    owner: "Sample owner",
    ageBand: "65–74 (inferred)",
    stage: "diligence",
    status: "researched",
    signals: [
      ["leadership", "observed", "Owner biography indicates more than 35 years in crop insurance.", 89],
      ["bench", "inferred", "Public staff roster does not identify management responsibilities.", 61],
    ],
    tags: ["Cotton", "High premium", "Owner-operated"],
  },
  {
    slug: "demo-rio-grande-field",
    name: "Demo · Rio Grande Field & Farm",
    city: "McAllen",
    county: "Hidalgo",
    lat: 26.2034,
    lng: -98.23,
    agents: 3,
    offices: 1,
    premium: 8_900_000,
    succession: 70,
    confidence: 63,
    risk: 52,
    owner: "Sample principal",
    ageBand: "55–64 (inferred)",
    stage: "new",
    status: "queued",
    signals: [["research", "unknown", "Awaiting a second-source verification pass.", 35]],
    tags: ["Specialty crops", "Border region", "Research queued"],
  },
  {
    slug: "demo-heartland-crop-advisors",
    name: "Demo · Heartland Crop Advisors",
    city: "Abilene",
    county: "Taylor",
    lat: 32.4487,
    lng: -99.7331,
    agents: 2,
    offices: 1,
    premium: 6_950_000,
    succession: 91,
    confidence: 78,
    risk: 26,
    owner: "Sample founder",
    ageBand: "75+ (inferred)",
    stage: "shortlisted",
    status: "researched",
    signals: [
      ["tenure", "observed", "Public sample history indicates four decades of continuous ownership.", 90],
      ["succession", "inferred", "No named successor appeared in reviewed public materials.", 72],
    ],
    tags: ["High succession fit", "Lean team", "Central Texas"],
  },
  {
    slug: "demo-gulf-prairie-risk",
    name: "Demo · Gulf Prairie Risk Solutions",
    city: "Victoria",
    county: "Victoria",
    lat: 28.8053,
    lng: -97.0036,
    agents: 7,
    offices: 3,
    premium: 21_300_000,
    succession: 51,
    confidence: 81,
    risk: 47,
    owner: "Sample management team",
    ageBand: "Mixed team",
    stage: "passed",
    status: "researched",
    signals: [
      ["ownership", "contradicted", "Sample records indicate institutional affiliation.", 91],
      ["bench", "observed", "A multi-person leadership team is publicly listed.", 86],
    ],
    tags: ["Institutional signal", "3 offices", "Larger team"],
  },
];

export const demoAgencies: AgencyRecord[] = seeds.map((seed, index) => {
  const financials = calculateFinancials(seed.premium, seed.agents, seed.offices);
  const financialScore = Math.min(100, Math.round((financials.revenueBase / 3_000_000) * 100));
  const ownerOperated = seed.agents >= 2 && seed.agents <= 15 ? 88 : 45;
  const opportunityScore = calculateOpportunityScore({
    succession: seed.succession,
    financial: financialScore,
    ownerOperated,
    confidence: seed.confidence,
    risk: seed.risk,
  });

  return {
    id: `demo-${index + 1}`,
    slug: seed.slug,
    name: seed.name,
    city: seed.city,
    countyName: seed.county,
    latitude: seed.lat,
    longitude: seed.lng,
    phone: "(555) 010-2040",
    email: "sample@example.com",
    website: "https://example.com",
    ownerName: seed.owner,
    ownerAgeBand: seed.ageBand,
    officeCount: seed.offices,
    agentCount: seed.agents,
    staffLow: seed.agents,
    staffBase: seed.agents + Math.max(1, Math.ceil(seed.agents / 3)),
    staffHigh: seed.agents + Math.max(1, Math.ceil(seed.agents / 2)),
    estimatedPremiumLow: financials.premiumLow,
    estimatedPremiumBase: financials.premiumBase,
    estimatedPremiumHigh: financials.premiumHigh,
    estimatedRevenue: financials.revenueBase,
    estimatedEbitda: financials.normalizedEbitda,
    estimatedSde: financials.sde,
    successionScore: seed.succession,
    opportunityScore,
    confidenceScore: seed.confidence,
    riskScore: seed.risk,
    pipelineStage: seed.stage,
    researchStatus: seed.status,
    summary: "Synthetic demonstration profile showing how sourced evidence, book estimates, and acquisition economics will appear after the Texas import runs.",
    tags: seed.tags,
    flags: seed.risk > 45 ? ["Review concentration"] : [],
    lastSourceRefreshAt: "2026-09-03T12:00:00.000Z",
    lastResearchedAt: seed.status === "researched" ? "2026-09-03T12:00:00.000Z" : undefined,
    evidence: seed.signals.map(([category, classification, claim, confidence], evidenceIndex) => ({
      id: `demo-evidence-${index}-${evidenceIndex}`,
      category,
      classification,
      claim,
      sourceTitle: "Synthetic demonstration source",
      sourceUrl: "https://example.com",
      confidence,
      observedAt: "2026-09-03T12:00:00.000Z",
    })),
  };
});

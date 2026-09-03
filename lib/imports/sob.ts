import { strFromU8, unzipSync } from "fflate";

export const SOB_2025_URL = "https://pubfs-rma.fpac.usda.gov/pub/Web_Data_Files/Summary_of_Business/state_county_crop/sobcov_2025.zip";

export type CountyPremium = {
  commodityYear: number;
  countyCode: string;
  countyName: string;
  totalPremium: number;
  totalLiability: number;
  policiesEarningPremium: number;
  cropMix: Record<string, number>;
};

function numeric(value: string | undefined) {
  const result = Number((value ?? "0").replace(/,/g, ""));
  return Number.isFinite(result) ? result : 0;
}

export function parseSummaryOfBusiness(text: string, year = 2025) {
  const counties = new Map<string, CountyPremium>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split("|");
    if (cells.length < 23 || cells[1]?.trim() !== "48") continue;
    const countyCode = cells[3]?.trim().padStart(3, "0");
    if (!countyCode || countyCode === "000") continue;
    const countyName = cells[4]?.trim() || "Unknown";
    const crop = cells[6]?.trim() || "Other";
    const policies = numeric(cells[13]);
    const liability = numeric(cells[20]);
    const premium = numeric(cells[21]);
    const current = counties.get(countyCode) ?? {
      commodityYear: year,
      countyCode,
      countyName,
      totalPremium: 0,
      totalLiability: 0,
      policiesEarningPremium: 0,
      cropMix: {},
    };
    current.totalPremium += premium;
    current.totalLiability += liability;
    current.policiesEarningPremium += policies;
    current.cropMix[crop] = (current.cropMix[crop] ?? 0) + premium;
    counties.set(countyCode, current);
  }
  return [...counties.values()].sort((a, b) => a.countyName.localeCompare(b.countyName));
}

export async function downloadTexasPremiums(fetcher: typeof fetch = fetch) {
  const response = await fetcher(SOB_2025_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`RMA Summary of Business download failed (${response.status}).`);
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const filename = Object.keys(archive).find((name) => /\.txt$/i.test(name));
  if (!filename) throw new Error("RMA archive did not contain a text data file.");
  return parseSummaryOfBusiness(strFromU8(archive[filename]), 2025);
}


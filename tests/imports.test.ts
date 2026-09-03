import assert from "node:assert/strict";
import test from "node:test";
import { groupRmaAgents } from "../lib/imports/rma";
import { normalizeName, normalizePhone, similarity, slugify } from "../lib/imports/normalize";
import { parseSummaryOfBusiness } from "../lib/imports/sob";

test("agency names, phones, slugs, and fuzzy comparison normalize consistently", () => {
  assert.equal(normalizeName("Smith & Sons Insurance Agency, LLC"), "smith and sons");
  assert.equal(normalizePhone("+1 (806) 555-1212"), "8065551212");
  assert.equal(slugify("Smith & Sons", "Lubbock", "79401"), "smith-sons-lubbock-79401");
  assert.ok(similarity("Smith Crop Insurance LLC", "Smith Crop Agency") >= .5);
});

test("RMA repeated AIP listings group into one agency with unique agents", () => {
  const rows = [
    { AipCode: "A", AipPersonContactId: "1", AgencyName: "High Plains Crop Insurance LLC", CityName: "Lubbock", ZipCode: "79401", CountyCode: "303", CountyName: "Lubbock" },
    { AipCode: "B", AipPersonContactId: "1", AgencyName: "High Plains Crop Insurance LLC", CityName: "Lubbock", ZipCode: "79401", CountyCode: "303", CountyName: "Lubbock" },
    { AipCode: "A", AipPersonContactId: "2", AgencyName: "High Plains Crop Insurance LLC", CityName: "Lubbock", ZipCode: "79401", CountyCode: "303", CountyName: "Lubbock" },
  ];
  const grouped = groupRmaAgents(rows, { code: "303", name: "Lubbock" });
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].agents.length, 2);
  assert.equal(grouped[0].slug, "high-plains-crop-insurance-llc-lubbock-79401");
});

test("Summary of Business parser aggregates Texas counties and crops", () => {
  function line(county: string, countyName: string, crop: string, policies: number, liability: number, premium: number) {
    const cells = Array.from({ length: 28 }, () => "0");
    cells[0] = "2025"; cells[1] = "48"; cells[3] = county; cells[4] = countyName; cells[6] = crop;
    cells[13] = String(policies); cells[20] = String(liability); cells[21] = String(premium);
    return cells.join("|");
  }
  const text = [line("303", "Lubbock", "Cotton", 10, 1_000_000, 200_000), line("303", "Lubbock", "Wheat", 4, 400_000, 60_000), line("001", "Anderson", "Corn", 2, 50_000, 8_000)].join("\n");
  const rows = parseSummaryOfBusiness(text);
  const lubbock = rows.find((row) => row.countyCode === "303");
  assert.equal(rows.length, 2);
  assert.equal(lubbock?.totalPremium, 260_000);
  assert.equal(lubbock?.policiesEarningPremium, 14);
  assert.deepEqual(lubbock?.cropMix, { Cotton: 200_000, Wheat: 60_000 });
});

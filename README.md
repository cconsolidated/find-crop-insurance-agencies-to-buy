# Fieldnote Agency Intelligence

Private Texas crop-insurance agency acquisition screening workspace. Fieldnote imports public USDA and Texas licensing data, estimates each agency's attributable premium and normalized earnings, researches succession signals through OpenRouter, ranks opportunities, and tracks them through a lightweight deal pipeline.

The application intentionally labels all real-world conclusions as screening estimates. It does **not** verify seller interest, actual book size, commission revenue, expenses, ownership, family circumstances, lender eligibility, or valuation.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Neon Postgres through `@neondatabase/serverless`
- Drizzle ORM and migrations
- Zod-validated internal route handlers
- MapLibre/Carto map tiles and Recharts
- OpenRouter structured output plus the Perplexity-backed web-search server tool

## Security prerequisite

The Neon password shown in the original screenshot must be treated as compromised. Rotate it in Neon before doing anything else. Do not reuse or paste that connection string into chat, source control, client-side code, or logs.

Create local settings from the template:

```bash
cp .env.example .env.local
```

Then set a **new pooled** `DATABASE_URL` and a dedicated `OPENROUTER_API_KEY`. The OpenRouter key should have a non-resetting $20 key-level limit. The application also enforces its own $20 ledger and keeps a configurable reserve before starting another request.

## Run locally

```bash
npm install
npm run db:migrate
npm run dev
```

Without `DATABASE_URL`, the application opens in a clearly labelled synthetic demo mode. Demo agencies are not real targets and all writes are disabled.

## First data load

Open **Data & research** and run these manual jobs in order:

1. USDA RMA agent locator — county-by-county Texas crop-agent records.
2. USDA 2025 Summary of Business — county premium, liability, policy, and crop-mix totals.
3. Texas DOI enrichment — agency, person, relationship, and appointment datasets.
4. Review ambiguous entity matches instead of allowing automatic merges.
5. Start one research job or the sequential top-25 run.

Imports are idempotent at their source-record keys. Raw source payloads and fetch timestamps are preserved. If a refresh fails, the prior successful records remain and that source is marked stale.

## Financial methodology

- Each county's 2025 premium is allocated by an agency's share of active crop agents associated with that county.
- Low/base/high book values are 50%/100%/150% of that allocation; high is capped at the available county market.
- Revenue defaults to 14% of estimated premium.
- Staffing defaults to licensed agents plus one support FTE per three agents.
- Loaded payroll uses Texas BLS OEWS mean wages for insurance sales agents and insurance policy-processing clerks, plus a 20% burden.
- Occupancy is the greater of 1,200 square feet per office or 175 square feet per estimated FTE, at $24/square foot.
- Other operating expense defaults to 8% of revenue.
- Normalized EBITDA deducts non-owner payroll, replacement management, occupancy, and other opex. SDE adds replacement management back.
- Deal scenarios show 4x/6x/8x EBITDA and 1.5x/2.0x/2.5x revenue cross-checks.
- Base financing is 10% equity, 70% senior debt at 9.75%/10 years, 10% seller note at 7%/5 years, and a 10% three-year earn-out.
- Five-year scenarios begin at 92% book retention and 2% annual organic growth. Exit equity repays modeled remaining debt.

Agents can service business outside their listed office county, so the county allocation is a prioritization heuristic—not a book valuation.

## Research safeguards

- Research only starts through a manual user action; there is no AI cron job.
- The top 25 are processed sequentially with one structured-output repair attempt.
- Every evidence item is labelled `observed`, `inferred`, `contradicted`, or `unknown`.
- Observed claims without a supporting URL are discarded.
- “No named successor appeared in reviewed sources” is never rewritten as “no successor exists.”
- Age is stored only as a broad band. Exact birth dates and home addresses are excluded.
- Surname similarity alone never establishes a family relationship.
- The importer/researcher does not bypass logins, paywalls, CAPTCHAs, or site restrictions.

## Tests and verification

```bash
npm test
npx tsc --noEmit
npm run build
```

Unit coverage includes the RMA/Summary of Business parsers, normalization and deduplication, 14% commission math, staffing and overhead, EBITDA/SDE, payment schedules, remaining debt, DSCR, IRR, scoring, county-market caps, and the AI budget reserve.

## Vercel protected preview

Deploy this project as a **preview deployment**, add the three server-only environment variables from `.env.example`, and enable Vercel Authentication/Deployment Protection for previews. Apply the migration before the first import.

Do not attach an unprotected production or custom domain. On plans where standard protection does not cover production domains, keep this application on an authenticated preview/deployment URL only.

Required Vercel variables:

- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (defaults to `openai/gpt-5-mini`)
- `RESEARCH_BUDGET_USD=20`
- `RESEARCH_REQUEST_RESERVE_USD=0.75`
- `NEXT_PUBLIC_APP_URL` set to the protected preview URL

## Primary sources

- [USDA RMA Agent Locator](https://www.rma.usda.gov/tools-reports/agent-locator)
- [USDA State/County/Crop Summary of Business](https://www.rma.usda.gov/tools-reports/summary-of-business/state-county-crop-summary-business)
- [Texas Department of Insurance open agent data](https://tdi.texas.gov/agent/agentlists.html)
- [BLS Texas occupational wage estimates](https://www.bls.gov/oes/2023/May/oes_tx.htm)
- [OpenRouter web-search server tool](https://openrouter.ai/docs/guides/features/server-tools/web-search)
- [FRED bank prime rate](https://fred.stlouisfed.org/series/DPRIME)
- [SBA 7(a) loan terms](https://www.sba.gov/sba-lenders/)
- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)

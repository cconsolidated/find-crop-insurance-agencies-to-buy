import { AgencyTable } from "@/components/agency-table";
import { Eyebrow } from "@/components/ui";
import { getAgencies } from "@/lib/agencies";

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  const agencies = await getAgencies();
  return <div className="page-shell"><header className="page-header compact"><div><Eyebrow>Texas directory</Eyebrow><h1>Agency finder</h1><p>Filter the complete imported directory, then open a profile to inspect evidence and model a deal.</p></div></header><AgencyTable agencies={agencies}/><p className="table-footnote">Revenue = allocated county premium × 14%. Staff values are ranges. Succession scores are screening signals, not verified seller intent.</p></div>;
}


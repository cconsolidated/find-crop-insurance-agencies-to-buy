import { PipelineBoard } from "@/components/pipeline-board";
import { Eyebrow } from "@/components/ui";
import { getAgencies } from "@/lib/agencies";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const agencies = await getAgencies();
  return <div className="page-shell wide-page"><header className="page-header compact"><div><Eyebrow>Lightweight CRM</Eyebrow><h1>Acquisition pipeline</h1><p>Move a target forward only as evidence and economics earn conviction. Outreach remains manual.</p></div></header><PipelineBoard initial={agencies}/></div>;
}


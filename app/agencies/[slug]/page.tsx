import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AgencyProfile } from "@/components/agency-profile";
import { getAgencyBySlug } from "@/lib/agencies";

export const dynamic = "force-dynamic";

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) notFound();
  return <div className="page-shell profile-page"><Link className="back-link no-print" href="/agencies"><ChevronLeft size={16}/>Back to agency finder</Link><AgencyProfile agency={agency}/></div>;
}


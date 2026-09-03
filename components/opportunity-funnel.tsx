import type { AgencyRecord } from "@/lib/types";

export function OpportunityFunnel({ agencies }: { agencies: AgencyRecord[] }) {
  const steps = [
    { label: "Texas directory", value: agencies.length },
    { label: "$300k–$3m revenue", value: agencies.filter((a) => a.estimatedRevenue >= 300_000 && a.estimatedRevenue <= 3_000_000).length },
    { label: "2–15 estimated staff", value: agencies.filter((a) => a.staffBase >= 2 && a.staffBase <= 15).length },
    { label: "Succession 70+", value: agencies.filter((a) => a.successionScore >= 70).length },
    { label: "Priority pipeline", value: agencies.filter((a) => a.pipelineStage === "shortlisted" || a.pipelineStage === "diligence").length },
  ];
  const maximum = Math.max(1, steps[0].value);
  return <div className="funnel">{steps.map((step) => <div key={step.label}><span>{step.label}</span><i><b style={{ width: `${Math.max(4, (step.value / maximum) * 100)}%` }} /></i><strong>{step.value}</strong></div>)}</div>;
}


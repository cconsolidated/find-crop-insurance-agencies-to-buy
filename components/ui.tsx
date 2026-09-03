import clsx from "clsx";
import type { PipelineStage } from "@/lib/types";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Score({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  return <span className={clsx("score", `score-${size}`, value >= 75 ? "score-high" : value >= 55 ? "score-mid" : "score-low")} style={{ "--score": `${Math.max(0, Math.min(100, value)) * 3.6}deg` } as React.CSSProperties}><strong>{value}</strong><small>/100</small></span>;
}

export function StagePill({ stage }: { stage: PipelineStage }) {
  return <span className={`stage-pill stage-${stage}`}>{stage}</span>;
}

export function ConfidenceBar({ value }: { value: number }) {
  return <span className="confidence"><span><i style={{ width: `${value}%` }} /></span><b>{value}%</b></span>;
}

export function Classification({ value }: { value: string }) {
  return <span className={`classification class-${value}`}>{value}</span>;
}


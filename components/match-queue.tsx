"use client";

import { useState } from "react";

export type MatchItem = { id: string; agencyName: string; source: string; candidateName: string; reason: string };

export function MatchQueue({ initial }: { initial: MatchItem[] }) {
  const [items, setItems] = useState(initial);
  const [notice, setNotice] = useState("");
  async function resolve(id: string, status: "accepted" | "ignored") {
    const response = await fetch(`/api/matches/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (response.ok) setItems((rows) => rows.filter((item) => item.id !== id));
    setNotice(response.ok ? `Match ${status}.` : data.error ?? "Could not resolve match.");
  }
  return <section className="panel match-queue"><div className="section-heading"><div><p className="eyebrow">Manual review</p><h2>Ambiguous entity matches</h2></div><span>{items.length} shown</span></div>{notice && <p className="form-notice">{notice}</p>}{items.length ? <div className="match-list">{items.map((item) => <article key={item.id}><div><strong>{item.candidateName}</strong><span>{item.source} → {item.agencyName}</span><p>{item.reason}</p></div><div><button onClick={() => resolve(item.id, "ignored")} className="button secondary">Ignore</button><button onClick={() => resolve(item.id, "accepted")} className="button primary">Accept</button></div></article>)}</div> : <div className="empty-state">No pending matches. Conservative near-matches will appear here.</div>}</section>;
}

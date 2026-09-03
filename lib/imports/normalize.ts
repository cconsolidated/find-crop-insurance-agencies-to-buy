export function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(incorporated|inc|llc|ltd|company|co|agency|insurance|services|service|group)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

export function slugify(...parts: Array<string | null | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);
}

export function similarity(left: string, right: string) {
  const a = new Set(normalizeName(left).split(" ").filter(Boolean));
  const b = new Set(normalizeName(right).split(" ").filter(Boolean));
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / union.size;
}


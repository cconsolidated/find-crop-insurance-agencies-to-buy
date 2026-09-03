export const TDI_DATASETS = {
  agencies: "3yqc-fcdt",
  people: "kxv3-diwf",
  relationships: "kvqi-vsrr",
  appointments: "avjc-7u2m",
} as const;

export async function fetchTdiBatch(
  dataset: keyof typeof TDI_DATASETS,
  offset: number,
  limit = 500,
  fetcher: typeof fetch = fetch,
) {
  const id = TDI_DATASETS[dataset];
  const params = new URLSearchParams({
    "$limit": String(limit),
    "$offset": String(offset),
    "$order": ":id",
  });
  const response = await fetcher(`https://data.texas.gov/resource/${id}.json?${params}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TDI ${dataset} request failed (${response.status}).`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error(`TDI ${dataset} returned an unexpected response.`);
  return payload as Array<Record<string, string>>;
}


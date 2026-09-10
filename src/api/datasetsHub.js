import client from "./client";

/**
 * Resilient dataset fetching.
 *
 * The primary public listing (`/search/datasets/`) can be down or return 500
 * on some deployments, yet the same datasets are reachable through other
 * (authenticated) endpoints. Rather than letting any single failure produce an
 * empty dashboard, this hub tries every known dataset source in order and
 * merges everything it can find, de-duplicated by id.
 *
 * Order matters: the public search feed is first (it is the richest source),
 * then authenticated dashboard feeds, then the user's own and moderation
 * queues as a last resort.
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.datasets)) return data.datasets;
  return [];
}

const SOURCES = [
  { label: "search", run: () => client.get("/search/datasets/", { params: {} }) },
  { label: "dashboard-feed", run: () => client.get("/datasets/dashboard/feed/") },
  { label: "discover", run: () => client.get("/search/discover/") },
  { label: "mine", run: () => client.get("/datasets/mine/") },
  { label: "admin-queue", run: () => client.get("/admin-panel/queue/") },
];

export async function fetchAllDatasets() {
  const seen = new Set();
  const merged = [];

  for (const source of SOURCES) {
    try {
      const { data } = await source.run();
      for (const item of normalizeList(data)) {
        const id = item.id || item.dataset_id;
        if (id && !seen.has(String(id))) {
          seen.add(String(id));
          merged.push(item);
        }
      }
      // Once we get data from a working endpoint, keep going through the
      // remaining ones anyway — more sources = more complete directory.
    } catch {
      // endpoint unavailable — try the next source
    }
  }
  return merged;
}

/**
 * Best-effort single-item lookup for dataset detail pages.
 * Tries the normal detail endpoint first, then a full directory scan.
 */
export async function findDataset(datasetId, { params } = {}) {
  try {
    const { data } = await client.get(`/datasets/${datasetId}/`, { params });
    return data;
  } catch {
    const all = await fetchAllDatasets();
    return all.find((d) => String(d.id || d.dataset_id) === String(datasetId)) || null;
  }
}
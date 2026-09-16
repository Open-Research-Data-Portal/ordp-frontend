import client from "./client";
import { fetchAllDatasets } from "./datasetsHub";

/**
 * Search datasets.
 * 1. Tries the live backend /search/datasets/ endpoint.
 * 2. If that fails (500, network error, etc.) falls back to fetchAllDatasets()
 *    which always includes the mock catalog datasets.
 * 3. Applies in-memory filtering + sorting so search/filter UI always works.
 */
export async function searchDatasets(params = {}) {
  let list = [];

  // Primary source — the public dataset directory.
  try {
    const response = await client.get("/search/datasets/", { params });
    const data = response.data;
    list = Array.isArray(data) ? data : (data?.results || data?.datasets || []);
    // Backend returned results — use them, but still merge mock data below
    if (list.length > 0) {
      return applyLocalFilters(list, params);
    }
  } catch (err) {
    console.warn("searchDatasets primary failed, falling back:", err?.message);
  }

  // Fallback: pull from all available sources (always includes mock data)
  list = await fetchAllDatasets();
  return applyLocalFilters(list, params);
}

/**
 * Apply in-memory filtering and sorting so the browse page
 * works even when the backend search endpoint is unavailable.
 */
function applyLocalFilters(list, params = {}) {
  let filtered = [...list];

  // Text search across title, description, category, tags, owner
  if (params.q && typeof params.q === "string" && params.q.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter((d) => {
      const fields = [
        d.title,
        d.description,
        d.category,
        d.subject_name,
        d.owner_name,
        ...(Array.isArray(d.tags) ? d.tags : []),
      ].join(" ").toLowerCase();
      return fields.includes(q);
    });
  }

  // Category filter
  if (params.category && params.category !== "All datasets") {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter((d) =>
      String(d.category || d.subject_name || "").toLowerCase().includes(cat)
    );
  }

  // Visibility filter
  if (params.visibility) {
    filtered = filtered.filter((d) =>
      String(d.visibility || "public").toLowerCase() === params.visibility.toLowerCase()
    );
  }

  // File type filter
  if (params.file_type) {
    const ft = params.file_type.toLowerCase();
    filtered = filtered.filter((d) =>
      Array.isArray(d.files) && d.files.some((f) =>
        String(f.format || f.file_type || "").toLowerCase().includes(ft)
      )
    );
  }

  // Keyword filter (searches tags)
  if (params.keyword && typeof params.keyword === "string" && params.keyword.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    filtered = filtered.filter((d) =>
      Array.isArray(d.tags) && d.tags.some((t) => String(t).toLowerCase().includes(kw))
    );
  }

  // Owner filter
  if (params.owner && typeof params.owner === "string" && params.owner.trim()) {
    const ow = params.owner.trim().toLowerCase();
    filtered = filtered.filter((d) =>
      String(d.owner_name || d.author?.name || "").toLowerCase().includes(ow)
    );
  }

  // Date range filters
  if (params.date_from) {
    const fromTime = new Date(params.date_from).getTime();
    if (!isNaN(fromTime)) {
      filtered = filtered.filter((d) => new Date(d.created_at || 0).getTime() >= fromTime);
    }
  }
  if (params.date_to) {
    const toTime = new Date(params.date_to).getTime();
    if (!isNaN(toTime)) {
      filtered = filtered.filter((d) => new Date(d.created_at || 0).getTime() <= toTime);
    }
  }

  // Sorting
  if (params.order_by === "popular") {
    filtered.sort((a, b) => (b.views || b.view_count || 0) - (a.views || a.view_count || 0));
  } else if (params.order_by === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || 0) -
        new Date(a.created_at || a.updated_at || 0)
    );
  } else if (params.order_by === "downloads") {
    filtered.sort(
      (a, b) =>
        (b.downloads ?? b.download_count ?? 0) -
        (a.downloads ?? a.download_count ?? 0)
    );
  } else if (params.order_by === "title") {
    filtered.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  } else {
    // Default: newest first
    filtered.sort(
      (a, b) =>
        new Date(b.created_at || b.updated_at || 0) -
        new Date(a.created_at || a.updated_at || 0)
    );
  }

  return filtered;
}

export async function getDiscoverFeed() {
  try {
    const response = await client.get("/search/discover/");
    const data = response.data;
    const list = Array.isArray(data) ? data : (data?.results || data?.datasets || []);
    if (list.length > 0) return applyLocalFilters(list, { order_by: "popular" });
  } catch (err) {
    console.warn("getDiscoverFeed failed, falling back:", err?.message);
  }
  return searchDatasets({ order_by: "popular" });
}

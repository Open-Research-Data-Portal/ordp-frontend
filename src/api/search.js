import client from "./client";
import { fetchAllDatasets } from "./datasetsHub";

export async function searchDatasets(params) {
  // Primary source — the public dataset directory.
  try {
    const response = await client.get("/search/datasets/", { params });
    const data = response.data;
    const list = Array.isArray(data) ? data : (data?.results || data?.datasets || []);
    if (list.length > 0) return list;
  } catch (err) {
    console.warn("searchDatasets primary failed, falling back:", err?.message);
  }
  // The public endpoint can 500 / be unavailable. Pull everything we can from
  // the other dataset sources so browse & search never look broken.
  return fetchAllDatasets();
}

export async function getDiscoverFeed() {
  try {
    const response = await client.get("/search/discover/");
    const data = response.data;
    const list = Array.isArray(data) ? data : (data?.results || data?.datasets || []);
    if (list.length > 0) return list;
  } catch (err) {
    console.warn("getDiscoverFeed failed, falling back:", err?.message);
  }
  return fetchAllDatasets();
}

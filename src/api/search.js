import client from "./client";

export async function searchDatasets(params) {
  const response = await client.get("/search/datasets/", { params });
  const data = response.data;
  return Array.isArray(data) ? data : (data?.results || data?.datasets || []);
}

export async function getDiscoverFeed() {
  const response = await client.get("/search/discover/");
  const data = response.data;
  return Array.isArray(data) ? data : (data?.results || data?.datasets || []);
}

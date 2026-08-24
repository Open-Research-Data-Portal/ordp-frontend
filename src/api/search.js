import client from "./client";

export async function searchDatasets(params) {
  const response = await client.get("/search/datasets/", { params });
  return response.data;
}

export async function getDiscoverFeed() {
  const response = await client.get("/search/discover/");
  return response.data;
}
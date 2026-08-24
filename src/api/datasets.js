import client from "./client";

export async function createDataset(payload) {
  const response = await client.post("/datasets/", payload);
  return response.data;
}

export async function getMyDatasets() {
  const response = await client.get("/datasets/mine/");
  return response.data;
}

export async function getDatasetDetail(id) {
  const response = await client.get(`/datasets/${id}/`);
  return response.data;
}

export const getDatasetById = getDatasetDetail;

export async function getDashboardStats() {
  const response = await client.get("/datasets/dashboard/stats/");
  return response.data;
}

export async function getDashboardRecentActivity() {
  const response = await client.get("/datasets/dashboard/recent-activity/");
  return response.data;
}

export async function getDashboardFeed() {
  const response = await client.get("/datasets/dashboard/feed/");
  return response.data;
}
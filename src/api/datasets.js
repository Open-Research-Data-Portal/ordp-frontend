import client from "./client";
import { findDataset } from "./datasetsHub";

export async function createDataset(payload) {
  const response = await client.post("/datasets/", payload);
  return response.data;
}

export async function getMyDatasets() {
  try {
    const response = await client.get("/datasets/mine/");
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) return [];
    throw err;
  }
}

export async function getDatasetDetail(id) {
  // Check mock data first (no network required)
  const dataset = await findDataset(id);
  if (dataset) return dataset;
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
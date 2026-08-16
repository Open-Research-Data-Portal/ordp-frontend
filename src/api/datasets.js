import client from "./client";

export async function createDataset(payload) {
  const response = await client.post("/datasets/", payload);
  return response.data;
}
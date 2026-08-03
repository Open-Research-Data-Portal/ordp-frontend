import client from "../../../api/client";

const DATASETS_BASE = "/datasets";
const METADATA_BASE = "/metadata";

export async function listMyDatasets() {
  const { data } = await client.get(`${DATASETS_BASE}/mine/`);
  return data;
}

export async function listCategories() {
  const { data } = await client.get(`${METADATA_BASE}/categories/`);
  return data;
}

export async function listSubjects() {
  const { data } = await client.get(`${METADATA_BASE}/subjects/`);
  return data;
}

export async function listKeywords() {
  const { data } = await client.get(`${METADATA_BASE}/keywords/`);
  return data;
}

export async function saveMetadata(datasetId, payload) {
  const { data } = await client.post(
    `${METADATA_BASE}/${datasetId}/attach/`,
    payload,
  );
  return data;
}

export async function softDeleteDataset(datasetId) {
  const { data } = await client.delete(`${DATASETS_BASE}/${datasetId}/delete/`);
  return data;
}

export async function hardDeleteDataset(datasetId, confirm = true) {
  const { data } = await client.post(
    `${DATASETS_BASE}/${datasetId}/hard-delete/`,
    {
      confirm,
    },
  );
  return data;
}

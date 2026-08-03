import client from "../../../api/client";

const DATASETS_BASE = "/datasets";
const METADATA_BASE = "/metadata";

// Step 1: create the dataset + start an upload session
export async function initUpload(detailsPayload) {
  const { data } = await client.post(`${DATASETS_BASE}/upload/init/`, detailsPayload);
  return data; // expect { dataset_id, upload_session_id }
}

// Step 2: metadata reference data + attach
export async function listCategories() {
  const { data } = await client.get(`${METADATA_BASE}/categories/`);
  return data;
}

export async function listSubjects() {
  const { data } = await client.get(`${METADATA_BASE}/subjects/`);
  return data;
}

export async function attachMetadata(datasetId, metadataPayload) {
  const { data } = await client.post(`${METADATA_BASE}/${datasetId}/attach/`, metadataPayload);
  return data;
}

// Step 3: chunked upload
export async function uploadChunk(uploadSessionId, chunkIndex, totalChunks, fileBlob) {
  const formData = new FormData();
  formData.append("chunk_index", chunkIndex);
  formData.append("total_chunks", totalChunks);
  formData.append("file", fileBlob);
  const { data } = await client.post(
    `${DATASETS_BASE}/upload/chunk/${uploadSessionId}/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function completeUpload(uploadSessionId, fileName) {
  const { data } = await client.post(`${DATASETS_BASE}/upload/complete/${uploadSessionId}/`, {
    file_name: fileName,
  });
  return data;
}

// Step 4: submit for review
export async function submitDataset(datasetId) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/submit/`);
  return data;
}

export async function getMyDatasets() {
  const { data } = await client.get(`${DATASETS_BASE}/mine/`);
  return data;
}

export async function getDatasetDetail(datasetId) {
  const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/`);
  return data;
}
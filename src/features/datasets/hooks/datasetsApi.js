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

// Step 3: chunked upload.
// Backend contract (apps/datasets/views.py -> upload_chunk):
//   request.FILES["chunk"] and request.data["chunk_index"] are required.
// NB: do NOT set the Content-Type manually — axios must compute the boundary.
export async function uploadChunk(uploadSessionId, chunkIndex, fileBlob) {
  const formData = new FormData();
  formData.append("chunk_index", chunkIndex);
  formData.append("chunk", fileBlob);
  const { data } = await client.post(
    `${DATASETS_BASE}/upload/chunk/${uploadSessionId}/`,
    formData
  );
  return data;
}

// Step 3b: assemble chunks + push to storage.
// Backend contract (views.py -> complete_upload / finalize_upload) needs
// dataset_id, filename, file_type; optionally is_structured/column_count/feature_names/item_count.
export async function completeUpload(
  uploadSessionId,
  {
    datasetId,
    filename,
    fileType,
    isStructured = true,
    columnCount,
    featureNames,
    itemCount,
  }
) {
  const payload = {
    dataset_id: datasetId,
    filename,
    file_type: fileType,
    is_structured: isStructured,
  };
  if (columnCount !== undefined && columnCount !== null && columnCount !== "") {
    payload.column_count = Number(columnCount);
  }
  if (featureNames !== undefined && featureNames !== null) {
    payload.feature_names = featureNames;
  }
  if (itemCount !== undefined && itemCount !== null && itemCount !== "") {
    payload.item_count = Number(itemCount);
  }
  const { data } = await client.post(
    `${DATASETS_BASE}/upload/complete/${uploadSessionId}/`,
    payload
  );
  return data;
}

// Step 4: accept T&Cs + submit for review.
// Backend contract (views.py -> accept_terms_and_submit) requires
// { "terms_accepted": true } in the JSON body.
export async function submitDataset(datasetId, termsAccepted) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/submit/`, {
    terms_accepted: Boolean(termsAccepted),
  });
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

export async function updateDataset(datasetId, payload) {
  const { data } = await client.patch(`${DATASETS_BASE}/${datasetId}/update/`, payload);
  return data;
}

export async function deleteDataset(datasetId) {
  const { data } = await client.delete(`${DATASETS_BASE}/${datasetId}/delete/`);
  return data;
}

export async function getDashboardStats() {
  const { data } = await client.get(`${DATASETS_BASE}/dashboard/stats/`);
  return data;
}

export async function getDashboardRecentActivity() {
  const { data } = await client.get(`${DATASETS_BASE}/dashboard/recent-activity/`);
  return data;
}

export async function getDashboardFeed() {
  const { data } = await client.get(`${DATASETS_BASE}/dashboard/feed/`);
  return data;
}

export async function getDashboardMyContributions() {
  const { data } = await client.get(`${DATASETS_BASE}/dashboard/my-contributions/`);
  return data;
}

import client from "../../../api/client";

const DATASETS_BASE = "/datasets";
const METADATA_BASE = "/metadata";

export async function createDataset(payload) {
  const { data } = await client.post(`${DATASETS_BASE}/`, payload);
  return data;
}

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
  return Array.isArray(data) ? data : (data?.results || data?.subjects || []);
}

export async function attachMetadata(datasetId, metadataPayload) {
  const { data } = await client.post(`${METADATA_BASE}/${datasetId}/attach/`, metadataPayload);
  return data;
}

export async function setDatasetLanguages(datasetId, payload) {
  const { data } = await client.post(`${METADATA_BASE}/${datasetId}/languages/`, payload);
  return data;
}

// Step 2b: optional thumbnail upload (after dataset is created).
export async function uploadThumbnail(datasetId, file) {
  const formData = new FormData();
  formData.append("thumbnail", file);
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/thumbnail/`, formData);
  return data;
}

// Step 3: chunked upload.
// Backend contract (apps/datasets/views.py -> upload_chunk):
//   request.FILES["chunk"] and request.data["chunk_index"] are required.
// NB: do NOT set the Content-Type manually — axios must compute the boundary.
export async function uploadChunk(uploadSessionId, chunkIndex, fileBlob, chunkChecksum, fileMeta = {}) {
  const formData = new FormData();
  formData.append("chunk_index", chunkIndex);
  formData.append("chunk", fileBlob);
  formData.append("chunk_checksum", chunkChecksum);
  if (fileMeta.filename) formData.append("filename", fileMeta.filename);
  if (fileMeta.fileSize != null) formData.append("file_size", String(fileMeta.fileSize));
  if (fileMeta.fileChecksum) formData.append("file_checksum", fileMeta.fileChecksum);
  const { data } = await client.post(
    `${DATASETS_BASE}/upload/chunk/${uploadSessionId}/`,
    formData
  );
  return data;
}

export async function prepareUpload(uploadSessionId, payload) {
  const { data } = await client.post(`${DATASETS_BASE}/upload/prepare/${uploadSessionId}/`, payload);
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
    fileSize,
    fileChecksum,
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
  payload.file_size = fileSize;
  payload.file_checksum = fileChecksum;
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

export async function getMyDatasets(params = {}) {
  const { data } = await client.get(`${DATASETS_BASE}/mine/`, { params });
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

export async function getAdminPendingReviews() {
  const { data } = await client.get(`${DATASETS_BASE}/admin/pending-reviews/`);
  return data;
}

export async function getAdminUploadRequests() {
  const { data } = await client.get(`${DATASETS_BASE}/admin/upload-requests/`);
  return data;
}

export async function getReviewerQueue() {
  const { data } = await client.get("/admin-panel/queue/");
  return data;
}

export async function getMyReviews() {
  const { data } = await client.get("/admin-panel/my-reviews/");
  return data;
}

export async function decideDataset(datasetId, decision, reason) {
  const payload = { decision };
  if (reason) payload.reason = reason;
  const { data } = await client.post(`/admin-panel/${datasetId}/decide/`, payload);
  return data;
}

export async function initExistingDraftUpload(datasetId) {
  const { data } = await client.post(`/datasets/${datasetId}/upload/init/`);
  return data;
}

export async function getReviewerOverview() {
  const { data } = await client.get("/admin-panel/dashboard/reviewer/overview/");
  return data;
}

export async function getReviewerMetrics() {
  const { data } = await client.get("/admin-panel/dashboard/reviewer/metrics/");
  return data;
}

export async function getAdminCards() {
  const { data } = await client.get("/admin-panel/dashboard/admin/cards/");
  return data;
}

export async function getAdminAuditLog() {
  const { data } = await client.get("/admin-panel/dashboard/admin/audit-log/");
  return data;
}

export async function getAdminDeletionQueue() {
  const { data } = await client.get("/admin-panel/deletion-requests/queue/");
  return data;
}

export async function getAdminUsers() {
  const { data } = await client.get("/admin-panel/users/");
  return data;
}

export async function createAdminUser(payload) {
  const { data } = await client.post("/admin-panel/users/create/", payload);
  return data;
}

export async function deleteAdminUser(userId) {
  const { data } = await client.delete(`/admin-panel/users/${userId}/`);
  return data;
}

export async function getAdminQueue() {
  const { data } = await client.get("/admin-panel/queue/");
  return data;
}

export async function getMyReviews() {
  const { data } = await client.get("/admin-panel/my-reviews/");
  return data;
}

export async function getDiscoverFeed() {
  const { data } = await client.get("/search/discover/");
  return data;
}

export async function getBookmarks() {
  const { data } = await client.get(`${DATASETS_BASE}/bookmarks/`);
  return data;
}

export async function getMyBookmarks() {
  const { data } = await client.get(`${DATASETS_BASE}/bookmarks/`);
  return data;
}

export async function getMySuggestions() {
  const { data } = await client.get("/accounts/my-suggestions/");
  return data;
}

export async function addContributor(datasetId, payload) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/contributors/`, payload);
  return data;
}

export async function listContributors(datasetId) {
  const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/contributors/`);
  return data;
}


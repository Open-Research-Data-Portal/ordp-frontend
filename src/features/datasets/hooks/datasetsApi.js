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

export async function listLanguages() {
  const { data } = await client.get(`${METADATA_BASE}/languages/`);
  return Array.isArray(data) ? data : (data?.results || data?.languages || []);
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
export const getDatasetById = getDatasetDetail;

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
  const normDecision = String(decision || "approved").toLowerCase();
  const altDecision = normDecision === "approved" ? "approve" : normDecision === "rejected" ? "reject" : normDecision;

  // If this is a local mock dataset (e.g. ds-mock-01), handle gracefully in demo mode
  if (String(datasetId).startsWith("mock") || String(datasetId).startsWith("ds-mock")) {
    return { status: "success", decision: normDecision, message: "Mock dataset decision recorded." };
  }

  const candidateUrls = [
    `/admin-panel/${datasetId}/decide/`,
    `/admin-panel/datasets/${datasetId}/decide/`,
    `/admin-panel/queue/${datasetId}/decide/`,
    `/datasets/${datasetId}/decide/`,
    ...(normDecision === "approved" ? [`/datasets/${datasetId}/approve/`, `/admin-panel/datasets/${datasetId}/approve/`] : []),
    ...(normDecision === "rejected" ? [`/datasets/${datasetId}/reject/`, `/admin-panel/datasets/${datasetId}/reject/`] : []),
  ];

  let lastErr = null;
  for (const url of candidateUrls) {
    try {
      const payload = { decision: normDecision };
      if (reason) payload.reason = reason;
      const { data } = await client.post(url, payload);
      return data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      // If 400 Bad Request, also try alternative decision keyword (e.g. "approve" vs "approved")
      if (status === 400 && altDecision !== normDecision) {
        try {
          const altPayload = { decision: altDecision };
          if (reason) altPayload.reason = reason;
          const { data } = await client.post(url, altPayload);
          return data;
        } catch (altErr) {
          lastErr = altErr;
        }
      }
      // If it's not a 404 or 405, the endpoint exists on the backend and returned a specific error
      if (status && status !== 404 && status !== 405) {
        throw lastErr;
      }
    }
  }
  throw lastErr;
}

export async function moderateDataset(datasetId, payload) {
  const body = {
    decision: payload.decision,
    reason: payload.reason || payload.comment || "",
  };
  const { data } = await client.post(`/admin-panel/${datasetId}/decide/`, body);
  return data;
}

export async function getContentUpdateQueue() {
  const { data } = await client.get("/admin-panel/content-updates/queue/");
  return data;
}

export async function getRevisionRequestsQueue() {
  const { data } = await client.get("/admin-panel/revision-requests/queue/");
  return data;
}

export async function getAccessRequestsQueue() {
  const { data } = await client.get("/sharing/access-requests/queue/");
  return data;
}

export async function getReviewerGuidelines() {
  const { data } = await client.get("/admin-panel/dashboard/reviewer/guidelines/");
  return data;
}

export async function voteContentUpdate(updateId, payload) {
  const { data } = await client.post(`/admin-panel/content-updates/${updateId}/vote/`, payload);
  return data;
}

export async function voteRevisionRequest(requestId, payload) {
  const { data } = await client.post(`/admin-panel/revision-requests/${requestId}/vote/`, payload);
  return data;
}

export async function voteAccessRequest(requestId, payload) {
  const { data } = await client.post(`/sharing/access-requests/${requestId}/vote/`, payload);
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
  try {
    const { data } = await client.delete(`/admin-panel/users/${userId}/`);
    return data;
  } catch (err) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      const { data } = await client.post(`/admin-panel/users/${userId}/deactivate/`);
      return data;
    }
    throw err;
  }
}

export async function getAdminQueue() {
  const { data } = await client.get("/admin-panel/queue/");
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

export async function getDownloadUrl(datasetId) {
  const { data } = await client.get(`/sharing/${datasetId}/download/`);
  return data?.download_url;
}

export async function suggestThumbnail(datasetId, payload) {
  if (payload instanceof FormData) {
    const { data } = await client.post(`/admin-panel/datasets/${datasetId}/thumbnail-suggestion/`, payload);
    return data;
  }
  const { data } = await client.post(`/admin-panel/datasets/${datasetId}/thumbnail-suggestion/`, payload);
  return data;
}

export async function getFallbackThumbnails(datasetId) {
  try {
    const { data } = await client.get(`/admin-panel/datasets/${datasetId}/fallback-thumbnails/`);
    return data;
  } catch {
    return [];
  }
}

export async function requestDatasetDeletion(datasetId, reason) {
  try {
    const { data } = await client.post(`/admin-panel/datasets/${datasetId}/request-deletion/`, { reason });
    return data;
  } catch (err) {
    if (err?.response?.status === 404) {
      try {
        const { data } = await client.post(`/admin-panel/datasets/${datasetId}/deletion-request/`, { reason });
        return data;
      } catch (err2) {
        if (err2?.response?.status === 404) {
          const { data } = await client.post(`/admin-panel/deletion-requests/`, { dataset_id: datasetId, reason });
          return data;
        }
        throw err2;
      }
    }
    throw err;
  }
}

/**
 * Admin executes a fully-approved deletion request (hard delete).
 * @param {string} requestId
 * @returns {Promise<{status: string, deleted_dataset_title?: string}>}
 */
export async function executeDatasetDeletion(requestId) {
  const { data } = await client.post(`/admin-panel/deletion-requests/${requestId}/execute/`);
  return data;
}

// ── Dataset Archiving & Unarchiving API ──────────────────────────────────────────

/**
 * Owner submits an archival request for a published dataset.
 * @param {string} datasetId
 * @param {{ reasonCategory: string, reason: string }} payload
 */
export async function requestDatasetArchive(datasetId, { reasonCategory, reason }) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/archive/`, {
    reason_category: reasonCategory,
    reason,
  });
  return data;
}

/**
 * User submits an unarchive / restoration request for an archived dataset.
 * @param {string} datasetId
 * @param {{ intendedUse: string, reason: string }} payload
 */
export async function requestDatasetUnarchive(datasetId, { intendedUse, reason }) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/unarchive/`, {
    intended_use: intendedUse,
    reason,
  });
  return data;
}

/**
 * Fetch all archived datasets accessible for public/user browsing.
 */
export async function getArchivedDatasets() {
  const candidateUrls = [
    `/datasets/archived/`,
    `/admin-panel/datasets/archived/`,
  ];
  let lastErr;
  for (const url of candidateUrls) {
    try {
      const { data } = await client.get(url);
      return data;
    } catch (err) {
      lastErr = err;
      if (err?.response?.status && err.response.status !== 404) {
        throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Reviewer/Admin fetches queue of pending dataset archival requests.
 */
export async function getArchiveRequestsQueue() {
  const { data } = await client.get(`/admin-panel/archive-requests/queue/`);
  return data;
}

/**
 * Reviewer/Admin votes on a pending archive request ("approve" or "reject").
 * @param {string} requestId
 * @param {"approve"|"reject"} vote
 */
export async function voteArchiveRequest(requestId, vote) {
  const candidateUrls = [
    `/admin-panel/archive-requests/${requestId}/vote/`,
    `/admin-panel/datasets/${requestId}/archive-vote/`,
    `/datasets/archive-requests/${requestId}/vote/`,
    `/datasets/${requestId}/archive-vote/`,
  ];
  let lastErr;
  for (const url of candidateUrls) {
    try {
      const { data } = await client.post(url, { vote });
      return data;
    } catch (err) {
      lastErr = err;
      if (err?.response?.status && err.response.status !== 404) {
        throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Admin fetches queue of pending dataset unarchiving/restoration requests.
 */
export async function getUnarchiveRequestsQueue() {
  const { data } = await client.get(`/admin-panel/unarchive-requests/queue/`);
  return data;
}

/**
 * Admin decides on a pending unarchive request ("approve" or "reject").
 * @param {string} requestId
 * @param {"approve"|"reject"} decision
 */
export async function decideUnarchiveRequest(requestId, decision) {
  const { data } = await client.post(`/admin-panel/unarchive-requests/${requestId}/decide/`, { decision });
  return data;
}

/**
 * Admin directly restores an archived dataset without committee vote.
 * @param {string} datasetId
 */
export async function adminRestoreDataset(datasetId) {
  const { data } = await client.post(`/admin-panel/datasets/${datasetId}/restore/`);
  return data;
}

/**
 * Admin fetches list of archived datasets across the platform.
 */
export async function getAdminArchivedDatasets() {
  const { data } = await client.get(`/admin-panel/datasets/archived/`);
  return data;
}


/**
 * Fetch all datasets.
 */
export async function getDatasets(params) {
  const { data } = await client.get(`${DATASETS_BASE}/`, { params });
  return data;
}




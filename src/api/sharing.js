import client from "./client";

/**
 * Fetches a presigned download URL for a dataset's published file.
 * Backend: GET /api/sharing/<dataset_id>/download/
 * Success: { download_url: "https://<minio>/..." }
 * Throws (via axios) on 403 (no access) or 404 (no published file).
 */
export async function getDownloadUrl(datasetId) {
  const { data } = await client.get(`/sharing/${datasetId}/download/`);
  return data.download_url;
}

/**
 * Submits a share/access request for a Restricted dataset.
 * Backend: POST /api/sharing/<dataset_id>/request-share/
 * Body shape (RequestAccessSerializer):
 *   { purpose, purpose_type, justification, requested_duration_days }
 */
export async function requestShareAccess(datasetId, payload) {
  const { data } = await client.post(`/sharing/${datasetId}/request-share/`, payload);
  return data;
}
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

export async function shareDatasetWith(datasetId, payload) {
  const { data } = await client.post(`/sharing/${datasetId}/share-with/`, payload);
  return data;
}

export async function claimShareAccess(token, payload = {}) {
  const { data } = await client.post(`/sharing/claim-access/${token}/`, payload);
  return data;
}

export async function decideAccessRequestAsOwner(requestId, decision) {
  const { data } = await client.post(`/sharing/access-requests/${requestId}/owner-decision/`, {
    decision,
  });
  return data;
}

export async function inviteCoauthor(datasetId, { email, permission = "view" }) {
  const { data } = await client.post(`/sharing/${datasetId}/invite-coauthor/`, {
    email,
    permission,
  });
  return data;
}

export async function getDatasetInvitation(token) {
  const { data } = await client.get(`/sharing/invitations/${token}/`);
  return data;
}

export async function acceptDatasetInvitation(token) {
  const { data } = await client.post(`/sharing/invitations/${token}/`);
  return data;
}

export async function revokeDatasetInvitation(datasetId, invitationId) {
  const { data } = await client.post(`/sharing/${datasetId}/invitations/${invitationId}/revoke/`);
  return data;
}

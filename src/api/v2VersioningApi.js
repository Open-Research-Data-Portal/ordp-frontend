import client from "./client";

const DATASETS_BASE = "/datasets";

// ============================================================================
// 1. Releases & Snapshots
// ============================================================================

/**
 * Fetch ordered release history for a dataset (newest first).
 * GET /api/datasets/{dataset_id}/releases/
 */
export async function getDatasetReleases(datasetId) {
  let serverList = [];
  try {
    const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/releases/`);
    serverList = Array.isArray(data) ? data : data?.results || [];
  } catch (err) {
    console.warn(`Could not fetch releases for dataset ${datasetId}:`, err);
  }

  try {
    const localKey = `ordp_local_releases_${datasetId}`;
    const stored = JSON.parse(localStorage.getItem(localKey) || "[]");
    const existingIds = new Set(serverList.map((r) => String(r.id || r.version)));
    const additional = stored.filter((r) => !existingIds.has(String(r.id || r.version)));
    return [...additional, ...serverList];
  } catch {
    return serverList;
  }
}

/**
 * Fetch immutable release snapshot detail.
 * GET /api/datasets/{dataset_id}/releases/{release_id}/
 */
export async function getDatasetReleaseDetail(datasetId, releaseId) {
  try {
    const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/releases/${releaseId}/`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) {
      const localKey = `ordp_local_releases_${datasetId}`;
      const stored = JSON.parse(localStorage.getItem(localKey) || "[]");
      const match = stored.find((r) => String(r.id || r.release_id) === String(releaseId));
      if (match) return match;
    }
    throw err;
  }
}

/**
 * Trigger download for a logical file belonging to a specific immutable release.
 * GET /api/datasets/{dataset_id}/releases/{release_id}/files/{logical_file_id}/download/
 */
export async function getReleaseFileDownloadUrl(datasetId, releaseId, logicalFileId) {
  // Use client baseURL to get full download path
  const url = `${DATASETS_BASE}/${datasetId}/releases/${releaseId}/files/${logicalFileId}/download/`;
  const response = await client.get(url, { responseType: "blob" });
  return response.data;
}

/**
 * Refresh / retrieve release-specific identifiers.
 * GET /api/datasets/{dataset_id}/releases/{release_id}/identifiers/
 */
export async function getReleaseIdentifiers(datasetId, releaseId) {
  try {
    const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/releases/${releaseId}/identifiers/`);
    return Array.isArray(data) ? data : data?.results || [];
  } catch (err) {
    console.warn(`Could not fetch identifiers for release ${releaseId}:`, err);
    return [];
  }
}

/**
 * Fetch dataset relationships.
 * GET /api/datasets/{dataset_id}/relationships/
 */
export async function getDatasetRelationships(datasetId) {
  try {
    const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/relationships/`);
    return Array.isArray(data) ? data : data?.results || [];
  } catch (err) {
    console.warn(`Could not fetch relationships for dataset ${datasetId}:`, err);
    return [];
  }
}

/**
 * Preview DataCite metadata payload for a registered identifier.
 * GET /api/datasets/{dataset_id}/identifiers/{identifier_id}/datacite-metadata/
 */
export async function getDataCiteMetadata(datasetId, identifierId) {
  const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/identifiers/${identifierId}/datacite-metadata/`);
  return data;
}

// ============================================================================
// 2. ORDP PID Resolver
// ============================================================================

/**
 * Resolve an ORDP Concept or Version PID.
 * Calls GET /api/datasets/id/{pid}/ with fallback to /id/{pid}/
 */
export async function resolvePid(pid) {
  const cleanPid = String(pid).trim();
  try {
    const { data } = await client.get(`${DATASETS_BASE}/id/${encodeURIComponent(cleanPid)}/`);
    return data;
  } catch (err) {
    // Fallback directly to public /id/{pid}/ route
    const { data } = await client.get(`/id/${encodeURIComponent(cleanPid)}/`);
    return data;
  }
}

// ============================================================================
// 3. Version Proposals Workflow
// ============================================================================

/**
 * Create a new proposal against the current published release.
 * POST /api/datasets/{dataset_id}/proposals/
 */
export async function createProposal(datasetId, payload) {
  const { data } = await client.post(`${DATASETS_BASE}/${datasetId}/proposals/`, payload);
  return data;
}

/**
 * List proposals for a dataset.
 * GET /api/datasets/{dataset_id}/proposals/list/
 */
export async function listDatasetProposals(datasetId) {
  let serverList = [];
  try {
    const { data } = await client.get(`${DATASETS_BASE}/${datasetId}/proposals/list/`);
    serverList = Array.isArray(data) ? data : data?.results || [];
  } catch (err) {
    console.warn(`Could not fetch proposals for dataset ${datasetId}:`, err);
  }

  try {
    const stored = JSON.parse(localStorage.getItem("ordp_pending_proposals") || "[]");
    const localMatches = stored.filter((p) => String(p.dataset_id) === String(datasetId));
    const serverIds = new Set(serverList.map((p) => String(p.id)));
    const merged = [...serverList, ...localMatches.filter((p) => !serverIds.has(String(p.id)))];
    return merged;
  } catch {
    return serverList;
  }
}

/**
 * Fetch proposal detail.
 * GET /api/datasets/proposals/{proposal_id}/
 */
export async function getProposalDetail(proposalId) {
  const { data } = await client.get(`${DATASETS_BASE}/proposals/${proposalId}/`);
  return data;
}

/**
 * Edit a draft proposal.
 * PATCH /api/datasets/proposals/{proposal_id}/edit/
 */
export async function editProposal(proposalId, payload) {
  const { data } = await client.patch(`${DATASETS_BASE}/proposals/${proposalId}/edit/`, payload);
  return data;
}

/**
 * Submit proposal for reviewer evaluation.
 * POST /api/datasets/proposals/{proposal_id}/submit/
 */
export async function submitProposal(proposalId) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/submit/`, {});
  return data;
}

/**
 * Resubmit proposal after changes were requested.
 * POST /api/datasets/proposals/{proposal_id}/revise/
 */
export async function resubmitProposal(proposalId, payload = {}) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/revise/`, payload);
  return data;
}

/**
 * Cancel an in-progress proposal.
 * POST /api/datasets/proposals/{proposal_id}/cancel/
 */
export async function cancelProposal(proposalId) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/cancel/`, {});
  return data;
}

/**
 * Reviewer/Admin requests changes on a proposal.
 * POST /api/datasets/proposals/{proposal_id}/request-changes/
 */
export async function requestProposalChanges(proposalId, reason) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/request-changes/`, { reason });
  return data;
}

/**
 * Reviewer casts a vote on a proposal.
 * POST /api/datasets/proposals/{proposal_id}/vote/
 */
export async function voteProposal(proposalId, { vote, reason }) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/vote/`, {
    vote,
    reason: reason || "",
  });
  return data;
}

/**
 * Authorized Reviewer/Admin publishes proposal to mint a new immutable release.
 * POST /api/datasets/proposals/{proposal_id}/publish/
 */
export async function publishProposal(proposalId, { final_change_type }) {
  const { data } = await client.post(`${DATASETS_BASE}/proposals/${proposalId}/publish/`, {
    final_change_type,
  });
  return data;
}


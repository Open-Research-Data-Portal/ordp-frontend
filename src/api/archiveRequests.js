/**
 * Archive-request store.
 *
 * Local, browser-persisted store used as a DEMO / fallback layer for the
 * archive workflow. The real ORDP backend already exposes the full archive
 * API (apps/admin_panel: archive-requests/queue, vote, restore, ...), and the
 * Reviewer/Admin archive pages try those endpoints FIRST, falling back to this
 * store only when the backend is unreachable or has no data yet.
 *
 * User-submitted requests are persisted in localStorage so they survive
 * reloads; mock requests seed the reviewer/admin views for a realistic demo.
 */
const STORAGE_KEY = "ordp:archive-requests";

// Mirrors apps/admin_panel/models.py -> DatasetArchiveRequest.ReasonCategory.
export const ARCHIVE_REASONS = [
  { value: "outdated", label: "Outdated" },
  { value: "duplicate", label: "Duplicate" },
  { value: "privacy_or_sensitive", label: "Privacy or Sensitive Data" },
  { value: "low_quality", label: "Low Quality" },
  { value: "superseded", label: "Superseded by a Newer Dataset" },
  { value: "no_longer_relevant", label: "No Longer Relevant" },
  { value: "other", label: "Other" },
];

// Mirrors apps/admin_panel/models.py -> DatasetUnarchiveRequest.IntendedUse.
export const UNARCHIVE_INTENDED_USES = [
  { value: "research", label: "Research" },
  { value: "teaching", label: "Teaching" },
  { value: "reproducing_results", label: "Reproducing Results" },
  { value: "personal_reference", label: "Personal Reference" },
  { value: "other", label: "Other" },
];

// Number of reviewer "approve" votes needed before an archive request is
// automatically moved to the archived dataset list.
export const ARCHIVE_VOTE_THRESHOLD = 3;

export function reasonLabel(value) {
  return ARCHIVE_REASONS.find((r) => r.value === value)?.label || value || "—";
}

export function intendedUseLabel(value) {
  return UNARCHIVE_INTENDED_USES.find((r) => r.value === value)?.label || value || "—";
}

const MOCK_ARCHIVE_REQUESTS = [
  {
    id: "arch-req-1001",
    type: "archive",
    dataset_id: "mock-ds-71a1",
    dataset_title: "Ethiopian Nutrition Survey microdata 2023",
    owner_name: "Selamawit Bekele",
    owner_email: "selamawit.b@aastu.edu.et",
    reason: "duplicate",
    comment: "This dataset was accessioned twice during the last batch upload; the newer copy is identical.",
    requested_at: "2026-09-05T08:14:00Z",
    status: "pending",
    votes: [],
    source: "mock",
  },
  {
    id: "arch-req-1002",
    type: "archive",
    dataset_id: "mock-ds-88c3",
    dataset_title: "Cement compressive strength experiments (2019-2021)",
    owner_name: "Dawit Lemma",
    owner_email: "dawit.lemma@aastu.edu.et",
    reason: "superseded",
    comment: "Superseded by the 2024 re-run of the same testing protocol with corrected equipment calibration.",
    requested_at: "2026-09-05T14:02:00Z",
    status: "pending",
    votes: [],
    source: "mock",
  },
  {
    id: "arch-req-1003",
    type: "archive",
    dataset_id: "mock-ds-45f9",
    dataset_title: "Survey of household energy use — draft v1",
    owner_name: "Hanna Tesfaye",
    owner_email: "hanna.t@aastu.edu.et",
    reason: "no_longer_relevant",
    comment: "The authors requested removal of the draft release before public indexing picked it up.",
    requested_at: "2026-09-06T10:45:00Z",
    status: "approved",
    votes: [
      { reviewer: "reviewer-1", vote: "approve" },
      { reviewer: "reviewer-2", vote: "approve" },
      { reviewer: "reviewer-3", vote: "approve" },
    ],
    source: "mock",
  },
  {
    id: "arch-req-1004",
    type: "archive",
    dataset_id: "mock-ds-12b7",
    dataset_title: "Clinical records anonymization benchmark",
    owner_name: "Yonatan Girma",
    owner_email: "yonatan.girma@aastu.edu.et",
    reason: "low_quality",
    comment: "Contains a known column-mapping error in the de-identified patient table (confirmed by the submitter).",
    requested_at: "2026-09-06T16:30:00Z",
    status: "rejected",
    votes: [],
    source: "mock",
  },
  // Pre-seeded archived dataset (approved by 3 reviewers) so the "Archived
  // Datasets" list and the Admin restore flow have data to demo with.
  {
    id: "arch-ds-2001",
    type: "archived",
    dataset_id: "mock-ds-2001",
    dataset_title: "Flood susceptibility mapping model for Awash Basin",
    owner_name: "Mekdes Alemu",
    owner_email: "mekdes.alemu@aastu.edu.et",
    reason: "no_longer_relevant",
    comment: "Superseded by the updated high-resolution flood model released in 2026.",
    archived_at: "2026-09-01T11:20:00Z",
    requested_at: "2026-09-01T11:20:00Z",
    status: "approved",
    votes: [],
    source: "mock",
  },
  // Pending unarchive (restore) request that goes to the admin only.
  {
    id: "unarch-req-3001",
    type: "unarchive",
    dataset_id: "mock-ds-45f9",
    dataset_title: "Survey of household energy use — draft v1",
    owner_name: "Hanna Tesfaye",
    owner_email: "hanna.t@aastu.edu.et",
    intended_use: "research",
    reason: "The survey was withdrawn by mistake — the cleaned final dataset is now ready for re-publication.",
    requested_at: "2026-09-08T09:00:00Z",
    status: "pending",
    source: "mock",
  },
];

// Mutable in-memory copy of the mock seed so Approve/Reject affects the UI
// immediately (and consistently across the reviewer & admin pages) for the
// current browser session.
let mockState = MOCK_ARCHIVE_REQUESTS.map((r) => ({ ...r }));

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota/availability errors
  }
}

/**
 * All requests visible to reviewers/admins: mock seed + locally submitted.
 */
export function getAllArchiveRequests() {
  return [...mockState, ...readLocal()];
}

/**
 * Locally submitted requests belonging to a dataset (used on the user's
 * "My Datasets" cards and their Archived Datasets page).
 */
export function getArchiveRequestsForDataset(datasetId) {
  const id = String(datasetId ?? "");
  if (!id) return [];
  return readLocal()
    .filter((r) => String(r.dataset_id) === id)
    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
}

/**
 * Persist a new archive request submitted by the current user.
 */
export function submitArchiveRequest({ dataset_id, dataset_title, owner_name, owner_email, reason, comment }) {
  const entry = {
    id: `arch-req-${Date.now()}`,
    type: "archive",
    dataset_id: String(dataset_id),
    dataset_title: dataset_title || "Untitled dataset",
    owner_name: owner_name || owner_email || "You",
    owner_email: owner_email || "",
    reason: reason || "",
    comment: (comment || "").trim(),
    requested_at: new Date().toISOString(),
    status: "pending",
    votes: [],
    source: "user",
  };
  const list = readLocal();
  list.push(entry);
  writeLocal(list);
  return entry;
}

/**
 * Mirror a request that was already submitted to the real backend into the
 * local store (so the reviewer/admin fallback views see it too). Does nothing
 * when the same dataset already has a local record.
 */
export function mirrorSubmittedRequest(entry) {
  if (!entry?.dataset_id) return;
  const list = readLocal();
  const existing = list.some((r) => String(r.dataset_id) === String(entry.dataset_id) && r.status === "pending");
  if (existing) return;
  list.push({ ...entry, source: entry.source || "api" });
  writeLocal(list);
}

/**
 * Approve / reject a request. User-submitted requests are persisted; mock
 * requests are resolved in-memory for the session.
 */
export function resolveArchiveRequest(requestId, status) {
  const mockIndex = mockState.findIndex((r) => r.id === requestId);
  if (mockIndex >= 0) {
    mockState[mockIndex] = { ...mockState[mockIndex], status };
    return;
  }
  const list = readLocal().map((r) =>
    r.id === requestId ? { ...r, status } : r
  );
  writeLocal(list);
}

/**
 * Pending requests queue (mock + user-submitted).
 */
export function getPendingArchiveRequests() {
  return getAllArchiveRequests().filter((r) => r.status === "pending");
}

export function hasPendingArchiveRequest(datasetId) {
  return getArchiveRequestsForDataset(datasetId).some((r) => r.status === "pending");
}

/**
 * Cast a reviewer's vote on an archive request (local demo fallback when the
 * backend is unreachable). Idempotent per reviewer — one vote each. Once 3
 * "approve" votes are collected the request is automatically marked approved
 * (archived), and with 3 "reject" votes it is rejected.
 *
 * @returns {{status: string, approveCount: number, rejectCount: number}}
 */
export function voteArchiveRequest(requestId, reviewer, vote) {
  const voteValue = vote === "approve" ? "approve" : "reject";
  const mockIndex = mockState.findIndex((r) => r.id === requestId);
  if (mockIndex >= 0) {
    const current = { ...mockState[mockIndex], votes: [...(mockState[mockIndex].votes || [])] };
    const without = current.votes.filter((v) => String(v.reviewer) !== String(reviewer));
    current.votes = [...without, { reviewer, vote: voteValue }];
    const approveCount = current.votes.filter((v) => v.vote === "approve").length;
    const rejectCount = current.votes.filter((v) => v.vote === "reject").length;
    if (approveCount >= ARCHIVE_VOTE_THRESHOLD) current.status = "approved";
    else if (rejectCount >= ARCHIVE_VOTE_THRESHOLD) current.status = "rejected";
    else current.status = "pending";
    mockState[mockIndex] = current;
    return {
      status: current.status,
      approveCount,
      rejectCount,
      requestId: current.dataset_id,
      request: current,
    };
  }

  const list = readLocal().map((r) => {
    if (r.id !== requestId) return r;
    const votes = [...(r.votes || [])].filter((v) => String(v.reviewer) !== String(reviewer));
    votes.push({ reviewer, vote: voteValue });
    const approveCount = votes.filter((v) => v.vote === "approve").length;
    const rejectCount = votes.filter((v) => v.vote === "reject").length;
    const status =
      approveCount >= ARCHIVE_VOTE_THRESHOLD
        ? "approved"
        : rejectCount >= ARCHIVE_VOTE_THRESHOLD
          ? "rejected"
          : "pending";
    return { ...r, votes, status };
  });
  writeLocal(list);
  const updated = list.find((r) => r.id === requestId) || {};
  return {
    status: updated.status,
    approveCount: (updated.votes || []).filter((v) => v.vote === "approve").length,
    rejectCount: (updated.votes || []).filter((v) => v.vote === "reject").length,
    requestId: updated.dataset_id,
    request: updated,
  };
}

/**
 * Archived datasets for browsing (model seed + approved local requests).
 * Used by the user/researcher "Archived Datasets" page and by the admin.
 */
export function getArchivedDatasetsLocal() {
  return [...mockState, ...readLocal()]
    .filter((r) => r.type === "archived" || (r.type !== "unarchive" && r.status === "approved"))
    .map((r) => ({
      id: r.dataset_id || r.id,
      dataset_id: r.dataset_id || r.id,
      title: r.dataset_title,
      owner: r.owner_name,
      requested_by: r.owner_name,
      reason: r.comment || r.reason,
      requested_at: r.archived_at || r.requested_at,
      status: "archived",
    }));
}

/** Convenience text showing current vote progress for a request. */
export function votesTextFor(request) {
  const votes = Array.isArray(request?.votes) ? request.votes : [];
  const approveCount = votes.filter((v) => v.vote === "approve").length;
  return `Approved by ${approveCount}/${ARCHIVE_VOTE_THRESHOLD} reviewers`;
}

/**
 * Persist a new unarchive (restoration) request. These are routed to admins
 * only — reviewers never see them.
 */
export function submitUnarchiveRequest({ dataset_id, dataset_title, owner_name, owner_email, intended_use, reason }) {
  const entry = {
    id: `unarch-req-${Date.now()}`,
    type: "unarchive",
    dataset_id: String(dataset_id),
    dataset_title: dataset_title || "Untitled dataset",
    owner_name: owner_name || owner_email || "You",
    owner_email: owner_email || "",
    intended_use: intended_use || "other",
    reason: (reason || "").trim(),
    requested_at: new Date().toISOString(),
    status: "pending",
    source: "user",
  };
  const list = readLocal();
  list.push(entry);
  writeLocal(list);
  return entry;
}

/** Pending unarchive (restore) requests — visible to admins only. */
export function getUnarchiveRequests() {
  return [...mockState, ...readLocal()].filter(
    (r) => r.type === "unarchive" && r.status === "pending"
  );
}

/**
 * Admin resolves an unarchive request: "restore" (approved) or "reject".
 * User-submitted requests are persisted; mock ones update in-memory state.
 */
export function resolveUnarchiveRequest(requestId, status) {
  const mockIndex = mockState.findIndex((r) => r.id === requestId);
  if (mockIndex >= 0) {
    mockState[mockIndex] = { ...mockState[mockIndex], status };
    return;
  }
  const list = readLocal().map((r) => (r.id === requestId ? { ...r, status } : r));
  writeLocal(list);
}

/**
 * Normalize a backend archive-request row
 * (GET /admin-panel/archive-requests/queue/) into the internal shape used by
 * the reviewer/admin tables. The queue endpoint returns reason text directly,
 * so the full text is preserved for the detail popup.
 */
export function normalizeBackendRequest(r) {
  return {
    id: r.id,
    type: r.type || "archive",
    dataset_id: r.dataset_id,
    dataset_title: r.dataset_title || r.dataset?.title || "Untitled dataset",
    owner_name: r.requested_by || r.owner_name || r.owner?.email || "—",
    owner_email: r.owner_email || r.owner?.email || "",
    reason: r.reason_category || "other",
    comment: r.reason || r.comment || "",
    requested_at: r.created_at || r.requested_at || new Date().toISOString(),
    status: r.status || "pending",
    votes: Array.isArray(r.votes) ? r.votes : [],
    source: r.source || "api",
  };
}
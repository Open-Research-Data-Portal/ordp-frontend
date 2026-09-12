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

export function reasonLabel(value) {
  return ARCHIVE_REASONS.find((r) => r.value === value)?.label || value || "—";
}

const MOCK_ARCHIVE_REQUESTS = [
  {
    id: "arch-req-1001",
    dataset_id: "mock-ds-71a1",
    dataset_title: "Ethiopian Nutrition Survey microdata 2023",
    owner_name: "Selamawit Bekele",
    owner_email: "selamawit.b@aastu.edu.et",
    reason: "duplicate",
    comment: "This dataset was accessioned twice during the last batch upload; the newer copy is identical.",
    requested_at: "2026-09-05T08:14:00Z",
    status: "pending",
    source: "mock",
  },
  {
    id: "arch-req-1002",
    dataset_id: "mock-ds-88c3",
    dataset_title: "Cement compressive strength experiments (2019-2021)",
    owner_name: "Dawit Lemma",
    owner_email: "dawit.lemma@aastu.edu.et",
    reason: "superseded",
    comment: "Superseded by the 2024 re-run of the same testing protocol with corrected equipment calibration.",
    requested_at: "2026-09-05T14:02:00Z",
    status: "pending",
    source: "mock",
  },
  {
    id: "arch-req-1003",
    dataset_id: "mock-ds-45f9",
    dataset_title: "Survey of household energy use — draft v1",
    owner_name: "Hanna Tesfaye",
    owner_email: "hanna.t@aastu.edu.et",
    reason: "no_longer_relevant",
    comment: "The authors requested removal of the draft release before public indexing picked it up.",
    requested_at: "2026-09-06T10:45:00Z",
    status: "approved",
    source: "mock",
  },
  {
    id: "arch-req-1004",
    dataset_id: "mock-ds-12b7",
    dataset_title: "Clinical records anonymization benchmark",
    owner_name: "Yonatan Girma",
    owner_email: "yonatan.girma@aastu.edu.et",
    reason: "low_quality",
    comment: "Contains a known column-mapping error in the de-identified patient table (confirmed by the submitter).",
    requested_at: "2026-09-06T16:30:00Z",
    status: "rejected",
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
    dataset_id: String(dataset_id),
    dataset_title: dataset_title || "Untitled dataset",
    owner_name: owner_name || owner_email || "You",
    owner_email: owner_email || "",
    reason: reason || "",
    comment: (comment || "").trim(),
    requested_at: new Date().toISOString(),
    status: "pending",
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
 * Normalize a backend archive-request row
 * (GET /admin-panel/archive-requests/queue/) into the internal shape used by
 * the reviewer/admin tables. The queue endpoint returns reason text directly,
 * so the full text is preserved for the detail popup.
 */
export function normalizeBackendRequest(r) {
  return {
    id: r.id,
    dataset_id: r.dataset_id,
    dataset_title: r.dataset_title || r.dataset?.title || "Untitled dataset",
    owner_name: r.requested_by || r.owner_name || r.owner?.email || "—",
    owner_email: r.owner_email || r.owner?.email || "",
    reason: r.reason_category || "other",
    comment: r.reason || r.comment || "",
    requested_at: r.created_at || r.requested_at || new Date().toISOString(),
    status: r.status || "pending",
    source: r.source || "api",
  };
}
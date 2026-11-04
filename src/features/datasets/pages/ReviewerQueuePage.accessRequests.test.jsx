// Covers the reviewer-side "Access Requests" tab, fed by
// GET /sharing/access-requests/queue/. That endpoint returns only the dataset
// UUID and the requester UUID (no dataset name, no requester email), so the
// page must:
//   1. resolve the dataset NAME client-side through the existing
//      dataset-detail endpoint,
//   2. label the requester email as missing when the API omits it, and show it
//      automatically once the API exposes it,
//   3. give the reviewer everything needed to decide — a "View" button that
//      opens the dataset page and a "View Request" dialog with the request's
//      duration, committee vote tally, owner decision and status, plus the same
//      approve/reject actions as the row.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthContext from "../../../context/AuthContextInstance";
import { ToastProvider } from "../../../context/ToastContext.jsx";

const api = vi.hoisted(() => ({
  getReviewerQueue: vi.fn(),
  getContentUpdateQueue: vi.fn(),
  getRevisionRequestsQueue: vi.fn(),
  getAccessRequestsQueue: vi.fn(),
  getMyReviews: vi.fn(),
  getAdminPendingReviews: vi.fn(),
  getMyDatasets: vi.fn(),
  voteAccessRequest: vi.fn(),
  voteContentUpdate: vi.fn(),
  voteRevisionRequest: vi.fn(),
  decideDataset: vi.fn(),
}));

const datasetApi = vi.hoisted(() => ({ getDatasetById: vi.fn() }));

vi.mock("../hooks/datasetsApi.js", () => ({
  getReviewerQueue: api.getReviewerQueue,
  getContentUpdateQueue: api.getContentUpdateQueue,
  getRevisionRequestsQueue: api.getRevisionRequestsQueue,
  getAccessRequestsQueue: api.getAccessRequestsQueue,
  getMyReviews: api.getMyReviews,
  getAdminPendingReviews: api.getAdminPendingReviews,
  getMyDatasets: api.getMyDatasets,
  voteAccessRequest: api.voteAccessRequest,
  voteContentUpdate: api.voteContentUpdate,
  voteRevisionRequest: api.voteRevisionRequest,
  decideDataset: api.decideDataset,
}));

vi.mock("../../../api/datasets", () => ({ getDatasetById: datasetApi.getDatasetById }));
vi.mock("../../../api/datasetsHub", () => ({ fetchAllDatasets: vi.fn().mockResolvedValue([]) }));

// The shell only renders sidebar/header chrome — this test is about the page.
vi.mock("../../../components/dashboard/DashboardShell", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

import ReviewerQueuePage from "./ReviewerQueuePage.jsx";

const REVIEWER = {
  id: 3,
  username: "reviewer1",
  email: "reviewer1@aastu.edu.et",
  roles: ["reviewer"],
};

// Exactly what the queue endpoint returns today: ids only, no names/emails.
const REQUEST = {
  id: "req-1",
  dataset: "ds-1",
  requester: 7,
  shared_by: null,
  purpose_type: "read",
  status: "pending",
  owner_decision: "pending",
  requested_duration_days: 14,
  approve_votes: 1,
  reject_votes: 0,
  created_at: "2026-09-01T10:00:00Z",
  resolved_at: null,
};

function mockQueue(requests = [REQUEST]) {
  api.getReviewerQueue.mockResolvedValue([]);
  api.getContentUpdateQueue.mockResolvedValue([]);
  api.getRevisionRequestsQueue.mockResolvedValue([]);
  api.getAccessRequestsQueue.mockResolvedValue(requests);
  api.getMyReviews.mockResolvedValue([]);
  api.getAdminPendingReviews.mockResolvedValue([]);
  api.getMyDatasets.mockResolvedValue([]);
  api.voteAccessRequest.mockResolvedValue({ status: "pending" });
  datasetApi.getDatasetById.mockResolvedValue({ id: "ds-1", title: "Mobility Data 2024" });
}

function renderQueue() {
  return render(
    <AuthContext.Provider value={{ user: REVIEWER, isAuthenticated: true }}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/reviewer/review-queue?tab=access-requests"]}>
          <Routes>
            <Route path="/reviewer/review-queue" element={<ReviewerQueuePage />} />
            <Route path="/datasets/:id" element={<div>DATASET DETAIL PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReviewerQueuePage access requests", () => {
  it("shows the dataset name by resolving the dataset id it was given", async () => {
    mockQueue();
    renderQueue();

    // The payload carries no title, so the name is looked up by dataset id…
    expect(await screen.findByText("Mobility Data 2024")).toBeTruthy();
    expect(datasetApi.getDatasetById).toHaveBeenCalledWith("ds-1");

    // …and the requester column says the email is missing rather than lying.
    expect(screen.getByText(/not returned by the api/i)).toBeTruthy();

    // The access-request table deliberately carries no Description column.
    expect(screen.queryByRole("columnheader", { name: /description/i })).toBeNull();
  });

  it("shows the requester's name and email when the API provides them", async () => {
    mockQueue([
      {
        ...REQUEST,
        dataset_title: "Restricted Mobility Data",
        requester_name: "Sara Bekele",
        requester_email: "requester@aastu.edu.et",
      },
    ]);
    renderQueue();

    expect(await screen.findByText("requester@aastu.edu.et")).toBeTruthy();
    expect(screen.getByText("Sara Bekele")).toBeTruthy();
    // Nothing to look up — the payload already carried the dataset name.
    expect(datasetApi.getDatasetById).not.toHaveBeenCalled();
  });

  it("opens the request dialog with everything needed to decide", async () => {
    mockQueue();
    renderQueue();

    await userEvent.click(await screen.findByRole("button", { name: /view request/i }));

    const dialog = await screen.findByRole("dialog", { name: /access request details/i });
    const text = dialog.textContent;
    expect(text).toContain("Mobility Data 2024"); // which dataset
    expect(text).toContain("14 days");            // how long
    expect(text).toMatch(/1 approve/);            // committee tally so far
    expect(text).toMatch(/0 reject/);
    // The requester and the access type live in the table row, not in this dialog.
    expect(text).not.toMatch(/requested by/i);
    expect(text).not.toMatch(/read \/ analyze/i);
    // …and the decision buttons are right there in the dialog.
    expect(within(dialog).getByRole("button", { name: /approve/i })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /reject/i })).toBeTruthy();
  });

  it("records the reviewer's vote straight from the dialog", async () => {
    mockQueue();
    renderQueue();

    await userEvent.click(await screen.findByRole("button", { name: /view request/i }));
    const dialog = await screen.findByRole("dialog", { name: /access request details/i });

    await userEvent.click(within(dialog).getByRole("button", { name: /approve/i }));

    // The API validates `vote` as the verb "approve"/"reject" — a status word
    // like "approved" is rejected with "vote must be 'approve' or 'reject'."
    await waitFor(() =>
      expect(api.voteAccessRequest).toHaveBeenCalledWith("req-1", { vote: "approve", comment: "" })
    );
  });

  it("sends the API vote verb when approving from the table row", async () => {
    mockQueue();
    renderQueue();

    const row = (await screen.findByText("Mobility Data 2024")).closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: /^approve$/i }));

    await waitFor(() =>
      expect(api.voteAccessRequest).toHaveBeenCalledWith("req-1", { vote: "approve", comment: "" })
    );
  });

  it("sends the API reject verb when rejecting from the table row", async () => {
    mockQueue();
    renderQueue();

    const row = (await screen.findByText("Mobility Data 2024")).closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: /^reject$/i }));

    await waitFor(() =>
      expect(api.voteAccessRequest).toHaveBeenCalledWith("req-1", { vote: "reject", comment: "" })
    );
  });

  it("opens the dataset page from the row's View button", async () => {
    mockQueue();
    renderQueue();

    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));

    expect(await screen.findByText("DATASET DETAIL PAGE")).toBeTruthy();
  });
});

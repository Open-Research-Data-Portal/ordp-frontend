// @vitest-environment jsdom
// Access Requests tab now soft-redirects into Access Management V2.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthContext from "../../../context/AuthContextInstance";
import { ToastProvider } from "../../../context/ToastContext.jsx";

const api = vi.hoisted(() => ({
  getReviewerQueue: vi.fn().mockResolvedValue([]),
  getContentUpdateQueue: vi.fn().mockResolvedValue([]),
  getRevisionRequestsQueue: vi.fn().mockResolvedValue([]),
  getAccessRequestsQueue: vi.fn().mockResolvedValue([{ id: "req-1", status: "pending" }]),
  getMyReviews: vi.fn().mockResolvedValue([]),
  getAdminPendingReviews: vi.fn().mockResolvedValue([]),
  getMyDatasets: vi.fn().mockResolvedValue([]),
  voteAccessRequest: vi.fn(),
  voteContentUpdate: vi.fn(),
  voteRevisionRequest: vi.fn(),
  decideDataset: vi.fn(),
}));

vi.mock("../hooks/datasetsApi.js", () => api);
vi.mock("../../../api/datasetsHub", () => ({ fetchAllDatasets: vi.fn().mockResolvedValue([]) }));
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

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        user: REVIEWER,
        isAuthenticated: true,
        accessControlMe: { can_review_requests: true },
      }}
    >
      <ToastProvider>
        <MemoryRouter initialEntries={["/reviewer/review-queue?tab=access-requests"]}>
          <Routes>
            <Route path="/reviewer/review-queue" element={<ReviewerQueuePage />} />
            <Route path="/access-management" element={<div>AM Requests</div>} />
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

describe("ReviewerQueuePage access requests tab", () => {
  it("points reviewers to Access Management instead of legacy share voting", async () => {
    renderPage();
    expect(await screen.findByText(/access requests moved/i)).toBeTruthy();
    const link = await screen.findByRole("link", { name: /open access management/i });
    expect(link.getAttribute("href")).toBe("/access-management?tab=Access%20Requests");
    await userEvent.click(link);
    expect(await screen.findByText("AM Requests")).toBeTruthy();
  });
});

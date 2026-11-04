// Covers the restricted-dataset access flow on DatasetViewPage:
//   1. Clicking Download without access → a clear "get access before
//      downloading" error; the request modal NEVER opens from Download.
//   2. The request form opens only from the "Request Access" button.
//   3. Submitting the request → success message in the modal, download NOT
//      attempted while the request is only pending review.
//   4. A sent request is remembered (localStorage, per user + dataset):
//      re-opening the form — same session or after a reload — shows the
//      "Request Already Sent" notice instead of letting a duplicate through.
//   5. Public datasets expose Share (copy link) rather than Request Access.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthContext from "../context/AuthContextInstance";

vi.mock("../api/datasets", () => ({ getDatasetById: vi.fn() }));
vi.mock("../api/sharing", () => ({
  getDownloadUrl: vi.fn(),
  requestShareAccess: vi.fn(),
}));
// Keep TopBar from hitting the network.
vi.mock("../api/notifications", () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
}));

import { getDatasetById } from "../api/datasets";
import { getDownloadUrl, requestShareAccess } from "../api/sharing";
import DatasetViewPage from "./DatasetViewPage.jsx";

// Default every test to an unauthorized visitor: the download attempt 403s.
getDownloadUrl.mockRejectedValue({
  response: { status: 403, data: { detail: "You don't have access to this dataset." } },
});

const RESTRICTED = {
  id: "ds-restricted",
  title: "Restricted Mobility Data",
  visibility: "restricted",
  owner_name: "Test Researcher",
  updated_at: new Date().toISOString(),
  metadata: { description: "A restricted dataset.", keywords: [] },
  files: [],
  view_count: 3,
  download_count: 1,
};

const PUBLIC = {
  ...RESTRICTED,
  id: "ds-public",
  title: "Public Mobility Data",
  visibility: "public",
};

function renderPage(dataset) {
  getDatasetById.mockResolvedValue(dataset);
  return render(
    <AuthContext.Provider
      value={{
        user: { id: "u1", email: "visitor@aastu.edu.et", username: "visitor", role: "researcher" },
        isAuthenticated: true,
      }}
    >
      <MemoryRouter initialEntries={[`/datasets/${dataset.id}`]}>
        <Routes>
          <Route path="/datasets/:id" element={<DatasetViewPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

async function submitRequestForm() {
  await userEvent.type(
    screen.getByPlaceholderText(/research and academic evaluation/i),
    "Research purpose"
  );
  await userEvent.type(
    screen.getByPlaceholderText(/why do you need access/i),
    "I need this for my thesis"
  );
  await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("DatasetViewPage restricted access flow", () => {
  it("shows an access-required error when downloading without access and does NOT open the modal", async () => {
    renderPage(RESTRICTED);

    await userEvent.click(await screen.findByRole("button", { name: /download dataset/i }));

    // The proper error explains that access is required before downloading…
    expect(
      await screen.findByText(/you need to get access before downloading this dataset/i)
    ).toBeTruthy();
    // …and the request modal did NOT appear — Download only attempts the download.
    expect(screen.queryByRole("heading", { name: /request access/i })).toBeNull();
    expect(getDownloadUrl).toHaveBeenCalledWith("ds-restricted");

    // The modal opens only from the dedicated "Request Access" button.
    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    expect(await screen.findByRole("heading", { name: /request access/i })).toBeTruthy();
    expect(screen.getByText(/the dataset owner and reviewers will review it/i)).toBeTruthy();
  });

  it("shows a success message after submitting and does not download while the request is pending", async () => {
    requestShareAccess.mockResolvedValue({ status: "pending", request_id: "req-1" });
    renderPage(RESTRICTED);

    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    await screen.findByRole("heading", { name: /request access/i });
    await submitRequestForm();

    // Success panel inside the modal.
    expect(await screen.findByText(/request sent!/i)).toBeTruthy();
    expect(screen.getByText(/submitted for review/i)).toBeTruthy();

    // The download was never attempted — Download was never clicked.
    expect(getDownloadUrl).not.toHaveBeenCalled();

    // The request payload carried the purpose and justification.
    expect(requestShareAccess).toHaveBeenCalledWith(
      "ds-restricted",
      expect.objectContaining({
        purpose: "Research purpose",
        justification: "I need this for my thesis",
      })
    );

    // Closing the modal keeps the confirmation on the page.
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(screen.queryByRole("heading", { name: /request sent/i })).toBeNull();
    expect(await screen.findByText(/access request sent/i)).toBeTruthy();
    // The pending request is remembered locally (per user + dataset)…
    expect(window.localStorage.getItem("ordp:access-request-pending:u1:ds-restricted")).toBe("pending");

    // …so clicking Request Access again can NOT re-submit: the modal opens
    // straight on the "Request Already Sent" notice, no blank form.
    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    expect(await screen.findByRole("heading", { name: /request already sent/i })).toBeTruthy();
    expect(screen.queryByPlaceholderText(/research and academic evaluation/i)).toBeNull();
    expect(requestShareAccess).toHaveBeenCalledTimes(1);
  });

  it("remembers a sent request across page reloads so it cannot be submitted twice", async () => {
    requestShareAccess.mockResolvedValue({ status: "pending", request_id: "req-1" });
    renderPage(RESTRICTED);
    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    await screen.findByRole("heading", { name: /request access/i });
    await submitRequestForm();
    await screen.findByText(/request sent!/i);
    expect(requestShareAccess).toHaveBeenCalledTimes(1);

    // Simulate a fresh page load (same browser): a new mount restores the
    // pending flag from localStorage.
    cleanup();
    renderPage(RESTRICTED);
    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));

    expect(await screen.findByRole("heading", { name: /request already sent/i })).toBeTruthy();
    expect(screen.getByText(/you have already sent an access request for this dataset/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/research and academic evaluation/i)).toBeNull();
    // Still exactly one submission — no duplicate was sent.
    expect(requestShareAccess).toHaveBeenCalledTimes(1);
  });

  it("shows the already-sent notice when the backend blocks a duplicate request (409)", async () => {
    requestShareAccess.mockRejectedValue({
      response: {
        status: 409,
        data: { detail: "You have already sent an access request for this dataset." },
      },
    });
    renderPage(RESTRICTED);

    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    await screen.findByRole("heading", { name: /request access/i });
    await submitRequestForm();

    // The modal flips to the "Request Already Sent" notice instead of an error.
    expect(await screen.findByRole("heading", { name: /request already sent/i })).toBeTruthy();
    expect(screen.getByText(/you have already sent an access request/i)).toBeTruthy();
    expect(requestShareAccess).toHaveBeenCalledTimes(1);
  });

  it("does not open the modal for a public dataset download without access either", async () => {
    renderPage(PUBLIC);

    await userEvent.click(await screen.findByRole("button", { name: /download dataset/i }));

    expect(await screen.findByText(/you don't have access to this dataset yet/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /request access/i })).toBeNull();
    // Public datasets expose a Share button instead of Request Access.
    expect(screen.queryByRole("button", { name: /request access/i })).toBeNull();
  });
});

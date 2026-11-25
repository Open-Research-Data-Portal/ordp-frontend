// @vitest-environment jsdom
// Restricted-dataset access uses Access Management V2:
// POST /access-control/requests/ with permission codes + justification.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AuthContext from "../context/AuthContextInstance";

vi.mock("../api/datasets", () => ({ getDatasetById: vi.fn() }));
vi.mock("../api/sharing", () => ({
  getDownloadUrl: vi.fn(),
  requestShareAccess: vi.fn(),
  shareDatasetWith: vi.fn(),
}));
vi.mock("../api/accessControl", () => ({
  createRequest: vi.fn(),
  getCatalog: vi.fn().mockResolvedValue([
    { code: "dataset.view", name: "View dataset", resource_type: "dataset", enforced: true },
    { code: "dataset.download", name: "Download dataset", resource_type: "dataset", enforced: true },
  ]),
  getMyResources: vi.fn().mockResolvedValue([]),
  getMyPermissions: vi.fn().mockResolvedValue({
    effective: [],
    can_view_users: false,
    can_review_requests: false,
    can_view_audit: false,
    can_export_audit: false,
    can_manage_users: false,
  }),
}));
vi.mock("../api/notifications", () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchBellNotifications: vi.fn().mockResolvedValue([]),
}));

import { getDatasetById } from "../api/datasets";
import { getDownloadUrl } from "../api/sharing";
import { createRequest } from "../api/accessControl";
import DatasetViewPage from "./DatasetViewPage.jsx";

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
        accessControlMe: null,
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DatasetViewPage restricted access flow (V2)", () => {
  it("opens request access from the Request Access button", async () => {
    renderPage(RESTRICTED);
    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    expect(await screen.findByRole("heading", { name: /request access/i })).toBeTruthy();
  });

  it("submits a V2 access request with selected permissions", async () => {
    createRequest.mockResolvedValue({ status: "pending", id: "req-1" });
    renderPage(RESTRICTED);

    await userEvent.click(await screen.findByRole("button", { name: /request access/i }));
    await screen.findByRole("heading", { name: /request access/i });

    await userEvent.type(
      screen.getByPlaceholderText(/research, teaching, replication/i),
      "Research purpose"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/why do you need access/i),
      "I need this for my thesis work"
    );
    await userEvent.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(/request sent/i)).toBeTruthy();
    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "permission",
        resource_type: "dataset",
        resource_id: "ds-restricted",
        permissions: expect.arrayContaining(["dataset.view", "dataset.download"]),
      })
    );
    expect(getDownloadUrl).not.toHaveBeenCalled();
  });

  it("uses Share for public datasets instead of Request Access", async () => {
    renderPage(PUBLIC);
    expect(await screen.findByRole("button", { name: /^share$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /request access/i })).toBeNull();
  });
});

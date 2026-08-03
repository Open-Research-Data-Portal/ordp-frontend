import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DatasetManagementPage from "./DatasetManagementPage";

const mockUser = {
  email: "owner@aastu.edu.et",
  username: "owner",
  role: "researcher",
};

const datasetList = [
  {
    id: "dataset-1",
    title: "Climate Study",
    status: "draft",
    visibility: "restricted",
    is_active: true,
    metadata: null,
  },
];

const categories = [{ id: "cat-1", name: "Health" }];
const subjects = [{ id: "sub-1", name: "Oncology" }];
const keywords = [{ id: "kw-1", word: "cancer" }];

const api = vi.hoisted(() => ({
  listMyDatasets: vi.fn(),
  listCategories: vi.fn(),
  listSubjects: vi.fn(),
  listKeywords: vi.fn(),
  saveMetadata: vi.fn(),
  softDeleteDataset: vi.fn(),
  hardDeleteDataset: vi.fn(),
}));

vi.mock("../../../context/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../api/datasetsApi", () => api);

function renderPage() {
  return render(
    <MemoryRouter>
      <DatasetManagementPage />
    </MemoryRouter>,
  );
}

describe("DatasetManagementPage", () => {
  beforeEach(() => {
    mockUser.role = "researcher";
    api.listMyDatasets.mockResolvedValue(datasetList);
    api.listCategories.mockResolvedValue(categories);
    api.listSubjects.mockResolvedValue(subjects);
    api.listKeywords.mockResolvedValue(keywords);
    api.saveMetadata.mockResolvedValue({ status: "metadata attached" });
    api.softDeleteDataset.mockResolvedValue({});
    api.hardDeleteDataset.mockResolvedValue({});
  });

  it("shows soft delete and saves category/tag metadata", async () => {
    const user = userEvent.setup();
    renderPage();

    const datasetButton = await screen.findByRole("button", {
      name: /climate study/i,
    });
    await user.click(datasetButton);

    await user.type(
      screen.getByLabelText(/metadata description/i),
      "A climate dataset",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "cat-1",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /subject/i }),
      "sub-1",
    );

    await user.click(screen.getByRole("button", { name: /add interest/i }));
    await user.click(screen.getByRole("button", { name: "cancer" }));

    await user.click(screen.getByRole("button", { name: /save metadata/i }));

    await waitFor(() => expect(api.saveMetadata).toHaveBeenCalled());
    expect(api.saveMetadata).toHaveBeenCalledWith("dataset-1", {
      description: "A climate dataset",
      category: "cat-1",
      subject: "sub-1",
      keywords: ["kw-1"],
    });

    const deleteCard = screen.getByText("Delete dataset").closest("section");
    expect(deleteCard).not.toBeNull();
    expect(
      within(deleteCard).getByRole("button", { name: /delete \(soft\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /hard delete/i }),
    ).not.toBeInTheDocument();
  });

  it("shows hard delete for admin users", async () => {
    mockUser.role = "admin";
    renderPage();

    await screen.findByRole("button", { name: /climate study/i });
    const deleteButton = screen.getAllByRole("button", {
      name: /delete \(soft\)/i,
    })[0];
    const deleteCard = deleteButton.closest("section");
    expect(deleteCard).not.toBeNull();
    expect(
      within(deleteCard).getByRole("button", { name: /hard delete/i }),
    ).toBeInTheDocument();
  });
});

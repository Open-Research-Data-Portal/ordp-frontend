import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DatasetManagementPage from "./DatasetManagementPage";

const mockUser = vi.hoisted(() => ({
  email: "owner@aastu.edu.et",
  username: "owner",
  role: "researcher",
}));

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
    vi.clearAllMocks();
    mockUser.role = "researcher";
    api.listMyDatasets.mockResolvedValue(datasetList);
    api.listCategories.mockResolvedValue(categories);
    api.listSubjects.mockResolvedValue(subjects);
    api.listKeywords.mockResolvedValue(keywords);
    api.saveMetadata.mockResolvedValue({ status: "metadata attached" });
    api.softDeleteDataset.mockResolvedValue({});
    api.hardDeleteDataset.mockResolvedValue({});
  });

  it("saves selected category and keyword tag metadata", async () => {
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

    expect(
      screen.queryByRole("button", { name: /hard delete/i }),
    ).not.toBeInTheDocument();
  });

  it("confirms soft delete before marking a dataset inactive", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: /climate study/i });
    const deleteCard = screen.getByText("Delete dataset").closest("section");
    expect(deleteCard).not.toBeNull();

    await user.click(
      within(deleteCard).getByRole("button", { name: /delete \(soft\)/i }),
    );

    const dialog = screen.getByRole("dialog", {
      name: /mark dataset inactive/i,
    });
    expect(
      within(dialog).getByText(/move "climate study" to inactive/i),
    ).toBeInTheDocument();
    expect(api.softDeleteDataset).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: /mark inactive/i }));

    await waitFor(() =>
      expect(api.softDeleteDataset).toHaveBeenCalledWith("dataset-1"),
    );
    expect(
      await screen.findByText(/was marked inactive/i),
    ).toBeInTheDocument();
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

  it("confirms admin hard delete before permanently deleting", async () => {
    const user = userEvent.setup();
    mockUser.role = "admin";
    renderPage();

    await screen.findByRole("button", { name: /climate study/i });
    const deleteButton = screen.getAllByRole("button", {
      name: /hard delete/i,
    })[0];
    await user.click(deleteButton);

    const dialog = screen.getByRole("dialog", {
      name: /permanently delete dataset/i,
    });
    expect(
      within(dialog).getByText(/cannot be undone/i),
    ).toBeInTheDocument();
    expect(api.hardDeleteDataset).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: /permanently delete/i }),
    );

    await waitFor(() =>
      expect(api.hardDeleteDataset).toHaveBeenCalledWith("dataset-1", true),
    );
  });
});

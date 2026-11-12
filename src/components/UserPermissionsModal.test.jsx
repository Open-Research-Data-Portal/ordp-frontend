// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../context/ConfirmContext";
import UserPermissionsModal from "./UserPermissionsModal";

const catalog = [
  { code: "dataset.view", name: "View dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.edit", name: "Edit dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.delete", name: "Delete dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.download", name: "Download dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.approve", name: "Approve dataset", resource_type: "platform", enforced: true },
];

function renderModal(ui) {
  return render(<ConfirmProvider>{ui}</ConfirmProvider>);
}

afterEach(cleanup);

describe("UserPermissionsModal", () => {
  it("grants only selected endpoint-backed permissions to the chosen dataset", async () => {
    const onGrant = vi.fn().mockResolvedValue(true);
    renderModal(
      <UserPermissionsModal
        user={{ id: 7, name: "Ada", email: "ada@example.com", effective: [], direct: [] }}
        catalog={catalog}
        datasets={[{ id: "dataset-1", title: "Research data" }]}
        busy={false}
        onClose={vi.fn()}
        onGrant={onGrant}
        onRevoke={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Where can they act?"), { target: { value: "dataset" } });
    fireEvent.change(screen.getByLabelText("Resource"), { target: { value: "dataset-1" } });
    expect(screen.getByText("View and download")).toBeTruthy();
    expect(screen.getByText("Edit and delete")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/View dataset/i));
    fireEvent.click(screen.getByLabelText(/Edit dataset/i));
    fireEvent.click(screen.getByRole("button", { name: "Grant 2 permissions" }));
    await waitFor(() =>
      expect(onGrant).toHaveBeenCalledWith([
        { permission: "dataset.view", resource_type: "dataset", resource_id: "dataset-1", expires_at: null, reason: "" },
        { permission: "dataset.edit", resource_type: "dataset", resource_id: "dataset-1", expires_at: null, reason: "" },
      ])
    );
  });

  it("shows direct, inherited, and effective sections", () => {
    renderModal(
      <UserPermissionsModal
        user={{
          id: 7,
          name: "Ada",
          email: "ada@example.com",
          direct: [
            {
              id: "g-direct",
              permission: "dataset.view",
              resource_type: "dataset",
              resource_id: "dataset-1",
            },
          ],
          effective: [
            {
              code: "dataset.view",
              name: "View dataset",
              resource_type: "dataset",
              resource_id: "dataset-1",
              sources: [{ type: "direct", id: "g-direct" }],
            },
            {
              code: "dataset.delete",
              name: "Delete dataset",
              resource_type: "dataset",
              resource_id: "dataset-1",
              sources: [{ type: "group", id: "grant-1", group_name: "Team" }],
            },
          ],
        }}
        catalog={catalog}
        datasets={[{ id: "dataset-1", title: "Research data" }]}
        busy={false}
        onClose={vi.fn()}
        onGrant={vi.fn()}
        onRevoke={vi.fn()}
      />
    );
    expect(screen.getByText("Direct permissions")).toBeTruthy();
    expect(screen.getByText("Inherited permissions")).toBeTruthy();
    expect(screen.getByText("Effective permissions")).toBeTruthy();
    expect(screen.getByText(/Group: Team/)).toBeTruthy();
  });

  it("requires confirmation before granting delete access", async () => {
    const onGrant = vi.fn();
    renderModal(
      <UserPermissionsModal
        user={{ id: 7, name: "Ada", email: "ada@example.com", effective: [], direct: [] }}
        catalog={catalog}
        datasets={[{ id: "dataset-1", title: "Research data" }]}
        busy={false}
        onClose={vi.fn()}
        onGrant={onGrant}
        onRevoke={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Where can they act?"), { target: { value: "dataset" } });
    fireEvent.change(screen.getByLabelText("Resource"), { target: { value: "dataset-1" } });
    fireEvent.click(screen.getByLabelText(/Delete dataset/i));
    fireEvent.click(screen.getByRole("button", { name: "Grant 1 permission" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onGrant).not.toHaveBeenCalled();
  });
});

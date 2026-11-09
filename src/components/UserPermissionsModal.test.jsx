// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UserPermissionsModal from "./UserPermissionsModal";

const catalog = [
  { code: "dataset.view", name: "View dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.edit", name: "Edit dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.delete", name: "Delete dataset", resource_type: "dataset", enforced: true },
  { code: "dataset.approve", name: "Approve dataset", resource_type: "dataset", enforced: false },
];

afterEach(cleanup);

describe("UserPermissionsModal", () => {
  it("grants only selected endpoint-backed permissions to the chosen dataset", async () => {
    const onGrant = vi.fn().mockResolvedValue(true);
    render(<UserPermissionsModal user={{ id: 7, name: "Ada", email: "ada@example.com", effective: [] }}
      catalog={catalog} datasets={[{ id: "dataset-1", title: "Research data" }]}
      busy={false} onClose={vi.fn()} onGrant={onGrant} onRevoke={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Where can they act?"), { target: { value: "dataset" } });
    fireEvent.change(screen.getByLabelText("Dataset"), { target: { value: "dataset-1" } });
    fireEvent.click(screen.getByRole("switch", { name: "View dataset for ada@example.com" }));
    fireEvent.click(screen.getByRole("switch", { name: "Edit dataset for ada@example.com" }));
    expect(screen.queryByRole("switch", { name: "Approve dataset for ada@example.com" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Grant 2 permissions" }));
    await waitFor(() => expect(onGrant).toHaveBeenCalledWith([
      { permission: "dataset.view", resource_type: "dataset", resource_id: "dataset-1", expires_at: null, reason: "" },
      { permission: "dataset.edit", resource_type: "dataset", resource_id: "dataset-1", expires_at: null, reason: "" },
    ]));
  });

  it("shows group access but does not let a direct switch remove it", () => {
    const onRevoke = vi.fn();
    render(<UserPermissionsModal user={{ id: 7, name: "Ada", email: "ada@example.com", effective: [{
      code: "dataset.delete", name: "Delete dataset", resource_type: "dataset", resource_id: "dataset-1",
      sources: [{ type: "group", id: "grant-1", group_name: "Team" }],
    }] }} catalog={catalog} datasets={[{ id: "dataset-1", title: "Research data" }]}
      busy={false} onClose={vi.fn()} onGrant={vi.fn()} onRevoke={onRevoke} />);
    fireEvent.change(screen.getByLabelText("Where can they act?"), { target: { value: "dataset" } });
    fireEvent.change(screen.getByLabelText("Dataset"), { target: { value: "dataset-1" } });
    const toggle = screen.getByRole("switch", { name: "Delete dataset for ada@example.com" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.disabled).toBe(true);
    expect(onRevoke).not.toHaveBeenCalled();
  });
});

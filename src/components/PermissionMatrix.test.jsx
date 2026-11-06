// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PermissionMatrix from "./PermissionMatrix";

describe("PermissionMatrix", () => {
  it("keeps an inherited grant when a direct grant is removed", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<PermissionMatrix
      resource={{ resource: { id: "dataset-1" }, users: [{ id: "direct-1", user_id: 1, permission: "dataset.view" }], groups: [{ id: "group-grant-1", group_id: "group-1", permission: "dataset.view" }] }}
      users={[{ id: 1, name: "User A", groups: [{ group_id: "group-1" }] }]}
      groups={[{ id: "group-1", name: "Group A" }]}
      catalog={[{ code: "dataset.view", name: "View dataset", resource_type: "dataset" }]}
      onSave={onSave}
      onDirtyChange={vi.fn()}
    />);
    const direct = screen.getByRole("checkbox", { name: "User A: direct View dataset" });
    expect(direct.checked).toBe(true);
    expect(direct.closest("td").textContent).toContain("Both");
    fireEvent.click(direct);
    expect(direct.checked).toBe(false);
    expect(direct.closest("td").textContent).toContain("Group");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([
      { type: "user", id: 1, permission: "dataset.view", selected: false, grantId: "direct-1" },
    ]));
  });
});

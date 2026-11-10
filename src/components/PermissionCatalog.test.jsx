// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PermissionCatalog from "./PermissionCatalog";

afterEach(cleanup);

describe("PermissionCatalog", () => {
  it("separates platform and dataset actions into categories", () => {
    render(
      <PermissionCatalog
        catalog={[
          { code: "user.view", name: "View users", resource_type: "platform", enforced: true },
          { code: "group.create", name: "Create groups", resource_type: "platform", enforced: true },
          { code: "dataset.approve", name: "Approve dataset", resource_type: "platform", enforced: false },
          { code: "dataset.view", name: "View dataset", resource_type: "dataset", enforced: true },
          { code: "dataset.delete", name: "Delete dataset", resource_type: "dataset", enforced: false },
        ]}
      />
    );
    expect(screen.getByRole("region", { name: "Platform permissions" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Dataset permissions" })).toBeTruthy();
    expect(screen.getByText("Users and permission management")).toBeTruthy();
    expect(screen.getByText("Groups")).toBeTruthy();
    expect(screen.getByText("View and download")).toBeTruthy();
    expect(screen.getAllByText("Coming later").length).toBeGreaterThan(0);
  });
});

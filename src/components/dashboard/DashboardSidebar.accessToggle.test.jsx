// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "admin", email: "admin@example.com" }, logout: vi.fn() }),
}));
vi.mock("../../api/accessControl", () => ({
  getMyResources: vi.fn().mockResolvedValue([]),
  getMyPermissions: vi.fn().mockResolvedValue({ effective: [] }),
}));

import DashboardSidebar from "./DashboardSidebar";

afterEach(cleanup);

describe("Access sidebar", () => {
  it("hides on the second Access click and shows on the third without leaving the page", () => {
    render(<MemoryRouter initialEntries={["/access-management?tab=Access%20Requests"]}>
      <DashboardSidebar isCollapsed={false} />
    </MemoryRouter>);
    const accessLink = screen.getByRole("link", { name: "Access" });
    expect(screen.getByText("Group requests to review")).toBeTruthy();
    expect(accessLink.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(accessLink);
    expect(screen.queryByText("Group requests to review")).toBeNull();
    expect(accessLink.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(accessLink);
    expect(screen.getByText("Group requests to review")).toBeTruthy();
    expect(accessLink.getAttribute("aria-expanded")).toBe("true");
  });
});

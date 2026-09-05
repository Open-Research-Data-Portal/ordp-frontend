import { describe, it, expect } from "vitest";
import {
  getUserRole,
  isReviewer,
  isAdmin,
  getDashboardPath,
  mergeAuthUser,
} from "./userRoles";

describe("getUserRole", () => {
  it("detects a reviewer from the backend's `roles` array", () => {
    expect(getUserRole({ id: 1, email: "rev@aastu.edu.et", roles: ["reviewer"] })).toBe("reviewer");
  });

  it("detects a reviewer from a nested profile roles array", () => {
    expect(
      getUserRole({ id: 1, profile: { roles: ["public", "reviewer"] } })
    ).toBe("reviewer");
  });

  it("still detects a reviewer from the singular role field", () => {
    expect(getUserRole({ role: "reviewer" })).toBe("reviewer");
    expect(getUserRole({ user_role: "reviewer" })).toBe("reviewer");
    expect(getUserRole({ account_type: "reviewer" })).toBe("reviewer");
  });

  it("picks the most privileged role when several are present", () => {
    expect(getUserRole({ roles: ["public", "reviewer"] })).toBe("reviewer");
    expect(getUserRole({ roles: ["reviewer", "admin"] })).toBe("admin");
  });

  it("falls back to a plain public / user role", () => {
    expect(getUserRole({ roles: ["public"] })).toBe("public");
    expect(getUserRole({})).toBe("user");
    expect(getUserRole(null)).toBe("user");
  });

  it("still treats staff/superuser and admin-labeled accounts as admin", () => {
    expect(getUserRole({ is_staff: true })).toBe("admin");
    expect(getUserRole({ username: "admin" })).toBe("admin");
    expect(getUserRole({ roles: ["admin"] })).toBe("admin");
  });
});

describe("isReviewer / isAdmin", () => {
  it("recognizes reviewers the way the backend reports them", () => {
    expect(isReviewer({ roles: ["reviewer"] })).toBe(true);
    expect(isReviewer({ roles: ["public"] })).toBe(false);
    expect(isAdmin({ roles: ["admin"] })).toBe(true);
    expect(isAdmin({ roles: ["reviewer"] })).toBe(false);
  });
});

describe("getDashboardPath", () => {
  it("routes reviewers to the reviewer dashboard", () => {
    expect(getDashboardPath({ roles: ["reviewer"] })).toBe("/reviewer-dashboard");
    expect(getDashboardPath({ role: "reviewer" })).toBe("/reviewer-dashboard");
    expect(getDashboardPath({ roles: ["public"] })).toBe("/researcher-dashboard");
    expect(getDashboardPath({ roles: ["admin"] })).toBe("/admin-dashboard");
  });
});

describe("mergeAuthUser", () => {
  it("keeps the reviewer role coming from the profile roles array", () => {
    // Login response only carries { id, email }; roles arrive via
    // /accounts/profile/ (+ complete) which return `roles: ["reviewer"]`.
    const merged = mergeAuthUser(
      { id: 7, email: "rev@aastu.edu.et" },
      { id: 7, email: "rev@aastu.edu.et", username: "rev", roles: ["reviewer"] }
    );
    expect(merged.roles).toContain("reviewer");
    expect(merged.role).toBe("reviewer");
    expect(isReviewer(merged)).toBe(true);
    expect(getDashboardPath(merged)).toBe("/reviewer-dashboard");
  });

  it("keeps a normal user on the public role", () => {
    const merged = mergeAuthUser(
      { id: 8, email: "u@aastu.edu.et" },
      { id: 8, email: "u@aastu.edu.et", roles: ["public"] }
    );
    expect(merged.role).toBe("public");
    expect(isReviewer(merged)).toBe(false);
    expect(getDashboardPath(merged)).toBe("/researcher-dashboard");
  });

  it("promotes admin from the roles array without extra flags", () => {
    const merged = mergeAuthUser(
      { id: 1, email: "boss@aastu.edu.et" },
      { id: 1, email: "boss@aastu.edu.et", roles: ["admin"] }
    );
    expect(merged.role).toBe("admin");
    expect(isAdmin(merged)).toBe(true);
    expect(getDashboardPath(merged)).toBe("/admin-dashboard");
  });
});
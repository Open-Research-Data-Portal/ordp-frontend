export function getUserRole(user) {
  if (!user) return "user";

  const role =
    user.role ||
    user.profile?.role ||
    (user.is_staff ? "admin" : null) ||
    "user";

  return String(role).toLowerCase();
}

export function isAdmin(user) {
  const role = getUserRole(user);
  return role === "admin" || Boolean(user?.is_staff);
}

export function isReviewer(user) {
  return getUserRole(user) === "reviewer";
}

export function isResearcher(user) {
  return getUserRole(user) === "researcher";
}

export function getDashboardPath(user) {
  if (isAdmin(user)) return "/admin-dashboard";
  if (isReviewer(user)) return "/reviewer-dashboard";
  if (isResearcher(user)) return "/researcher-dashboard";
  return "/user-dashboard";
}

export function getDisplayName(user) {
  const full =
    user?.full_name ??
    user?.name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "User";
}

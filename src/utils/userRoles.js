export function getUserRole(user) {
  if (!user) return "user";

  if (looksLikeAdminAccount(user)) return "admin";
  if (user.is_superuser || user.is_staff || user.is_admin) return "admin";

  // Check roles array first (from backend ProfileSerializer: roles: ["reviewer"])
  const rolesList = [
    ...(Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : []),
    ...(Array.isArray(user.profile?.roles) ? user.profile.roles : user.profile?.roles ? [user.profile.roles] : []),
    ...(Array.isArray(user.user?.roles) ? user.user.roles : user.user?.roles ? [user.user.roles] : []),
  ].map((r) => String(r?.name || r?.role || r).toLowerCase().trim());

  if (rolesList.some((r) => r.includes("admin") || r.includes("superadmin"))) return "admin";
  if (rolesList.some((r) => r.includes("reviewer") || r.includes("checker"))) return "reviewer";
  if (rolesList.some((r) => r.includes("researcher"))) return "researcher";

  const groups = user.groups || user.profile?.groups || [];
  const groupsList = (Array.isArray(groups) ? groups : [groups])
    .filter(Boolean)
    .map((g) => String(g?.name || g).toLowerCase().trim());

  if (groupsList.some((g) => g.includes("admin"))) return "admin";
  if (groupsList.some((g) => g.includes("reviewer") || g.includes("checker"))) return "reviewer";
  if (groupsList.some((g) => g.includes("researcher"))) return "researcher";

  const role =
    user.role ||
    user.user_role ||
    user.account_type ||
    user.profile?.role ||
    (rolesList.length > 0 ? rolesList[0] : "user");

  const normalized = String(role).toLowerCase().trim();
  if (normalized === "checker") return "reviewer";
  return normalized;
}

function looksLikeAdminAccount(user) {
  const candidates = [
    user.username,
    user.profile?.username,
    user.login_identifier,
    user.email,
    typeof user.email === "string" ? user.email.split("@")[0] : "",
  ];
  return candidates.some((value) => String(value || "").trim().toLowerCase() === "admin");
}

export function claimsFromAccessToken(token) {
  if (!token || typeof token !== "string") return {};
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export function isAdmin(user) {
  if (!user) return false;
  const role = getUserRole(user);
  if (
    role === "admin" ||
    role === "staff" ||
    role === "superadmin" ||
    role === "superuser" ||
    Boolean(user.is_staff) ||
    Boolean(user.is_superuser)
  ) {
    return true;
  }

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : []),
    ...(Array.isArray(user.profile?.roles) ? user.profile.roles : user.profile?.roles ? [user.profile.roles] : []),
  ].map((r) => String(r?.name || r?.role || r).toLowerCase().trim());

  return roles.some((r) => r.includes("admin") || r.includes("superadmin"));
}

export function isReviewer(user) {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === "reviewer" || role === "checker") return true;

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : []),
    ...(Array.isArray(user.profile?.roles) ? user.profile.roles : user.profile?.roles ? [user.profile.roles] : []),
  ].map((r) => String(r?.name || r?.role || r).toLowerCase().trim());

  return roles.some((r) => r.includes("reviewer") || r.includes("checker"));
}

export function isResearcher(user) {
  if (!user) return false;
  return getUserRole(user) === "researcher";
}

export function getDashboardPath(user) {
  if (isAdmin(user)) return "/admin-dashboard";
  if (isReviewer(user)) return "/reviewer-dashboard";
  if (isResearcher(user)) return "/researcher-dashboard";
  if (
    user?.profile_complete ||
    user?.profile?.profile_complete ||
    user?.is_profile_complete ||
    user?.can_upload_datasets ||
    user?.profile?.can_upload_datasets
  ) return "/researcher-dashboard";
  return "/user-dashboard";
}

export function mergeAuthUser(sessionUser, profile) {
  const merged = { ...(sessionUser || {}), ...(profile || {}) };
  merged.is_staff = Boolean(sessionUser?.is_staff || profile?.is_staff);
  merged.is_superuser = Boolean(sessionUser?.is_superuser || profile?.is_superuser);
  merged.is_admin = Boolean(sessionUser?.is_admin || profile?.is_admin);
  merged.groups = profile?.groups || sessionUser?.groups || merged.groups;

  // Extract all roles
  const rawRoles = [
    ...(Array.isArray(profile?.roles) ? profile.roles : profile?.roles ? [profile.roles] : []),
    ...(Array.isArray(sessionUser?.roles) ? sessionUser.roles : sessionUser?.roles ? [sessionUser.roles] : []),
    ...(Array.isArray(merged.roles) ? merged.roles : merged.roles ? [merged.roles] : []),
  ];
  merged.roles = Array.from(new Set(rawRoles.filter(Boolean)));

  merged.login_identifier = sessionUser?.login_identifier || merged.login_identifier;
  if (sessionUser?.username) merged.username = sessionUser.username;
  else if (profile?.username) merged.username = profile.username;
  if (profile?.full_name) merged.full_name = profile.full_name;

  const inferred = getUserRole(merged);
  merged.role = inferred;
  if (inferred === "admin" || looksLikeAdminAccount(merged)) {
    merged.role = "admin";
    merged.is_staff = true;
  }
  return merged;
}

export function getDisplayName(user) {
  const full =
    user?.full_name ??
    user?.name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "User";
}

export function getMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const host = apiBase.replace(/\/api\/?$/, "");
  return host ? `${host}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

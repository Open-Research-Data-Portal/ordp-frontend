export function getUserRole(user) {
  if (!user) return "user";

  if (looksLikeAdminAccount(user)) return "admin";

  if (user.is_superuser || user.is_staff || user.is_admin) return "admin";

  const groups = user.groups || user.profile?.groups || [];
  if (
    (Array.isArray(groups) ? groups : []).some((g) =>
      String(g?.name || g).toLowerCase().includes("admin")
    )
  ) {
    return "admin";
  }

  const role =
    user.role ||
    user.user_role ||
    user.account_type ||
    user.profile?.role ||
    "user";

  return String(role).toLowerCase();
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
  return (
    role === "admin" ||
    role === "staff" ||
    role === "superadmin" ||
    role === "superuser" ||
    Boolean(user.is_staff) ||
    Boolean(user.is_superuser)
  );
}

export function isReviewer(user) {
  return getUserRole(user) === "reviewer";
}

// Mirrors the backend's UserProfile.is_profile_complete() exactly:
// full_name, affiliation, academia, profile_visibility, terms_accepted.
// There is no "department" field on the backend — it must never appear here.
export function isProfileComplete(user) {
  const profile = user?.profile || user;

  return Boolean(
    profile?.full_name?.trim?.() &&
    profile?.affiliation?.trim?.() &&
    profile?.academia &&
    profile?.profile_visibility &&
    profile?.terms_accepted
  );
}

export function isResearcher(user) {
  return Boolean(
    user?.profile?.can_upload_datasets ||
    user?.can_upload_datasets ||
    isProfileComplete(user)
  );
}

// Single dashboard for every non-admin, non-reviewer user — profile
// completion no longer decides which dashboard you land on, only whether
// the "New Dataset" action is available once you're there.
export function getDashboardPath(user) {
  if (isAdmin(user)) return "/admin-dashboard";
  if (isReviewer(user)) return "/reviewer-dashboard";
  return "/researcher-dashboard";
}

export function mergeAuthUser(sessionUser, profile) {
  const merged = { ...(sessionUser || {}), ...(profile || {}) };
  merged.is_staff = Boolean(sessionUser?.is_staff || profile?.is_staff);
  merged.is_superuser = Boolean(sessionUser?.is_superuser || profile?.is_superuser);
  merged.is_admin = Boolean(sessionUser?.is_admin || profile?.is_admin);
  merged.groups = profile?.groups || sessionUser?.groups || merged.groups;
  merged.login_identifier = sessionUser?.login_identifier || merged.login_identifier;
  if (sessionUser?.username) merged.username = sessionUser.username;
  else if (profile?.username) merged.username = profile.username;
  const inferred = getUserRole(merged);
  if (inferred === "admin" || looksLikeAdminAccount(merged)) {
    merged.role = "admin";
    merged.is_staff = true;
  } else if (!merged.role && sessionUser?.role) {
    merged.role = sessionUser.role;
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
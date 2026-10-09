// Role priority used to pick a single "primary" role when a user holds
// several (the backend's UserRole model allows multiple roles per profile,
// e.g. ["public", "reviewer"]). Higher number wins.
const ROLE_PRIORITY = {
  admin: 4,
  superadmin: 4,
  superuser: 4,
  staff: 4,
  reviewer: 3,
  researcher: 2,
  public: 1,
  user: 1,
};

/**
 * Collect every role value the backend may report for a user:
 *  - singular fields (`role`, `user_role`, `account_type`),
 *  - the `roles` array — the authoritative source in the ORDP backend
 *    (`/accounts/profile/` and `/accounts/profile/complete/` both return
 *    the profile's roles as an array, e.g. `["reviewer"]`, `["public"]`),
 *  - profile-nested equivalents.
 * Returns normalized lowercase strings.
 */
export function getEffectiveRoles(user) {
  const roles = [];
  const add = (value) => {
    if (value && typeof value === "string" && value.trim()) {
      roles.push(value.trim().toLowerCase());
    }
  };
  add(user?.role);
  add(user?.user_role);
  add(user?.account_type);
  add(user?.profile?.role);
  if (Array.isArray(user?.roles)) user.roles.forEach(add);
  if (Array.isArray(user?.profile?.roles)) user.profile.roles.forEach(add);
  return roles;
}

function pickBestRole(roles) {
  return roles.reduce(
    (best, r) =>
      (ROLE_PRIORITY[r] || 0) > (ROLE_PRIORITY[best] || 0) ? r : best,
    null
  );
}

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

  return pickBestRole(getEffectiveRoles(user)) || "user";
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
// Single dashboard for every non-admin, non-reviewer user — profile
// completion no longer decides which dashboard you land on, only whether
// the "New Dataset" action is available once you're there.
export function getRoleDashboardPath(role) {
  if (role === "admin") return "/admin-dashboard";
  if (role === "reviewer") return "/reviewer-dashboard";
  return "/researcher-dashboard";
}

export function getDashboardPath(user) {
  const activeRole = getActiveRole(user);
  return getRoleDashboardPath(activeRole);
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

  // The backend reports roles as an array (e.g. `["public"]`, `["reviewer"]`).
  // Normalize it and derive the single `role` field so every consumer
  // (login routing, sidebar, notifications, guards…) sees one consistent value
  // instead of reviewers silently falling back to "user".
  merged.roles = getEffectiveRoles(merged);
  const inferred = getUserRole(merged);
  if (inferred === "admin" || looksLikeAdminAccount(merged)) {
    merged.role = "admin";
    merged.is_staff = true;
  } else if (inferred !== "user") {
    merged.role = inferred;
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
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const host = apiBase.replace(/\/api\/?$/, "");
  return host ? `${host}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

export function getUserProfilePictureKey(user) {
  if (!user) return null;
  const id = user?.id ?? user?.user_id ?? user?.username ?? user?.email;
  return id ? `ordp:profile_picture:${id}` : null;
}

// In-memory cache for profile pictures per user identifier so re-reading
// large base64 strings from localStorage on every render is skipped.
const _cachedProfilePics = new Map();

export function invalidateProfilePictureCache(userId) {
  if (userId) {
    _cachedProfilePics.delete(String(userId));
  } else {
    _cachedProfilePics.clear();
  }
}

// Clean up any legacy un-scoped key on startup so it never pollutes any account
try {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("ordp:profile_picture");
  }
} catch {}

export function getProfilePicture(user) {
  if (!user) return null;
  const raw =
    user?.profile_picture ||
    user?.profile_picture_url ||
    user?.avatar ||
    user?.avatar_url ||
    user?.profile?.profile_picture ||
    user?.profile?.profile_picture_url ||
    user?.profile?.avatar ||
    user?.profile?.avatar_url;

  if (raw) return getMediaUrl(raw);

  // Each user has their own isolated profile picture in localStorage.
  // Never read an un-scoped global key so one user's picture is never shared with others.
  if (typeof localStorage === "undefined") return null;
  const userId = user?.id ?? user?.user_id ?? user?.username ?? user?.email;
  if (!userId) return null;

  const cacheKey = String(userId);
  if (!_cachedProfilePics.has(cacheKey)) {
    const userKey = `ordp:profile_picture:${userId}`;
    let stored = null;
    try {
      stored = localStorage.getItem(userKey) || null;
    } catch {}
    _cachedProfilePics.set(cacheKey, stored);
  }

  const cached = _cachedProfilePics.get(cacheKey);
  return cached ? getMediaUrl(cached) : null;
}

export function getAvailableRoles(user) {
  if (!user) return [];
  const raw = getEffectiveRoles(user);
  const set = new Set();
  if (isAdmin(user) || raw.includes("admin") || raw.includes("staff") || raw.includes("superuser")) {
    set.add("admin");
  }
  if (raw.includes("reviewer") || Boolean(user?.is_reviewer)) {
    set.add("reviewer");
  }
  // All authenticated users have access to researcher/user role
  set.add("user");
  return Array.from(set);
}

export function getActiveRole(user) {
  if (!user) return "user";
  const available = getAvailableRoles(user);
  const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("ordp:active-role") : null;
  if (stored && available.includes(stored)) {
    return stored;
  }
  if (available.includes("admin")) return "admin";
  if (available.includes("reviewer")) return "reviewer";
  return "user";
}

export function setActiveRole(role) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("ordp:active-role", role);
    window.dispatchEvent(new CustomEvent("ordp:active-role-changed", { detail: { role } }));
  }
}
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
  return Boolean(
    user?.profile?.can_upload_datasets ||
    user?.can_upload_datasets
  );
}

export function getDashboardPath(user) {
  if (isAdmin(user)) return "/admin-dashboard";
  if (isReviewer(user)) return "/reviewer-dashboard";
  const isRes = isResearcher(user);
  console.log("🔍 getDashboardPath():", {
    user: user?.email || "no-user",
    isResearcher: isRes,
    can_upload_datasets: user?.can_upload_datasets,
    profile_can_upload: user?.profile?.can_upload_datasets,
    returning: isRes ? "/researcher-dashboard" : "/user-dashboard"
  });
  if (isRes) return "/researcher-dashboard";
  return "/user-dashboard";
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

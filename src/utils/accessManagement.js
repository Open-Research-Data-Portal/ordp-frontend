/** Codes that warrant an extra confirmation before grant/approve. */
export const HIGH_IMPACT_PERMISSIONS = new Set([
  "dataset.delete",
  "user.permission.grant",
  "user.permission.revoke",
  "user.manage",
  "group.delete",
  "group.permission.manage",
  "access_request.approve",
  "access_request.reject",
]);

export function canAccessManagement(me) {
  if (!me) return false;
  return Boolean(
    me.can_view_users ||
      me.can_review_requests ||
      me.can_view_audit ||
      me.can_manage_users ||
      me.can_export_audit
  );
}

export function canManageUsers(me) {
  return Boolean(me?.can_manage_users);
}

export function permissionLabel(code, catalog = []) {
  const found = catalog.find((row) => row.code === code);
  return found?.name || code?.replace(/\./g, " · ") || "Permission";
}

export function groupCatalogByModule(catalog = []) {
  const groups = {};
  for (const row of catalog) {
    const module = row.resource_type || "other";
    if (!groups[module]) groups[module] = [];
    groups[module].push(row);
  }
  return groups;
}

export function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "approved" || key === "active") return "success";
  if (key === "pending") return "warning";
  if (key === "partially_approved" || key === "partially approved") return "info";
  if (key === "rejected" || key === "expired" || key === "cancelled" || key === "inactive") return "danger";
  return "neutral";
}

export function plainStatusLabel(status) {
  const key = String(status || "").toLowerCase();
  const map = {
    pending: "Pending review",
    approved: "Approved",
    partially_approved: "Partially approved",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
  };
  return map[key] || status || "Unknown";
}

export function isHighImpact(code) {
  return HIGH_IMPACT_PERMISSIONS.has(code) || /delete|permission|manage/.test(String(code || ""));
}

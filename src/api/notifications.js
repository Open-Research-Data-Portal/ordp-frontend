import client from "./client";

const STORAGE_KEY_PREFIX = "ordp_notifications_";

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId || "anonymous"}`;
}

export function getLocalNotifications(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load local notifications:", e);
  }
  return null;
}

export function saveLocalNotifications(userId, list) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to save notifications:", e);
  }
}

export function getNotificationActionTitle(item, type, textBlob) {
  let rawTitle = (item?.title || item?.subject || "").trim();
  const isGeneric =
    !rawTitle ||
    rawTitle.toLowerCase() === "notification" ||
    rawTitle.toLowerCase() === "notifications" ||
    rawTitle.toLowerCase() === "notification alert" ||
    rawTitle.toLowerCase() === "notice" ||
    rawTitle.toLowerCase() === "alert" ||
    rawTitle.toLowerCase() === "system notice" ||
    rawTitle.toLowerCase() === "new notification" ||
    rawTitle.toLowerCase() === "update";

  if (!isGeneric && rawTitle.length > 0) {
    return rawTitle;
  }

  const t = String(type || item?.type || item?.notification_type || "").toLowerCase();
  const blob = String(textBlob || `${item?.message || ""} ${item?.body || ""}`).toLowerCase();

  // Category decisions & suggestions
  if (t.includes("category_approv") || (t.includes("category") && t.includes("approv")) || (blob.includes("category") && blob.includes("approv"))) {
    return "Category Suggestion Approved";
  }
  if (t.includes("category_reject") || (t.includes("category") && t.includes("reject")) || (blob.includes("category") && blob.includes("reject"))) {
    return "Category Suggestion Rejected";
  }
  if (t.includes("category_merge") || (t.includes("category") && t.includes("merge")) || (blob.includes("category") && blob.includes("merge"))) {
    return "Category Merged with Existing Topic";
  }
  if (t.includes("category") || blob.includes("category")) {
    return "Category Suggestion Evaluated";
  }

  // Reviews & Evaluation assignments
  if (t.includes("review_assign") || t.includes("assigned") || blob.includes("assigned to review") || blob.includes("assigned reviewer")) {
    return "Dataset Review Assigned";
  }
  if (t.includes("review_submit") || blob.includes("review submitted") || blob.includes("evaluation completed")) {
    return "Peer Review Completed";
  }
  if (t.includes("dataset_approv") || t.includes("published") || blob.includes("published")) {
    return "Dataset Approved & Published";
  }
  if (t.includes("dataset_reject") || blob.includes("dataset rejected")) {
    return "Dataset Revision Required";
  }

  // Access & Download requests
  if (t.includes("access_request") || blob.includes("requested access")) {
    return "Dataset Access Requested";
  }
  if (t.includes("access_grant") || blob.includes("access granted")) {
    return "Dataset Access Granted";
  }
  if (t.includes("download") || blob.includes("download")) {
    return "Dataset Download Ready";
  }

  // Revision & modifications
  if (t.includes("revision") || t.includes("modif") || blob.includes("revision")) {
    return "Dataset Revision Requested";
  }

  // Account & role delegations
  if (t.includes("role") || blob.includes("role")) {
    return "Account Role Updated";
  }
  if (t.includes("welcome") || blob.includes("welcome")) {
    return "Account Activated";
  }

  return "Activity Update";
}

/**
 * Normalize a raw backend notification object into the shape the UI expects.
 * Correctly identifies category decisions (approved, rejected, merged) and attaches action links.
 */
export function normalizeNotification(item) {
  if (!item || typeof item !== "object") return null;

  const id = String(item.id ?? item.notification_id ?? item.pk ?? Math.random());
  const is_read = Boolean(item.is_read ?? item.read ?? item.seen ?? false);
  const created_at = item.created_at || item.timestamp || item.date || new Date().toISOString();

  let rawType = String(item.type || item.notification_type || item.category || "info").toLowerCase();
  const textBlob = `${item.title || ""} ${item.subject || ""} ${item.message || ""} ${item.body || ""} ${item.description || ""}`.toLowerCase();

  // Refine category decision types
  let type = rawType;
  if (textBlob.includes("category") || rawType.includes("category")) {
    if (textBlob.includes("approv") || rawType.includes("approv")) {
      type = "category_approved";
    } else if (textBlob.includes("reject") || rawType.includes("reject")) {
      type = "category_rejected";
    } else if (textBlob.includes("merge") || rawType.includes("merge")) {
      type = "category_merged";
    } else {
      type = "category_decision";
    }
  }

  // Determine user-friendly action title
  const title = getNotificationActionTitle(item, type, textBlob);
  const message = item.message || item.body || item.description || "";

  // Resolve link_path for navigation
  let link_path = item.link_path || item.action_url || item.action_link || item.url || null;
  if (!link_path && type.startsWith("category_")) {
    link_path = "/profile";
  }

  return {
    ...item,
    id,
    title,
    message,
    type,
    is_read,
    created_at,
    link_path,
    category_id: item.category_id || item.category?.id || null,
    decision: item.decision || (type.includes("approv") ? "approve" : type.includes("reject") ? "reject" : null),
  };
}

/**
 * GET /api/notifications/bell/
 * Returns bell notifications and unread count, including category decisions.
 */
export async function fetchBellNotifications(user) {
  const userId = user?.id || user?.user_id || "user";
  try {
    const res = await client.get("/notifications/bell/");
    const data = res.data;

    let rawList = [];
    let unreadCount = 0;

    if (Array.isArray(data)) {
      rawList = data;
      unreadCount = rawList.filter((n) => !n.is_read && !n.read).length;
    } else if (data && typeof data === "object") {
      rawList = Array.isArray(data.notifications)
        ? data.notifications
        : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.items)
        ? data.items
        : [];

      if (typeof data.unread_count === "number") {
        unreadCount = data.unread_count;
      } else if (typeof data.unread === "number") {
        unreadCount = data.unread;
      } else {
        unreadCount = rawList.filter((n) => !n.is_read && !n.read).length;
      }
    }

    const notifications = rawList.map(normalizeNotification).filter(Boolean);
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      notifications,
      unreadCount: typeof unreadCount === "number" ? unreadCount : notifications.filter((n) => !n.is_read).length,
    };
  } catch (err) {
    console.warn("GET /api/notifications/bell/ failed, falling back to local store:", err);
    const local = getLocalNotifications(userId) || [];
    return {
      notifications: local,
      unreadCount: local.filter((n) => !n.is_read).length,
    };
  }
}

/**
 * GET /api/notifications/history/
 * Returns full notification history.
 */
export async function fetchNotificationHistory(user) {
  const userId = user?.id || user?.user_id || "user";

  try {
    const res = await client.get("/notifications/history/");
    const data = res.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.notifications)
      ? data.notifications
      : Array.isArray(data?.items)
      ? data.items
      : [];

    const backendList = rawList.map(normalizeNotification).filter(Boolean);

    // Merge with any offline local notifications
    const localList = getModelNotificationsWithSentinel(userId, backendList.length > 0);
    const combined = [...backendList, ...(localList || [])];

    const seen = new Set();
    const deduped = [];
    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }

    deduped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    saveLocalNotifications(userId, deduped);
    return deduped;
  } catch (err) {
    console.warn("GET /api/notifications/history/ failed, trying /notifications/bell/ or local:", err);
    // Fallback: try bell notifications
    try {
      const { notifications } = await fetchBellNotifications(user);
      if (notifications.length > 0) return notifications;
    } catch {}

    const local = getLocalNotifications(userId) || [];
    return local;
  }
}

/**
 * Primary notifications fetcher: defaults to notification history.
 */
export async function fetchNotifications(user) {
  return await fetchNotificationHistory(user);
}

function getModelNotificationsWithSentinel(userId, hasBackend) {
  const sentinelKey = `ordp_notif_initialized_${userId}`;
  const isInitialized = localStorage.getItem(sentinelKey) === "true";
  let localList = getLocalNotifications(userId);

  if (!isInitialized && !localList && !hasBackend) {
    localList = [
      {
        id: `notif-welcome-${userId}`,
        title: "Welcome to AASTU Research Portal",
        message: "Your academic account is active. Explore datasets, bookmark findings, or submit your own research data.",
        type: "system",
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        link_path: "/datasets",
      },
    ];
    saveLocalNotifications(userId, localList);
    localStorage.setItem(sentinelKey, "true");
  } else if (!isInitialized) {
    localStorage.setItem(sentinelKey, "true");
  }

  return localList || [];
}

/**
 * POST /api/notifications/{notification_id}/read/
 * Mark a notification as read.
 */
export async function markNotificationAsRead(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";

  try {
    await client.post(`/notifications/${notificationId}/read/`);
  } catch (err) {
    // Fallback to alternative verbs/endpoints
    try {
      await client.patch(`/notifications/${notificationId}/`, { is_read: true });
    } catch {
      try {
        await client.post(`/notifications/${notificationId}/mark-read/`);
      } catch {}
    }
  }

  // Update local storage
  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) =>
    String(n.id) === String(notificationId) ? { ...n, is_read: true } : n
  );
  saveLocalNotifications(userId, updated);

  // Dispatch global event for header bells to update immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ordp:notifications-updated"));
  }

  return updated;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(user) {
  const userId = user?.id || user?.user_id || "user";

  const candidates = [
    () => client.post("/notifications/mark-all-read/"),
    () => client.post("/notifications/read-all/"),
    () => client.patch("/notifications/", { is_read: true }),
  ];

  for (const attempt of candidates) {
    try {
      await attempt();
      break;
    } catch {}
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) => ({ ...n, is_read: true }));
  saveLocalNotifications(userId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ordp:notifications-updated"));
  }

  return updated;
}

/**
 * DELETE /api/notifications/{notification_id}/
 * Delete a notification.
 */
export async function deleteNotificationItem(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";

  try {
    await client.delete(`/notifications/${notificationId}/`);
  } catch (err) {
    console.warn("DELETE /api/notifications/${notificationId}/ failed:", err);
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.filter((n) => String(n.id) !== String(notificationId));
  saveLocalNotifications(userId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ordp:notifications-updated"));
  }

  return updated;
}

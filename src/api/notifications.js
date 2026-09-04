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

/**
 * Fetch all notifications for the current user.
 * Tries backend endpoints first, then merges with local store and seeds default notifications if empty.
 */
export async function fetchNotifications(user) {
  const userId = user?.id || user?.user_id || "user";
  let backendList = [];

  try {
    const res = await client.get("/notifications/");
    backendList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
  } catch (err) {
    // Backend endpoint not active or returned 404/403
  }

  let localList = getLocalNotifications(userId);

  if (!localList && backendList.length === 0) {
    // Seed initial relevant notifications for the user
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
      {
        id: `notif-guide-${userId}`,
        title: "Institutional Data Policy",
        message: "Review the open data submission guidelines to ensure your datasets comply with university ethics standards.",
        type: "info",
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        link_path: "/datasets/contribute",
      },
    ];

    if (user?.role === "reviewer" || user?.roles?.includes?.("reviewer")) {
      localList.unshift({
        id: `notif-rev-role-${userId}`,
        title: "Reviewer Moderation Queue Access",
        message: "You have reviewer privileges. Review submitted datasets and verify research reproducibility in your dashboard.",
        type: "review",
        is_read: false,
        created_at: new Date().toISOString(),
        link_path: "/reviewer-dashboard?tab=datasets",
      });
    }

    saveLocalNotifications(userId, localList);
  }

  const combined = [...backendList, ...(localList || [])];
  // Deduplicate by ID
  const seen = new Set();
  const deduped = [];
  for (const item of combined) {
    const id = String(item.id || item._id);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push({
        ...item,
        id,
        is_read: Boolean(item.is_read || item.read),
        created_at: item.created_at || item.timestamp || new Date().toISOString(),
      });
    }
  }

  deduped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return deduped;
}

export async function markNotificationAsRead(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";
  try {
    await client.patch(`/notifications/${notificationId}/`, { is_read: true });
  } catch (err) {
    // Fallback to local
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) =>
    String(n.id) === String(notificationId) ? { ...n, is_read: true } : n
  );
  saveLocalNotifications(userId, updated);
  return updated;
}

export async function markAllNotificationsAsRead(user) {
  const userId = user?.id || user?.user_id || "user";
  try {
    await client.post("/notifications/mark-all-read/");
  } catch (err) {
    // Fallback to local
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) => ({ ...n, is_read: true }));
  saveLocalNotifications(userId, updated);
  return updated;
}

export async function deleteNotificationItem(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";
  try {
    await client.delete(`/notifications/${notificationId}/`);
  } catch (err) {
    // Fallback to local
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.filter((n) => String(n.id) !== String(notificationId));
  saveLocalNotifications(userId, updated);
  return updated;
}

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
    const res = await client.get("/notifications/history/");
    backendList = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.notifications || []);
  } catch (err) {
    try {
      const resBell = await client.get("/notifications/bell/");
      backendList = Array.isArray(resBell.data) ? resBell.data : (resBell.data?.notifications || []);
    } catch (err2) {
      // Backend endpoint not active or returned error
    }
  }

  let localList = getModelNotificationsWithSentinel(userId, backendList.length > 0);

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

export async function markNotificationAsRead(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";
  try {
    await client.post(`/notifications/${notificationId}/read/`);
  } catch (err) {
    try {
      await client.patch(`/notifications/${notificationId}/`, { is_read: true });
    } catch (e) {
      // Fallback to local
    }
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) =>
    String(n.id) === String(notificationId) ? { ...n, is_read: true } : n
  );
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

export async function markAllNotificationsAsRead(user) {
  const userId = user?.id || user?.user_id || "user";
  // The backend notification API manages bell and individual notification reads 
  // but does not expose a bulk mark-all-read endpoint; mark all as read locally and sync.
  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) => ({ ...n, is_read: true }));
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

export async function deleteNotificationItem(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";
  const current = getLocalNotifications(userId) || [];
  const updated = current.filter((n) => String(n.id) !== String(notificationId));
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

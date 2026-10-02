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
 * Normalize a raw backend notification object into the shape the UI expects.
 */
function normalizeNotification(item) {
  return {
    ...item,
    id: String(item.id || item._id || item.notification_id || Math.random()),
    is_read: Boolean(item.is_read || item.read || item.seen),
    created_at: item.created_at || item.timestamp || item.date || new Date().toISOString(),
    title: item.title || item.subject || item.notification_type || "Notification",
    message: item.message || item.body || item.description || "",
    type: item.type || item.notification_type || item.category || "info",
    // Map backend link_path / action_url / action_link to a single link_path
    link_path: item.link_path || item.action_url || item.action_link || item.url || null,
  };
}

/**
 * Fetch all notifications for the current user.
 * Tries backend endpoints in priority order, merges with local store,
 * and seeds a default welcome notification only on first visit.
 */
export async function fetchNotifications(user) {
  const userId = user?.id || user?.user_id || "user";
  let backendList = [];

  // Priority order: history → bell → generic list
  const endpointCandidates = [
    "/notifications/history/",
    "/notifications/bell/",
    "/notifications/",
  ];

  for (const endpoint of endpointCandidates) {
    try {
      const res = await client.get(endpoint);
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.results || res.data?.notifications || res.data?.items || [];
      if (raw.length > 0 || endpoint === endpointCandidates[endpointCandidates.length - 1]) {
        backendList = raw.map(normalizeNotification);
        break;
      }
    } catch {
      // try next endpoint
    }
  }

  // Merge with local notifications (locally-seeded or offline fallback)
  let localList = getModelNotificationsWithSentinel(userId, backendList.length > 0);

  const combined = [...backendList, ...(localList || [])];
  // Deduplicate by ID — backend is authoritative so it comes first
  const seen = new Set();
  const deduped = [];
  for (const item of combined) {
    const id = String(item.id || item._id);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(normalizeNotification(item));
    }
  }

  deduped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Persist the full merged list locally so offline views stay current
  saveLocalNotifications(userId, deduped);

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

  // Try backend mark-read endpoints
  const candidates = [
    () => client.post(`/notifications/${notificationId}/read/`),
    () => client.patch(`/notifications/${notificationId}/`, { is_read: true }),
    () => client.post(`/notifications/${notificationId}/mark-read/`),
  ];
  for (const attempt of candidates) {
    try {
      await attempt();
      break;
    } catch {
      // try next
    }
  }

  // Always update local state
  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) =>
    String(n.id) === String(notificationId) ? { ...n, is_read: true } : n
  );
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

export async function markAllNotificationsAsRead(user) {
  const userId = user?.id || user?.user_id || "user";

  // Try backend bulk mark-all-read
  const candidates = [
    () => client.post("/notifications/mark-all-read/"),
    () => client.post("/notifications/read-all/"),
    () => client.patch("/notifications/", { is_read: true }),
  ];
  for (const attempt of candidates) {
    try {
      await attempt();
      break;
    } catch {
      // try next
    }
  }

  // Always update local state
  const current = getLocalNotifications(userId) || [];
  const updated = current.map((n) => ({ ...n, is_read: true }));
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

export async function deleteNotificationItem(user, notificationId) {
  const userId = user?.id || user?.user_id || "user";

  // Try backend delete
  try {
    await client.delete(`/notifications/${notificationId}/`);
  } catch {
    // Not all backends support delete — keep local fallback
  }

  const current = getLocalNotifications(userId) || [];
  const updated = current.filter((n) => String(n.id) !== String(notificationId));
  saveLocalNotifications(userId, updated);
  return await fetchNotifications(user);
}

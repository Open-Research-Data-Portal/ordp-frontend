import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStore";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const BASE_URL = isLocal
  ? (import.meta.env.VITE_API_BASE_URL || "https://ordp-backend.onrender.com/api")
  : "/api";

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ── Request interceptor ──────────────────────────────────────────────────────
// Attach the current in-memory access token to every outgoing request.
// This means callers never have to manage the Authorization header themselves.
let requestRefresh = null;
client.interceptors.request.use(async (config) => {
  if (!getAccessToken() && getRefreshToken() && !config.url?.includes("/accounts/refresh/")) {
    requestRefresh ||= axios.post(`${BASE_URL}/accounts/refresh/`, { refresh: getRefreshToken() });
    try {
      const { data } = await requestRefresh;
      setTokens(data.access, data.refresh ?? getRefreshToken());
    } finally {
      requestRefresh = null;
    }
  }
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — silent token refresh on 401 ──────────────────────
// When any request returns 401, we try to exchange the stored refresh token
// for a new access token and then replay the original request exactly once.
// Requests that arrive while a refresh is already in-flight are queued and
// replayed after the refresh resolves, so only one refresh call is ever made.

let isRefreshing = false;
let failedQueue = []; // [{ resolve, reject }]

function processQueue(error, newToken = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  failedQueue = [];
}

/** Lets AuthContext wipe the React-side session when silent refresh fails. */
function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ordp:session-expired"));
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    original.headers = original.headers || {};

    // Don't retry if:
    //   • not a 401 response
    //   • already retried once (_retry flag)
    //   • the failing request WAS the refresh endpoint (prevents infinite loops)
    //   • the failing request WAS the login endpoint (a 401 there simply means
    //     bad credentials — we must not try to refresh an existing session)
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/accounts/refresh/") ||
      original.url?.includes("/accounts/login/")
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      // No refresh token at all — nothing we can do, caller must re-login.
      clearTokens();
      notifySessionExpired();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // A refresh is already in progress — queue this request to replay later.
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Use a raw axios instance (NOT `client`) so this refresh call itself
      // does not re-trigger this interceptor.
      const { data } = await axios.post(`${BASE_URL}/accounts/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess = data.access;
      const newRefresh = data.refresh ?? refreshToken; // backend may rotate it

      setTokens(newAccess, newRefresh);
      // Keep the axios default header in sync for any code that checks it directly.
      client.defaults.headers.common.Authorization = `Bearer ${newAccess}`;

      processQueue(null, newAccess);

      original.headers.Authorization = `Bearer ${newAccess}`;
      return client(original);
    } catch (refreshError) {
      // Refresh itself failed (token revoked / expired) — clear everything.
      processQueue(refreshError, null);
      clearTokens();
      delete client.defaults.headers.common.Authorization;
      notifySessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;

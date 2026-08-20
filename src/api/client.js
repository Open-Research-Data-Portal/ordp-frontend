import axios from "axios";
import { getRefreshToken, notifyTokensUpdated, clearTokens } from "./tokenStore";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let queue = []; // requests waiting on a refresh already in flight

function processQueue(error, newAccessToken) {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newAccessToken);
  });
  queue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Only act on 401s, and never retry the refresh call itself in a loop
    if (status !== 401 || originalRequest._retried || originalRequest.url?.includes("/refresh/")) {
      return Promise.reject(error);
    }

    const currentRefresh = getRefreshToken();
    if (!currentRefresh) {
      return Promise.reject(error); // not logged in / no refresh available
    }

    if (isRefreshing) {
      // A refresh is already happening — queue this request behind it
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          originalRequest._retried = true;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retried = true;
    isRefreshing = true;

    try {
      // Raw axios call (not `client`) to avoid re-triggering this interceptor
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/refresh/`,
        { refresh: currentRefresh },
        { withCredentials: true }
      );
      client.defaults.headers.common.Authorization = `Bearer ${data.access}`;
      notifyTokensUpdated(data.access, data.refresh);
      processQueue(null, data.access);
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return client(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearTokens();
      delete client.defaults.headers.common.Authorization;
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
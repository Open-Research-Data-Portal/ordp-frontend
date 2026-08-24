import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../features/accounts/api/authApi";
import client from "../api/client";
import AuthContext from "./AuthContextInstance";
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  REFRESH_KEY,
} from "../api/tokenStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(() =>
    // Start in loading state only when we have a stored refresh token that
    // we'll try to silently exchange on mount.
    Boolean(
      sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY)
    )
  );

  // Keep axios default header in sync whenever the in-memory access token changes.
  useEffect(() => {
    if (accessToken) {
      client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete client.defaults.headers.common.Authorization;
    }
  }, [accessToken]);

  // On mount: silently exchange any stored refresh token for a fresh access
  // token so the user doesn't have to log in again after a page refresh.
  useEffect(() => {
    // loading was initialized to false when there is no stored token, so
    // returning early here is safe — no state update needed.
    const stored = getRefreshToken(); // reads sessionStorage or localStorage
    if (!stored) return;

    authApi
      .refresh(stored)
      .then(({ access, refresh: newRefresh }) => {
        setTokens(access, newRefresh);
        client.defaults.headers.common.Authorization = `Bearer ${access}`;
        setAccessToken(access);
        return authApi.getProfile();
      })
      .then(setUser)
      .catch(() => {
        // Stored refresh token is invalid or revoked — wipe everything.
        clearTokens();
        delete client.defaults.headers.common.Authorization;
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password, stayLoggedIn) => {
    const data = await authApi.login(identifier, password); // throws AuthApiError on failure

    // Write tokens to the in-memory store and sessionStorage so the axios
    // interceptor can use them immediately for any subsequent request.
    setTokens(data.access, data.refresh);

    // "Stay logged in" — also persist to localStorage so the session survives
    // the tab being closed and re-opened.
    if (stayLoggedIn) {
      localStorage.setItem(REFRESH_KEY, data.refresh);
    }

    client.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setAccessToken(data.access);

    let profile;
    try {
      profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      profile = data.user;
      setUser(profile);
    }

    return { ...data, profile };
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await authApi.updateProfile(patch);
    setUser((current) => ({ ...current, ...(updated || patch) }));
    return updated;
  }, []);

  const logout = useCallback(async () => {
    const currentRefresh = getRefreshToken();
    try {
      if (currentRefresh) await authApi.logout(currentRefresh);
    } finally {
      clearTokens();
      delete client.defaults.headers.common.Authorization;
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      loading,
      login,
      logout,
      updateProfile,
    }),
    [user, accessToken, loading, login, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
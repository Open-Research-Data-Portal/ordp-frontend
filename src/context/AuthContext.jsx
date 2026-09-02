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
        // Fetch both profile endpoints and merge them
        return Promise.all([
          authApi.getProfile().catch(() => null),
          authApi.getCompleteProfile().catch(() => null),
        ]);
      })
      .then(([profile, completeProfile]) => {
        console.log("🔍 AuthContext session restore — profile endpoints:");
        console.log("  - getProfile():", profile);
        console.log("  - getCompleteProfile():", completeProfile);
        const mergedProfile = { ...(profile || {}), ...(completeProfile || {}) };
        console.log("  - merged:", mergedProfile);
        console.log("  - can_upload_datasets:", mergedProfile?.can_upload_datasets);
        setUser(mergedProfile);
      })
      .catch(() => {
        // Stored refresh token is invalid or revoked — wipe everything.
        clearTokens();
        delete client.defaults.headers.common.Authorization;
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password, stayLoggedIn) => {
    const data = await authApi.login(identifier, password, stayLoggedIn); // throws AuthApiError on failure

    if (stayLoggedIn) {
      localStorage.setItem(REFRESH_KEY, data.refresh);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }

    setTokens(data.access, data.refresh);
    client.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setAccessToken(data.access);

    let profile;
    try {
      profile = await authApi.getProfile();
    } catch {
      profile = data.user;
    }
    let completeProfile;
    try {
      completeProfile = await authApi.getCompleteProfile();
    } catch {
      // complete profile may not be available for all account states
    }

    console.log("🔍 AuthContext login — profile endpoints:");
    console.log("  - getProfile():", profile);
    console.log("  - getCompleteProfile():", completeProfile);
    const mergedProfile = { ...(profile || {}), ...(completeProfile || {}) };
    console.log("  - merged:", mergedProfile);
    console.log("  - can_upload_datasets:", mergedProfile?.can_upload_datasets);
    setUser(mergedProfile);

    return { ...data, profile: mergedProfile };
  }, []);

  const setSession = useCallback(async (access, refresh, stayLoggedIn = false) => {
    if (stayLoggedIn) {
      localStorage.setItem(REFRESH_KEY, refresh);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
    setTokens(access, refresh);
    client.defaults.headers.common.Authorization = `Bearer ${access}`;
    setAccessToken(access);
    try {
      // Fetch both profile endpoints and merge them
      const [profile, completeProfile] = await Promise.all([
        authApi.getProfile().catch(() => null),
        authApi.getCompleteProfile().catch(() => null),
      ]);
      const mergedProfile = { ...(profile || {}), ...(completeProfile || {}) };
      setUser(mergedProfile);
    } catch {
      // keep user null if profile fetch fails
    }
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await authApi.updateProfile(patch);
    setUser((current) => ({ ...current, ...(updated || patch) }));
    return updated;
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      let profile;
      try {
        profile = await authApi.getProfile();
      } catch {
        profile = null;
      }
      
      let completeProfile;
      try {
        completeProfile = await authApi.getCompleteProfile();
      } catch {
        // complete profile may not be available for all account states
        completeProfile = null;
      }
      
      const mergedProfile = { ...(profile || {}), ...(completeProfile || {}) };
      setUser(mergedProfile);
      return mergedProfile;
    } catch (err) {
      console.error("Failed to refresh profile:", err);
      throw err;
    }
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
      refreshProfile,
      setSession,
    }),
    [user, accessToken, loading, login, logout, updateProfile, refreshProfile, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
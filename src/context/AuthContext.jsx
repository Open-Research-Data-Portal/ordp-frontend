/**
 * AuthContext — Context API auth state, per the storage decision already
 * made in PR #36 (Context API, not Redux, not localStorage).
 *
 * Silent token refresh: client.js's response interceptor handles 401s by
 * calling /refresh/ automatically and retrying the original request. That
 * interceptor and this file share refresh-token state via tokenStore.js
 * (avoids a circular import between client.js and authApi.js).
 *
 * One open question for the team (flagged, not silently decided): the
 * Figma login screen has a "Stay logged in for 30 days" checkbox, but
 * the refresh token itself is only valid 7 days server-side, and pure
 * in-memory Context state won't survive a page refresh at all. Until
 * that's resolved with Rebika/the team, this file persists the refresh
 * token to `sessionStorage` (survives a refresh, clears when the tab
 * closes) ONLY when "stay logged in" is checked — not localStorage, and
 * not indefinite. Swap the two `sessionStorage` calls below for
 * whatever the team decides instead.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../features/accounts/api/authApi";
import client from "../api/client";
import AuthContext from "./AuthContextInstance";
import {
  setRefreshToken as setStoreRefreshToken,
  registerTokenListener,
  clearTokens,
} from "../api/tokenStore";

const REFRESH_STORAGE_KEY = "ordp_refresh_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshTokenState, setRefreshTokenState] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(sessionStorage.getItem(REFRESH_STORAGE_KEY))
  );

  useEffect(() => {
    if (accessToken) {
      client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete client.defaults.headers.common.Authorization;
    }
  }, [accessToken]);

  // Let client.js's interceptor push silently-refreshed tokens back into
  // this component's state, so the UI always reflects the current token.
  useEffect(() => {
    registerTokenListener((access, refresh) => {
      setAccessToken(access);
      setRefreshTokenState(refresh);
      if (refresh) {
        sessionStorage.setItem(REFRESH_STORAGE_KEY, refresh);
      } else {
        sessionStorage.removeItem(REFRESH_STORAGE_KEY);
      }
    });
  }, []);

  // On mount: if a refresh token survived (sessionStorage, "stay logged
  // in" case), silently exchange it for a fresh access token instead of
  // forcing a re-login.
  useEffect(() => {
    const stored = sessionStorage.getItem(REFRESH_STORAGE_KEY);
    if (!stored) {
      return;
    }
    setStoreRefreshToken(stored);
    authApi
      .refresh(stored)
      .then(({ access, refresh: newRefresh }) => {
        client.defaults.headers.common.Authorization = `Bearer ${access}`;
        setAccessToken(access);
        setRefreshTokenState(newRefresh);
        setStoreRefreshToken(newRefresh);
        sessionStorage.setItem(REFRESH_STORAGE_KEY, newRefresh);
        return authApi.getProfile();
      })
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem(REFRESH_STORAGE_KEY);
        setStoreRefreshToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier, password, stayLoggedIn) => {
    const data = await authApi.login(identifier, password); // throws AuthApiError on failure
    client.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setAccessToken(data.access);
    setRefreshTokenState(data.refresh);
    setStoreRefreshToken(data.refresh);
    let profile;
    try {
      profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      profile = data.user;
      setUser(profile);
    }
    if (stayLoggedIn) {
      sessionStorage.setItem(REFRESH_STORAGE_KEY, data.refresh);
    }
    return { ...data, profile };
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await authApi.updateProfile(patch);
    setUser((current) => ({ ...current, ...(updated || patch) }));
    return updated;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (refreshTokenState) await authApi.logout(refreshTokenState);
    } finally {
      // Clear client-side state regardless of whether the API call
      // succeeded — per the API reference, the backend can't reach into
      // the browser to do this for us.
      delete client.defaults.headers.common.Authorization;
      setAccessToken(null);
      setRefreshTokenState(null);
      setUser(null);
      sessionStorage.removeItem(REFRESH_STORAGE_KEY);
      clearTokens();
    }
  }, [refreshTokenState]);

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
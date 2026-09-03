import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../features/accounts/api/authApi";
import client from "../api/client";
import AuthContext from "./AuthContextInstance";
import { mergeAuthUser, claimsFromAccessToken } from "../utils/userRoles";
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  REFRESH_KEY,
} from "../api/tokenStore";

const AUTH_FLAGS_KEY = "ordp:auth-flags";

function persistAuthFlags(user) {
  try {
    sessionStorage.setItem(
      AUTH_FLAGS_KEY,
      JSON.stringify({
        is_staff: Boolean(user?.is_staff),
        is_superuser: Boolean(user?.is_superuser),
        is_admin: Boolean(user?.is_admin),
        role: user?.role || null,
        roles: user?.roles || [],
        username: user?.username || null,
        groups: user?.groups || [],
        profile_complete: Boolean(user?.profile_complete || user?.is_profile_complete || user?.can_upload_datasets),
        is_profile_complete: Boolean(user?.profile_complete || user?.is_profile_complete || user?.can_upload_datasets),
        can_upload_datasets: Boolean(user?.can_upload_datasets || user?.profile_complete || user?.is_profile_complete),
      })
    );
  } catch {
    // ignore
  }
}

function readAuthFlags() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_FLAGS_KEY) || "{}");
  } catch {
    return {};
  }
}

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

  // When the shared axios client realises the session is unrecoverable
  // (refresh token revoked/expired — e.g. a 401 mid-request), it dispatches
  // "ordp:session-expired". We reset the React-side auth state to match.
  useEffect(() => {
    function handleSessionExpired() {
      clearTokens();
      delete client.defaults.headers.common.Authorization;
      setAccessToken(null);
      setUser(null);
    }
    window.addEventListener("ordp:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("ordp:session-expired", handleSessionExpired);
  }, []);

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
        return Promise.allSettled([
          authApi.getProfile(),
          authApi.getCompleteProfile(),
        ]).then(([profileRes, completeRes]) => {
          const profile = profileRes.status === "fulfilled" ? profileRes.value : {};
          const complete = completeRes.status === "fulfilled" ? completeRes.value : {};
          return mergeAuthUser(
            { ...readAuthFlags(), ...claimsFromAccessToken(access) },
            { ...profile, ...complete }
          );
        });
      })
      .then((mergedUser) => {
        persistAuthFlags(mergedUser);
        setUser(mergedUser);
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

    // "Stay logged in" — persist to localStorage before setTokens so token rotation updates it.
    if (stayLoggedIn) {
      localStorage.setItem(REFRESH_KEY, data.refresh);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }

    // Write tokens to the in-memory store and sessionStorage so the axios
    // interceptor can use them immediately for any subsequent request.
    setTokens(data.access, data.refresh);

    client.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    setAccessToken(data.access);

    let profile;
    try {
      const [profileRes, completeRes] = await Promise.allSettled([
        authApi.getProfile(),
        authApi.getCompleteProfile(),
      ]);
      const p = profileRes.status === "fulfilled" ? profileRes.value : {};
      const c = completeRes.status === "fulfilled" ? completeRes.value : {};
      profile = { ...(data.user || {}), ...p, ...c };
    } catch {
      profile = data.user || {};
    }
    const claims = claimsFromAccessToken(data.access);
    const merged = mergeAuthUser(
      {
        ...claims,
        ...data.user,
        login_identifier: identifier,
        username: data.user?.username || identifier,
      },
      profile
    );
    persistAuthFlags(merged);
    setUser(merged);

    return { ...data, profile: merged, user: merged };
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await authApi.updateProfile(patch);
    setUser((current) => ({ ...current, ...(updated || patch) }));
    return updated;
  }, []);

  /**
   * Establish a session from tokens that were NOT obtained via the login
   * endpoint — used after email verification, which the backend resolves by
   * returning fresh access/refresh JWTs directly. Persists the tokens, sets
   * the axios default header, and loads the profile.
   *
   * @param {{access: string, refresh: string, user?: object|null, stayLoggedIn?: boolean}} session
   * @returns {Promise<object|null>} the loaded profile (or the raw user payload fallback)
   */
  const establishSession = useCallback(
    async ({ access, refresh, user: userPayload = null, stayLoggedIn = false }) => {
      if (!access || !refresh) return null;

      setTokens(access, refresh);
      // "Stay logged in" — also persist to localStorage so the session
      // survives the tab being closed and re-opened.
      if (stayLoggedIn) {
        localStorage.setItem(REFRESH_KEY, refresh);
      }

      client.defaults.headers.common.Authorization = `Bearer ${access}`;
      setAccessToken(access);

      let profile;
      try {
        profile = await authApi.getProfile();
      } catch {
        profile = userPayload;
      }
      const merged = mergeAuthUser(
        { ...claimsFromAccessToken(access), ...userPayload },
        profile
      );
      persistAuthFlags(merged);
      setUser(merged);
      return merged;
    },
    []
  );

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
      setUser,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      loading,
      login,
      logout,
      updateProfile,
      establishSession,
    }),
    [user, accessToken, loading, login, logout, updateProfile, establishSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
/**
 * tokenStore — module-level token store shared between the axios interceptor
 * (client.js) and AuthContext without any circular dependency.
 *
 * Why not React state?  The axios interceptor lives outside the React tree and
 * can't call hooks. A plain module-level object is the standard solution.
 *
 * Persistence strategy:
 *  - accessToken  : memory only (short-lived, rotates often).
 *  - refreshToken : memory + sessionStorage (survives React re-renders and
 *    page refreshes; clears when the tab closes, which is a reasonable
 *    security boundary).
 *  - "Stay logged in": the caller also writes to localStorage so the token
 *    survives tab closes. clearTokens() wipes both stores.
 */

export const REFRESH_KEY = "ordp_refresh_token";

const _store = {
  accessToken: null,
  // Seed from sessionStorage first, fall back to localStorage ("stay logged in").
  refreshToken:
    sessionStorage.getItem(REFRESH_KEY) ?? localStorage.getItem(REFRESH_KEY) ?? null,
};

export function getAccessToken() {
  return _store.accessToken;
}

export function getRefreshToken() {
  return _store.refreshToken;
}

/**
 * Update both tokens.
 * Always persists the refresh token to sessionStorage so the interceptor can
 * reach it without React context. If localStorage already has a copy (the
 * "stay logged in" case), it is updated there too so it doesn't go stale.
 */
export function setTokens(access, refresh) {
  if (access != null) {
    _store.accessToken = access;
  }
  if (refresh != null) {
    _store.refreshToken = refresh;
    sessionStorage.setItem(REFRESH_KEY, refresh);
    // Keep localStorage in sync only when the user previously opted in.
    if (localStorage.getItem(REFRESH_KEY)) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  }
}

/** Wipe both tokens and remove from all storage. */
export function clearTokens() {
  _store.accessToken = null;
  _store.refreshToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

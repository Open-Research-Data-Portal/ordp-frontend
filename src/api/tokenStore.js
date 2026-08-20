// Small mutable store so client.js (interceptor) and AuthContext can
// share the refresh token without a circular import between them.
let refreshToken = null;
let onTokensUpdated = null; // callback AuthContext registers to sync its own state

export function getRefreshToken() {
  return refreshToken;
}

export function setRefreshToken(token) {
  refreshToken = token;
}

export function registerTokenListener(callback) {
  onTokensUpdated = callback;
}

export function notifyTokensUpdated(access, refresh) {
  refreshToken = refresh;
  if (onTokensUpdated) onTokensUpdated(access, refresh);
}

export function clearTokens() {
  refreshToken = null;
  if (onTokensUpdated) onTokensUpdated(null, null);
}
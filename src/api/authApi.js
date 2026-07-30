/**
 * Auth API client — wraps the endpoints documented in
 * ORDP_Auth_API_Reference_for_Sosina.md (owner: Rebika, branch:
 * feature/login-session-auth).
 *
 * If PR #36 already exports a configured axios instance (baseURL,
 * interceptors, etc.), import and use *that* instead of raw axios below
 * — check `src/api/client.js` or similar in the scaffold first. This
 * file assumes that instance is available at `src/api/client`; adjust
 * the import path to match whatever PR #36 actually named it.
 */
import client from "./client"; // <-- the shared axios instance from PR #36

const BASE = "/api/accounts";

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{access: string, refresh: string, user: {id: number, email: string}}>}
 * @throws {AuthApiError}
 */
export async function login(email, password) {
  try {
    const { data } = await client.post(`${BASE}/login/`, { email, password });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * @param {string} refreshToken
 */
export async function logout(refreshToken) {
  try {
    const { data } = await client.post(
      `${BASE}/logout/`,
      { refresh: refreshToken }
    );
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Rotates the refresh token — per the API reference, the OLD refresh
 * token is invalidated the moment this succeeds. Callers must replace
 * BOTH stored tokens with the response, not just `access`.
 * @param {string} refreshToken
 */
export async function refresh(refreshToken) {
  try {
    const { data } = await client.post(`${BASE}/refresh/`, {
      refresh: refreshToken,
    });
    return data; // { access, refresh }
  } catch (err) {
    // Note: this endpoint's error shape comes from the underlying JWT
    // library, not our custom { error: {...} } envelope — handled below.
    throw normalizeError(err, { isRefreshEndpoint: true });
  }
}

export async function getProfile() {
  try {
    const { data } = await client.get(`${BASE}/profile/`);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * @param {Partial<{first_name: string, last_name: string}>} patch
 * Note: email/username/id are read-only server-side — sending them is
 * silently ignored, not an error, so don't bother stripping them here.
 */
export async function updateProfile(patch) {
  try {
    const { data } = await client.patch(`${BASE}/profile/`, patch);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Normalizes both error shapes documented in the API reference into one
 * consistent object the UI layer can rely on:
 *   { code, message, field, status }
 */
export class AuthApiError extends Error {
  constructor({ code, message, field = null, status }) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

function normalizeError(err, { isRefreshEndpoint = false } = {}) {
  const status = err?.response?.status;
  const body = err?.response?.data;

  if (isRefreshEndpoint && body?.code) {
    // /refresh/ uses { detail, code } from the JWT library, not our envelope.
    return new AuthApiError({
      code: body.code.toUpperCase(),
      message: body.detail || "Your session has expired. Please log in again.",
      status,
    });
  }

  if (body?.error) {
    return new AuthApiError({
      code: body.error.code,
      message: body.error.message,
      field: body.error.field,
      status,
    });
  }

  // Network error, timeout, or an unexpected shape — fail safe with a
  // generic message rather than leaking a raw stack trace to the UI.
  return new AuthApiError({
    code: "UNKNOWN_ERROR",
    message: "Something went wrong. Please try again.",
    status,
  });
}

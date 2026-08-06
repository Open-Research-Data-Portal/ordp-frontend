/**
 * Auth API client — wraps the endpoints documented in
 * ORDP_Auth_API_Reference_for_Sosina.md (owner: Rebika, branch:
 * feature/login-session-auth).
 */
import client from "../../../api/client"; // shared axios instance

const BASE = "/accounts";

/**
 * @param {string} identifier
 * @param {string} password
 * @returns {Promise<{access: string, refresh: string, user: {id: number, email: string}}>}
 * @throws {AuthApiError}
 */
export async function login(identifier, password) {
  try {
    const { data } = await client.post(`${BASE}/login/`, { identifier, password });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * @param {{full_name: string, email: string, username: string, password: string}} payload
 * @returns {Promise<{detail: string}>}
 * @throws {AuthApiError}
 */
export async function register({ full_name, email, username, password }) {
  try {
    const { data } = await client.post(`${BASE}/register/`, {
      full_name,
      email,
      username,
      password,
    });
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
  }
}

/**
 * @param {string} refreshToken
 */
export async function logout(refreshToken) {
  try {
    const { data } = await client.post(`${BASE}/logout/`, { refresh: refreshToken });
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
    const { data } = await client.post(`${BASE}/refresh/`, { refresh: refreshToken });
    return data; // { access, refresh }
  } catch (err) {
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
 * @param {string} uid
 * @param {string} token
 * @returns {Promise<{detail: string}>}
 * @throws {AuthApiError}
 */
export async function verifyEmail(uid, token) {
  try {
    const { data } = await client.post(`${BASE}/verify-email/`, { uid, token });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * @param {object} payload
 * @returns {Promise<{detail: string}>}
 * @throws {AuthApiError}
 */
export async function submitResearcherRequest(payload) {
  try {
    const { data } = await client.post(`${BASE}/researcher-request/`, payload);
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
  }
}

/**
 * @param {string} email
 * @returns {Promise<{detail: string}>}
 * @throws {AuthApiError}
 */
export async function requestPasswordReset(email) {
  try {
    const { data } = await client.post(`${BASE}/password-reset/`, { email });
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
  }
}

/**
 * @param {string} token
 * @param {string} password
 * @returns {Promise<{detail: string}>}
 * @throws {AuthApiError}
 */
export async function confirmPasswordReset({ uid, token, new_password, confirm_password }) {
  try {
    const { data } = await client.post(`${BASE}/password-reset/confirm/`, {
      uid,
      token,
      new_password,
      confirm_password,
    });
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
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

function normalizeError(
  err,
  { isRefreshEndpoint = false, allowDjangoFieldErrors = false } = {}
) {
  const status = err?.response?.status;
  const body = err?.response?.data;

  if (isRefreshEndpoint && body?.code) {
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

  if (allowDjangoFieldErrors && body && typeof body === "object") {
    const message = pickFirstFieldErrorMessage(body);
    if (message) {
      return new AuthApiError({
        code: "VALIDATION_ERROR",
        message,
        status,
      });
    }
  }

  return new AuthApiError({
    code: "UNKNOWN_ERROR",
    message: "Something went wrong. Please try again.",
    status,
  });
}

function pickFirstFieldErrorMessage(body) {
  const keys = Object.keys(body || {});
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value) && value.length && typeof value[0] === "string") {
      return value[0];
    }
  }
  return null;
}
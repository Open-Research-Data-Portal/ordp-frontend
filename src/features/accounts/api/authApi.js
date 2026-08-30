/**
 * Auth & profile API client — wraps the endpoints documented in the ORDP
 * backend spec. All paths are relative and resolved against the shared
 * axios instance (src/api/client.js), whose baseURL comes from
 * VITE_API_BASE_URL. No endpoint is hardcoded to a local server.
 */
import client from "../../../api/client"; // shared axios instance

const BASE = "/accounts";

/**
 * @param {string} identifier
 * @param {string} password
 * @param {boolean} [stayLoggedIn=false] – when true, backend issues a 30-day refresh token; otherwise 7 days.
 * @returns {Promise<{access: string, refresh: string, user: {id: number, email: string}}>}
 * @throws {AuthApiError}
 */
export async function login(identifier, password, stayLoggedIn = false) {
  try {
    const { data } = await client.post(`${BASE}/login/`, {
      identifier,
      password,
      stay_logged_in: stayLoggedIn,
    });
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
 * Profile-completion / onboarding endpoints.
 *
 * The onboarding flow is: college → department → research interests.
 * Each step's data is submitted (and can be re-fetched) through
 * `/accounts/profile/complete/`.
 */

/** GET /accounts/profile/complete/ — current completion + profile fields. */
export async function getProfileCompletion() {
  try {
    const { data } = await client.get(`${BASE}/profile/complete/`);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * PATCH /accounts/profile/complete/ — submit/update onboarding fields
 * (college, department, research interests, etc.).
 * @param {Partial<{college: number|string, department: number|string, research_interests: string[]}>} patch
 */
export async function updateProfileCompletion(patch) {
  try {
    const { data } = await client.patch(`${BASE}/profile/complete/`, patch);
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
  }
}

/** GET /accounts/profile/options/ — options for profile fields. */
export async function getProfileOptions() {
  try {
    const { data } = await client.get(`${BASE}/profile/options/`);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * POST /accounts/profile/interests/other/ — add a custom interest that is not
 * in the predefined list.
 * @param {string} name
 * @returns {Promise<{id?: number, name: string}>}
 */
export async function addCustomInterest(name) {
  try {
    const { data } = await client.post(`${BASE}/profile/interests/other/`, {
      name,
    });
    return data;
  } catch (err) {
    throw normalizeError(err, { allowDjangoFieldErrors: true });
  }
}

/** GET /accounts/users/{id}/profile/ — view another user's public profile. */
export async function getUserProfile(userId) {
  try {
    const { data } = await client.get(`${BASE}/users/${userId}/profile/`);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * True when a profile-completion payload/response indicates the user has
 * finished onboarding. Defensive against the exact key the backend uses.
 */
export function isProfileCompleted(value) {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.completed ||
      value.complete ||
      value.is_complete ||
      value.is_profile_complete ||
      value.profile_completed ||
      value.profile_completion_completed ||
      value.onboarding_completed ||
      value.research_interests_completed
  );
}

/**
 * Verifies the emailed activation token and auto-logs the user in.
 *
 * Backend contract (confirmed from the ordp-backend source + Postman):
 *   POST /accounts/verify-email/
 *   Body: { token }  ← the UUID from the email link (?token=<uuid>)
 *
 * On success the endpoint returns access/refresh JWT pairs plus the user,
 * i.e. the account is activated AND the user is signed in. Callers should
 * persist those tokens (see AuthContext.establishSession) and then check
 * /accounts/profile/complete/ to route the user to onboarding or the
 * dashboard.
 *
 * @param {string} token The UUID verification token from the emailed link.
 * @returns {Promise<{detail: string, access?: string, refresh?: string, user?: {id:number,email:string}}>}
 * @throws {AuthApiError}
 */
export async function verifyEmail(token) {
  try {
    const { data } = await client.post(`${BASE}/verify-email/`, { token });
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

  // Preserve any message the backend actually sent, even when it isn't wrapped
  // in the documented { error: { code, message } } envelope (e.g. a bare
  // { detail: "..." } body). Collapsing these into one generic string makes
  // genuinely different failures — invalid link vs expired token vs
  // already-used token — indistinguishable to the user and to us.
  const backendMessage =
    (typeof body?.detail === "string" && body.detail.trim()) ||
    (typeof body?.message === "string" && body.message.trim()) ||
    // A plain-text body, but never an HTML error page (e.g. a Django 500),
    // which would dump markup into the UI.
    (typeof body === "string" &&
      !/^\s*</.test(body) &&
      body.trim().length > 0 &&
      body.trim().length <= 300 &&
      body.trim()) ||
    null;

  if (backendMessage) {
    return new AuthApiError({
      code: body?.code ? String(body.code).toUpperCase() : "ERROR",
      message: backendMessage,
      status,
    });
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
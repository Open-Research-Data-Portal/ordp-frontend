/**
 * Interests-only onboarding: shared helpers for deciding whether a user still
 * needs to see the research-interests page, used by both the login flow and the
 * post-email-verification flow so they can never disagree.
 *
 * Why a client-side skip marker exists
 * ------------------------------------
 * Onboarding is now a single, optional step. The backend's own notion of a
 * "complete" profile (see ExtendedProfileSerializer) is driven by
 * academia + department + terms_accepted — none of which this page collects any
 * more — and GET /accounts/profile/complete/ does not return a completion flag
 * at all. So there is no server field we can legitimately set to record
 * "the user chose to skip interests" without inventing an endpoint.
 *
 * Selecting interests IS recorded server-side (research_interests), so that
 * path needs no local state. Skipping is therefore the only case that relies on
 * a per-user localStorage marker; without it the user would be sent back to
 * onboarding on every login, which would defeat the Skip button.
 */

import { useEffect, useState } from "react";
import * as authApi from "./api/authApi";
import { DEFAULT_AFFILIATION } from "./pages/constants";
const SKIP_KEY_PREFIX = "ordp:interests-onboarding-skipped:";
const INTERESTS_STORE_PREFIX = "ordp:research-interests:";

export const INTERESTS_ONBOARDING_PATH = "/research-interests-onboarding";

/** Stable per-user key so one browser can host several accounts. */
function skipKey(user) {
  const id = user?.id ?? user?.user_id ?? user?.email ?? user?.username;
  return `${SKIP_KEY_PREFIX}${id ?? "anonymous"}`;
}

function pushInterestLabel(labels, label) {
  const value = String(label || "")
    .replace(/\s+-\s+/g, " — ")
    .trim();
  if (value && !labels.includes(value)) labels.push(value);
}

function resolveAgainstCatalog(raw, catalog) {
  const needle = String(raw).trim().toLowerCase();
  if (!needle) return null;
  for (const group of catalog) {
    const category = group?.category ?? group?.name;
    const subs = group?.subcategories ?? group?.subfields ?? [];
    for (const sub of subs) {
      const name = typeof sub === "string" ? sub : sub?.name ?? sub?.label;
      const id = typeof sub === "object" ? sub?.id : null;
      if (
        name &&
        (String(name).toLowerCase() === needle ||
          (id != null && String(id) === String(raw)))
      ) {
        return `${category} — ${name}`;
      }
    }
    if (category && String(category).toLowerCase() === needle) return category;
  }
  return null;
}

/**
 * Turns whatever shape the backend stored (string chips, grouped objects,
 * IDs, `{ category: [subs] }` maps) into the picker's `"Category — Sub"` list.
 */
export function extractSelectedInterests(source, categoryCatalog = []) {
  if (!source) return [];
  const buckets = [
    source.research_interests,
    source.researchInterests,
    source.selected_research_interests,
    source.selected_interests,
    source.interests,
    source.interest_ids,
    source.interest_names,
    source.other_interests,
    source.custom_interests,
  ];
  const labels = [];
  const catalog = Array.isArray(categoryCatalog) ? categoryCatalog : [];

  const addItem = (item) => {
    if (item == null || item === "") return;
    if (typeof item === "string" || typeof item === "number") {
      const resolved = resolveAgainstCatalog(item, catalog);
      if (resolved) {
        pushInterestLabel(labels, resolved);
        return;
      }
      // Raw UUIDs are PK values, not user-facing chips.
      if (asEntityId(item)) return;
      pushInterestLabel(labels, item);
      return;
    }
    if (typeof item !== "object") return;

    // Catalog groups ({ category, subcategories: [...] }) are options, not
    // a user's selection — flattening them would dump every subfield as a chip.
    const grouped =
      item.subcategories ?? item.subfields ?? item.children ?? item.interests;
    const isCatalogGroup =
      Array.isArray(grouped) && grouped.length > 0 && !item.subcategory && !item.subfield;
    if (isCatalogGroup && !(item.selected || item.is_selected)) {
      return;
    }

    const category =
      item.category ?? item.category_name ?? item.parent ?? item.group;
    if (Array.isArray(grouped) && grouped.length > 0 && !isCatalogGroup) {
      grouped.forEach((sub) => {
        const name = typeof sub === "string" ? sub : sub?.name ?? sub?.label;
        if (name) pushInterestLabel(labels, category ? `${category} — ${name}` : name);
      });
      return;
    }

    const name = item.name ?? item.label ?? item.subcategory ?? item.subfield;
    if (name && category) {
      pushInterestLabel(labels, `${category} — ${name}`);
      return;
    }
    if (name) addItem(name);
  };

  const ingest = (raw) => {
    if (raw == null || raw === "") return;
    if (Array.isArray(raw)) raw.forEach(addItem);
    else if (typeof raw === "object") {
      Object.entries(raw).forEach(([category, subs]) => {
        if (Array.isArray(subs)) {
          subs.forEach((sub) =>
            addItem({ category, name: typeof sub === "string" ? sub : sub?.name })
          );
        } else {
          addItem({ category, name: subs });
        }
      });
    } else {
      addItem(raw);
    }
  };

  buckets.forEach(ingest);
  return labels;
}

function interestsStoreKey(user) {
  const id = user?.id ?? user?.user_id ?? user?.email ?? user?.username;
  return `${INTERESTS_STORE_PREFIX}${id ?? "anonymous"}`;
}

export function persistSelectedInterests(user, labels) {
  try {
    localStorage.setItem(interestsStoreKey(user), JSON.stringify(labels || []));
  } catch {
    // ignore storage failures
  }
}

export function loadPersistedInterests(user) {
  try {
    const raw = localStorage.getItem(interestsStoreKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for UUID or numeric PK values the backend can store as FKs. */
export function asEntityId(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") {
    return asEntityId(
      value.id ??
        value.pk ??
        value.uuid ??
        value.value ??
        value.college ??
        value.department
    );
  }
  const text = String(value).trim();
  if (UUID_RE.test(text) || /^\d+$/.test(text)) return text;
  return undefined;
}

function interestName(sub) {
  if (sub == null) return "";
  if (typeof sub === "string") return sub;
  return String(sub.name ?? sub.label ?? "").trim();
}

/**
 * Shapes GET /accounts/profile/options/ (and the bundled catalog) into
 * `{ category, subcategories: [{ id?, name }] }`.
 */
export function parseInterestCatalog(payload) {
  if (Array.isArray(payload) && payload[0]?.category && payload[0]?.subcategories) {
    return payload
      .map((item) => ({
        category: String(item.category),
        subcategories: (item.subcategories || [])
          .map((sub) =>
            typeof sub === "string"
              ? { name: sub }
              : { id: asEntityId(sub), name: interestName(sub) }
          )
          .filter((sub) => sub.name),
      }))
      .filter((item) => item.subcategories.length > 0);
  }

  const raw =
    payload?.research_interests ??
    payload?.research_interest_categories ??
    payload?.interest_categories ??
    payload?.interests;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const looksFlat = raw.some(
      (item) =>
        item &&
        typeof item === "object" &&
        !item.subcategories &&
        !item.subfields &&
        (item.id || item.pk) &&
        (item.name || item.label)
    );
    if (looksFlat) {
      const grouped = {};
      raw.forEach((item) => {
        const category = String(
          item.category ?? item.category_name ?? item.group ?? "Other"
        );
        if (!grouped[category]) grouped[category] = [];
        const name = interestName(item);
        if (name) grouped[category].push({ id: asEntityId(item), name });
      });
      return Object.entries(grouped)
        .map(([category, subcategories]) => ({ category, subcategories }))
        .filter((item) => item.subcategories.length > 0);
    }

    return raw
      .map((item) => {
        if (!item || typeof item === "string") return null;
        const category = item.category ?? item.name ?? item.label;
        if (!category) return null;
        const subcategories = item.subcategories ?? item.subfields ?? item.children ?? [];
        return {
          category: String(category),
          subcategories: (Array.isArray(subcategories) ? subcategories : [])
            .map((sub) =>
              typeof sub === "string"
                ? { name: sub }
                : { id: asEntityId(sub), name: interestName(sub) }
            )
            .filter((sub) => sub.name),
        };
      })
      .filter((item) => item && item.subcategories.length > 0);
  }

  if (typeof raw === "object") {
    return Object.entries(raw)
      .filter(([, subs]) => Array.isArray(subs))
      .map(([category, subs]) => ({
        category,
        subcategories: subs
          .map((sub) =>
            typeof sub === "string"
              ? { name: sub }
              : { id: asEntityId(sub), name: interestName(sub) }
          )
          .filter((sub) => sub.name),
      }))
      .filter((item) => item.subcategories.length > 0);
  }
  return [];
}

/** String-only catalog for the ResearchInterests picker UI. */
export function pickerCategories(catalog) {
  return (catalog || [])
    .map((group) => ({
      category: group.category,
      subcategories: (group.subcategories || []).map(interestName).filter(Boolean),
    }))
    .filter((group) => group.subcategories.length > 0);
}

function interestLabelToId(label, catalog) {
  const direct = asEntityId(label);
  if (direct) return direct;
  const needle = String(label || "")
    .replace(/\s+-\s+/g, " — ")
    .trim()
    .toLowerCase();
  if (!needle) return undefined;
  for (const group of catalog || []) {
    // Flat {id, name} items (no subcategories) — match directly by name.
    if (!group.subcategories) {
      if (String(group.name || "").toLowerCase() === needle) {
        return asEntityId(group);
      }
      continue;
    }
    const category = group.category || group.name;
    for (const sub of group.subcategories || []) {
      const name = interestName(sub);
      const composed = `${category} — ${name}`.toLowerCase();
      if (composed === needle || name.toLowerCase() === needle) {
        return asEntityId(sub);
      }
    }
  }
  return undefined;
}

/**
 * Backend `research_interests` is a UUID/PK list. Labels like
 * "Law — Cyber Law" must never be sent — they 400 the whole PATCH.
 */
export function toInterestSavePayload(labels, catalog = []) {
  const ids = (Array.isArray(labels) ? labels : [])
    .map((label) => interestLabelToId(label, catalog))
    .filter(Boolean);
  return ids.length ? { research_interests: ids } : {};
}

function firstList(...candidates) {
  for (const item of candidates) {
    if (Array.isArray(item) && item.length) return item;
  }
  return [];
}

function findIdNameLists(node, found = []) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    const first = node[0];
    if (
      first &&
      typeof first === "object" &&
      asEntityId(first) &&
      (first.name || first.label || first.title)
    ) {
      found.push(node);
    }
    return found;
  }
  Object.values(node).forEach((value) => findIdNameLists(value, found));
  return found;
}

function asChoiceSlug(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") {
    return asChoiceSlug(value.value ?? value.slug ?? value.code);
  }
  const text = String(value).trim();
  if (/^[a-z][a-z0-9_]{0,40}$/i.test(text)) return text.toLowerCase();
  return undefined;
}

export function pickCollegeAndDepartment(completion = {}, options = {}) {
  const nestedLists = findIdNameLists(options);
  const colleges = firstList(
    options.colleges,
    options.college_options,
    options.college,
    options.centres,
    options.centers,
    nestedLists[0]
  );
  const departments = firstList(
    options.departments,
    options.department_options,
    options.department,
    nestedLists[1],
    nestedLists[0]
  );
  const college =
    asEntityId(completion.college) ||
    asEntityId(completion.college_id) ||
    asEntityId(colleges[0]);
  const matching = departments.find(
    (dept) => !asEntityId(dept?.college) || asEntityId(dept.college) === college
  );
  const department =
    asEntityId(completion.department) ||
    asEntityId(completion.department_id) ||
    asEntityId(matching) ||
    asEntityId(departments[0]);
  return { college, department };
}

function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== "")
  );
}

export function buildProfileCompletionPatch({
  labels = [],
  catalog = [],
  completion = {},
  options = {},
  extra = {},
} = {}) {
  const { college, department: pickedDept } = pickCollegeAndDepartment(completion, options);
  const occupation =
    asChoiceSlug(extra.occupation || completion.occupation) || "researcher";
  const rawAcademia = extra.academia || extra.occupation || completion.academia || completion.occupation || "researcher";
  const academia = asChoiceSlug(rawAcademia) || "researcher";
  const department =
    asEntityId(
      extra.department ||
        extra.department_id ||
        completion.department ||
        completion.department_id
    ) || pickedDept;

  return compact({
    occupation,
    academia,
    affiliation: extra.affiliation || completion.affiliation || DEFAULT_AFFILIATION,
    profile_visibility:
      extra.profile_visibility ||
      completion.profile_visibility ||
      completion.profileVisibility ||
      "public",
    college,
    department,
    ...toInterestSavePayload(labels, catalog),
    ...extra,
    terms_accepted: extra.terms_accepted !== false,
  });
}

function isUuidLikeFailure(err) {
  const blob = `${err?.message || ""} ${JSON.stringify(err?.response?.data || {})}`.toLowerCase();
  return /uuid|invalid pk|does not exist/.test(blob);
}

/** PATCH /profile/complete/, preserving required backend completion fields. */
export async function saveProfileCompletion(patch) {
  const attempts = [
    patch,
    compact({ ...patch, research_interests: undefined }),
    compact({
      terms_accepted: true,
      full_name: patch.full_name,
      affiliation: patch.affiliation || DEFAULT_AFFILIATION,
      department: patch.department,
      academia: patch.academia || "researcher",
      profile_visibility: patch.profile_visibility || "public",
    }),
    compact({
      terms_accepted: true,
      affiliation: patch.affiliation || DEFAULT_AFFILIATION,
      department: patch.department,
      academia: patch.academia || "researcher",
      profile_visibility: "public",
    }),
    { terms_accepted: true },
  ];
  let lastErr;
  for (const attempt of attempts) {
    try {
      return await authApi.updateProfileCompletion(attempt);
    } catch (err) {
      lastErr = err;
      const status = err.status ?? err.response?.status;
      if (status && status !== 400 && status !== 422 && !isUuidLikeFailure(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

/** Reads the research-interest list out of any profile/completion payload. */
function extractInterests(source) {
  return extractSelectedInterests(source);
}

function wasInterestsOnboardingSkipped(user) {
  try {
    return localStorage.getItem(skipKey(user)) === "1";
  } catch {
    return false;
  }
}

export function markInterestsOnboardingSkipped(user) {
  try {
    localStorage.setItem(skipKey(user), "1");
  } catch {
    // Private-mode / storage-disabled browsers: the user simply sees the
    // optional page again, which is harmless.
  }
}

/**
 * True when the user has nothing left to do on the interests page: they already
 * picked interests, previously skipped it, or the backend reports the wider
 * profile as complete.
 */
export function isInterestsOnboardingSatisfied({
  completion,
  profile,
  user,
  backendCompleted = false,
} = {}) {
  if (backendCompleted) return true;
  if (extractInterests(completion).length > 0) return true;
  if (extractInterests(profile).length > 0) return true;
  return wasInterestsOnboardingSkipped(user ?? profile);
}

/**
 * Whether a profile counts as "complete" for the completion banner / gate.
 *
 * The backend's own is_complete requires department + college, which the
 * slimmed-down onboarding no longer collects, so it is permanently false and
 * would nag forever. We instead treat a profile as complete once the UI has
 * persisted anything meaningful — research interests, accepted terms, an academic
 * role, a bio, or a non-default affiliation. Saving the profile always writes at
 * least the academic role, so the prompt reliably clears after the first save.
 * If the backend does return a true is_complete flag, that always wins.
 */
export function isProfileComplete(completion, profile) {
  if (completion?.is_complete || completion?.completed || completion?.complete) {
    return true;
  }
  if (profile?.is_complete || profile?.completed || profile?.complete) return true;

  const source = { ...(profile || {}), ...(completion || {}) };

  const hasInterests =
    extractInterests(source).length > 0;
  if (hasInterests) return true;

  if (source.terms_accepted ?? source.termsAccepted) return true;
  if (source.bio && String(source.bio).trim()) return true;
  if (source.academia || source.occupation || source.academicRole) return true;
  if (
    source.affiliation &&
    source.affiliation !== DEFAULT_AFFILIATION
  ) {
    return true;
  }

  return false;
}

/**
 * Loads the profile-completion payload once and reports whether the profile is
 * considered complete for the UI. Used by the contribution page to gate uploads
 * behind a "complete your profile" prompt, and by dashboards for their banner.
 */
export function useProfileComplete() {
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getProfileCompletion()
      .then((completion) => {
        if (cancelled) return;
        setComplete(isProfileComplete(completion, completion));
      })
      .catch(() => {
        if (cancelled) return;
        // If we can't tell, assume incomplete so the prompt (rarely shown) stays
        // conservative rather than hiding a genuine requirement.
        setComplete(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, complete };
}
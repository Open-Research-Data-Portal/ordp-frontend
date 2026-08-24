import api from "./client";

/**
 * Metadata API — taxonomies used across the app (category dropdowns,
 * subject pickers, language selectors, dataset characteristic checkboxes).
 *
 * The shared "api" client's baseURL already includes "/api", so paths
 * here start directly at "/metadata/..." — matching the pattern used
 * in search.js ("/search/datasets/", not "/api/search/datasets/").
 */

export async function getCategories() {
  const res = await api.get("/metadata/categories/");
  return res.data;
}

export async function getSubjects() {
  const res = await api.get("/metadata/subjects/");
  return res.data;
}

export async function getLanguages() {
  const res = await api.get("/metadata/languages/");
  return res.data;
}

export async function getCharacteristics() {
  const res = await api.get("/metadata/characteristics/");
  return res.data;
}

export async function attachMetadata(datasetId, payload) {
  const res = await api.post(`/metadata/${datasetId}/attach/`, payload);
  return res.data;
}

export async function setDatasetLanguages(datasetId, languageIds) {
  const res = await api.post(`/metadata/${datasetId}/languages/`, {
    languages: languageIds,
  });
  return res.data;
}

export async function setDatasetCharacteristics(datasetId, characteristicIds) {
  const res = await api.post(`/metadata/${datasetId}/characteristics/`, {
    characteristics: characteristicIds,
  });
  return res.data;
}
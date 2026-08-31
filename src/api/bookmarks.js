import client from "./client";

/**
 * Fetches all datasets bookmarked by the authenticated user.
 * Backend: GET /api/datasets/bookmarks/
 */
export async function getBookmarks() {
  try {
    const { data } = await client.get("/datasets/bookmarks/");
    return data;
  } catch (err) {
    console.warn("getBookmarks failed (returning empty):", err?.message);
    return [];
  }
}

/**
 * Toggles the bookmark status for a specific dataset — creates the
 * bookmark if it doesn't exist, deletes it if it does.
 * Backend: POST /api/datasets/<uuid:dataset_id>/bookmark/
 *
 * NOTE: callers do not rely on this response's shape to know the new
 * state. Since the endpoint is inherently toggle-based, the UI flips its
 * local "is this bookmarked" state optimistically on click and only
 * reverts if this request throws — so no assumption about the response
 * body is needed.
 */
export async function toggleBookmark(datasetId) {
  const { data } = await client.post(`/datasets/${datasetId}/bookmark/`);
  return data;
}


/**
 * Normalizes whatever shape getBookmarks() returns into a plain array of
 * raw dataset records. Kept in one place so both the hook and the
 * dedicated Bookmarks page agree on how to unwrap it.
 */
export function extractBookmarkList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
export function getDatasetImage(dataset) {
  if (!dataset) return null;
  const raw =
    dataset.image ??
    dataset.thumbnail_url ??
    dataset.thumbnailUrl ??
    dataset.thumbnail_key ??
    dataset.thumbnail ??
    null;

  if (typeof raw === "string" && raw.trim().length > 0) {
    const trimmed = raw.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }
    // Extract seed from paths like thumbnails/agri-1.jpg or fallback-0
    const match = trimmed.match(/thumbnails\/([^./]+)/i) || trimmed.match(/fallback-([0-9]+)/i);
    if (match) {
      return `https://picsum.photos/seed/${match[1]}/600/400`;
    }
  }

  // Guaranteed fallback using dataset id or title as a stable picsum seed
  const seed = dataset.id || dataset.title || "ordp-dataset";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
}


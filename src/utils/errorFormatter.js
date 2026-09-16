export function formatApiError(err, fallback = "An unexpected error occurred.") {
  const raw = err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback;
  
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);

  // Check if it's an account lockout message with an ISO date
  const lower = str.toLowerCase();
  if (lower.includes("account locked until") || lower.includes("locked until")) {
    // Try to extract date
    const dateMatch = str.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/i);
    if (dateMatch) {
      const lockDate = new Date(dateMatch[1]);
      if (!isNaN(lockDate.getTime())) {
        const timeStr = lockDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const dateStr = lockDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return `Your account is temporarily locked due to multiple failed login attempts. Please try again after ${timeStr} on ${dateStr}.`;
      }
    }
    return "Your account is temporarily locked due to multiple failed login attempts. Please try again later.";
  }

  // Check if it's a DRF throttle / lockout message with seconds
  if (lower.includes("throttled") || lower.includes("available in")) {
    const match = str.match(/(\d+)\s*seconds?/i);
    if (match) {
      const secs = parseInt(match[1], 10);
      const hours = Math.floor(secs / 3600);
      const minutes = Math.floor((secs % 3600) / 60);
      if (hours > 0) {
        return `Too many attempts. Please try again in about ${hours} hour${hours > 1 ? "s" : ""}.`;
      }
      if (minutes > 0) {
        return `Too many attempts. Please try again in about ${minutes} minute${minutes > 1 ? "s" : ""}.`;
      }
      return `Too many attempts. Please try again in ${secs} seconds.`;
    }
    return "Too many requests. Please try again later.";
  }

  return str;
}

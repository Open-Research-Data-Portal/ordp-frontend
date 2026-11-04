export function formatApiError(err, fallback = "An unexpected error occurred.") {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // 1. Detect if response data is an HTML document or contains HTML tags
  const isHtml =
    typeof data === "string" &&
    (/<!doctype/i.test(data) || /<html/i.test(data) || /<head/i.test(data) || /<body/i.test(data));

  if (isHtml) {
    if (status === 404) {
      return "The requested endpoint or dataset was not found on the server (404 Not Found).";
    }
    if (status === 403) {
      return "You do not have permission to perform this action (403 Forbidden).";
    }
    if (status === 500) {
      return "The server encountered an internal error (500 Internal Server Error). Please try again later.";
    }
    if (status === 502 || status === 503 || status === 504) {
      return `Server is temporarily unavailable (${status}). Please try again later.`;
    }
    return `Server returned an error (${status || "unknown"}).`;
  }

  // 2. Extract message from data if object or array
  let raw = null;
  if (data && typeof data === "object") {
    const nestedError = data.error && typeof data.error === "object" ? data.error : null;
    raw = nestedError?.detail || nestedError?.message || data.detail || data.message || data.error;
    if (!raw && Array.isArray(data.non_field_errors)) {
      raw = data.non_field_errors.join(", ");
    }
    if (!raw) {
      const firstKey = Object.keys(data)[0];
      if (firstKey && data[firstKey]) {
        const val = data[firstKey];
        raw = Array.isArray(val) ? `${firstKey}: ${val.join(", ")}` : `${firstKey}: ${val}`;
      }
    }
  } else if (typeof data === "string") {
    raw = data;
  }

  if (!raw) {
    raw = err?.message || fallback;
  }

  const str = typeof raw === "string" ? raw : JSON.stringify(raw);

  // If str still contains HTML tags, strip them cleanly
  if (/<[a-z][\s\S]*>/i.test(str)) {
    const stripped = str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (status === 404 || stripped.toLowerCase().includes("not found")) {
      return "The requested endpoint or dataset was not found on the server (404 Not Found).";
    }
    return stripped.length > 200 ? stripped.slice(0, 197) + "..." : stripped;
  }

  // 3. Check for specific known application error patterns
  const lower = str.toLowerCase();
  if (lower.includes("account locked until") || lower.includes("locked until")) {
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

  if (
    lower.includes("account_inactive") ||
    lower.includes("account inactive") ||
    lower.includes("account is inactive") ||
    lower.includes("user account is disabled") ||
    lower.includes("deactivated due to inactivity") ||
    lower.includes("account has been deactivated")
  ) {
    return "This account has been deactivated due to 6 months of inactivity. Please contact an administrator or support to reactivate your account.";
  }

  return str;
}

export function accessError(error, fallback = "This action could not be completed. Please try again.") {
  const status = error?.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "Access denied. You don't have permission to do this.";
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  const fieldError = error?.response?.data?.non_field_errors?.[0];
  if (typeof fieldError === "string") return fieldError;
  return fallback;
}

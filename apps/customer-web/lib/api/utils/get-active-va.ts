/**
 * Returns the active VA ID for API calls.
 * - If boss has multiple VAs: uses selectedVaId from localStorage
 * - Otherwise: uses virtualAccountId from user object
 */
export function getActiveVaId(): string {
  if (typeof window === "undefined") return "";
  const selected = localStorage.getItem("selectedVaId");
  if (selected) return selected;
  const user = JSON.parse(localStorage.getItem("user") ?? "{}");
  return user.virtualAccountId ?? "";
}

const MAX_RECENT_SEARCHES = 5;

function storageKey(userId: number): string {
  return `medasin:recent-searches:v1:${userId}`;
}

export function readRecentSearches(userId: number | undefined): string[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && item.length <= 100)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearch(userId: number | undefined, query: string): string[] {
  if (!userId) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return readRecentSearches(userId);
  const recent = [
    trimmed,
    ...readRecentSearches(userId).filter(
      (item) => item.toLocaleLowerCase() !== trimmed.toLocaleLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(recent));
  } catch {
    // Searching still works when storage is unavailable.
  }
  return recent;
}

export function clearRecentSearches(userId: number | undefined): void {
  if (!userId) return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Search remains available when storage is unavailable.
  }
}

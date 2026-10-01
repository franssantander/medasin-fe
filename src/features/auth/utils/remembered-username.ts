const REMEMBERED_USERNAME_KEY = "medasin.auth.remembered-username.v1";

export function getRememberedUsername(): string | undefined {
  try {
    const username = window.localStorage.getItem(REMEMBERED_USERNAME_KEY);
    return username?.trim() ? username : undefined;
  } catch {
    return undefined;
  }
}

export function setRememberedUsername(username: string | null): void {
  try {
    if (username?.trim()) {
      window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
    } else {
      window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
  } catch {
    // Login remains available when browser storage is blocked or full.
  }
}

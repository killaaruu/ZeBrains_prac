const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (unused, kept for API compat)

export function getCookie(name: string): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  return localStorage.getItem(name) ?? undefined;
}

export function setCookie(name: string, value: string, _maxAge: number = DEFAULT_MAX_AGE): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(name, value);
}

export function removeCookie(name: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(name);
}

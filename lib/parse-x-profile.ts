/** X handle: 1–15 chars, letters, digits, underscore. */
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;

const X_HOSTS = new Set(["x.com", "twitter.com"]);

export type XProfileInput = {
  login: string;
};

export function parseXProfileInput(raw: string): XProfileInput | null {
  const value = raw.trim();
  if (!value) return null;

  const normalizedAt = value.startsWith("@") ? value.slice(1) : value;

  try {
    const url =
      normalizedAt.includes("://") ||
      normalizedAt.startsWith("x.com") ||
      normalizedAt.startsWith("twitter.com")
        ? new URL(
            normalizedAt.startsWith("http")
              ? normalizedAt
              : `https://${normalizedAt}`
          )
        : null;

    if (url) {
      const host = url.hostname.replace(/^www\./, "");
      if (X_HOSTS.has(host)) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length !== 1) return null;
        const login = normalizeProfileSegment(parts[0] ?? "");
        return isValidXProfileHandle(login) ? { login } : null;
      }
    }
  } catch {
    // Fall through to plain @handle / handle parsing.
  }

  if (normalizedAt.includes("/") || normalizedAt.includes(" ")) {
    return null;
  }

  const login = normalizeProfileSegment(normalizedAt);
  return isValidXProfileHandle(login) ? { login } : null;
}

export function normalizeProfileSegment(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\/+$/, "");
}

export function isValidXProfileHandle(handle: string): boolean {
  const value = normalizeProfileSegment(handle);
  if (!value) return false;
  return X_HANDLE.test(value);
}

/** HTTP origin of the API, derived from VITE_WS_URL (wss://host/ws → https://host). */
export function apiHttpOrigin(): string {
  const ws = import.meta.env.VITE_WS_URL?.trim();
  if (ws) {
    try {
      const u = new URL(ws);
      return `${u.protocol === "wss:" ? "https:" : "http:"}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  return window.location.origin;
}

/** Resolve a backend media path (e.g. /api/v1/media/…) against the API host from VITE_WS_URL. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const origin = apiHttpOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

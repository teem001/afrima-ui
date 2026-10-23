/** Resolve a backend media path (e.g. /api/v1/media/…) against the API host from VITE_WS_URL. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const ws = import.meta.env.VITE_WS_URL?.trim();
  if (ws) {
    try {
      const u = new URL(ws);
      const http = u.protocol === "wss:" ? "https:" : "http:";
      return `${http}//${u.host}${path.startsWith("/") ? path : `/${path}`}`;
    } catch {
      /* fall through */
    }
  }
  return path;
}

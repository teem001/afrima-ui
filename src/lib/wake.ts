import { apiHttpOrigin } from "@/lib/media";

/** Hit HTTP health so Vercel wakes the container before (or while) the WebSocket connects. */
export function wakeApi(): void {
  try {
    const origin = apiHttpOrigin();
    if (!origin || origin === window.location.origin) return;
    void fetch(`${origin}/actuator/health`, { method: "GET", cache: "no-store", mode: "cors" }).catch(() => {
      /* cold start / network — WS reconnect will retry */
    });
  } catch {
    /* ignore */
  }
}

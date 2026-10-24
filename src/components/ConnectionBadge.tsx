import { useConnection } from "@/lib/ws";

export function ConnectionBadge() {
  const status = useConnection((s) => s.status);
  const live = status === "open";
  const label = live ? "Live" : status === "connecting" ? "Waking server…" : "Reconnecting…";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        live ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
      }`}
      title={
        live
          ? "Connected — orders and stock update in real time"
          : "API may be cold-starting on Vercel (often 10–30s). Stay on the page."
      }
    >
      <span className={`size-2 rounded-full ${live ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />
      {label}
    </span>
  );
}

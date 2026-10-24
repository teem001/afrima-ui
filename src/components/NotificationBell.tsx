import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { Button, ErrorBanner } from "@/components/ui";

export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: api.notificationsUnread,
    enabled: !!user,
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: api.notifications,
    enabled: !!user && open,
  });
  const markRead = useMutation({
    mutationFn: (id?: string | null) => api.markNotificationsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-notif-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  const count = unread.data?.count ?? 0;

  return (
    <div className="relative" data-notif-panel>
      <button
        type="button"
        className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-semibold text-stone-900">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-[1100] mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
            <p className="text-sm font-semibold text-stone-900">Alerts</p>
            {count > 0 && (
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                loading={markRead.isPending}
                onClick={() => markRead.mutate(null)}
              >
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {list.isPending && <p className="px-3 py-4 text-sm text-stone-500">Loading…</p>}
            {list.isError && (
              <div className="p-3">
                <ErrorBanner message={errorMessage(list.error)} />
              </div>
            )}
            {list.data?.length === 0 && (
              <p className="px-3 py-4 text-sm text-stone-500">No alerts yet. We&apos;ll ping you when stock matches what you search for.</p>
            )}
            {list.data?.map((n) => (
              <div
                key={n.id}
                className={`border-b border-stone-50 px-3 py-2.5 ${n.readAt ? "bg-white" : "bg-amber-50/40"}`}
              >
                {n.href ? (
                  <Link
                    to={n.href}
                    className="block"
                    onClick={() => {
                      if (!n.readAt) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium text-stone-900">{n.title}</p>
                    <p className="text-xs text-stone-600">{n.body}</p>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      if (!n.readAt) markRead.mutate(n.id);
                    }}
                  >
                    <p className="text-sm font-medium text-stone-900">{n.title}</p>
                    <p className="text-xs text-stone-600">{n.body}</p>
                  </button>
                )}
                <p className="mt-1 text-[11px] text-stone-400">{formatDateTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

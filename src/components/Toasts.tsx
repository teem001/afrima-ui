import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useToasts } from "@/store/toasts";

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed right-4 bottom-4 z-[1100] flex w-80 flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-lg"
        >
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Bell className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            {toast.href ? (
              <Link to={toast.href} onClick={() => dismiss(toast.id)} className="font-medium text-stone-900 hover:underline">
                {toast.title}
              </Link>
            ) : (
              <p className="font-medium text-stone-900">{toast.title}</p>
            )}
            {toast.body && <p className="text-sm text-stone-600">{toast.body}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="rounded p-1 text-stone-400 hover:text-stone-700"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

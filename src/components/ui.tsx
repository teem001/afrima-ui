import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@/lib/types";

const cx = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(" "));

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-700/50",
  secondary: "bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50 disabled:text-stone-400",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none",
        className,
      )}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-stone-200 bg-white shadow-sm", className)}>{children}</div>;
}

type Tone = "green" | "amber" | "red" | "stone" | "blue";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  stone: "bg-stone-100 text-stone-700 ring-stone-500/20",
  blue: "bg-sky-50 text-sky-800 ring-sky-600/20",
};

export function Badge({ tone = "stone", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

const statusTone: Record<OrderStatus, Tone> = { PLACED: "amber", ACCEPTED: "blue", FULFILLED: "green", CANCELLED: "red" };

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTone[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
      <Loader2 className="size-5 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-stone-400">{icon}</div>
      <p className="font-medium text-stone-800">{title}</p>
      {children && <div className="max-w-sm text-sm text-stone-500">{children}</div>}
    </div>
  );
}

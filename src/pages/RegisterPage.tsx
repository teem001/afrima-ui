import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useConnection } from "@/lib/ws";
import type { Role } from "@/lib/types";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { useAuthRedirect } from "@/pages/LoginPage";

const ROLES: { value: Role; title: string; body: string; icon: typeof Store }[] = [
  { value: "CONSUMER", title: "I'm shopping", body: "Find and order from nearby shops", icon: ShoppingBag },
  { value: "MERCHANT", title: "I run a shop", body: "Manage stock and accept orders", icon: Store },
];

export function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "CONSUMER" as Role });
  const onAuthenticated = useAuthRedirect();
  const location = useLocation();
  const live = useConnection((s) => s.status) === "open";

  const register = useMutation({ mutationFn: api.register, onSuccess: onAuthenticated });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate({ ...form, phone: form.phone || undefined });
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-stone-600">
          Start from scratch — register, set your location, then shop or create a shop. Light data only.
        </p>
      </div>
      {!live && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Wait for <strong>Live</strong> in the header before creating an account (server may be cold-starting).
        </p>
      )}
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const selected = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <Icon className={`mb-1 size-5 ${selected ? "text-emerald-800" : "text-stone-500"}`} />
                  <p className="text-sm font-medium text-stone-900">{r.title}</p>
                  <p className="text-xs text-stone-500">{r.body}</p>
                </button>
              );
            })}
          </div>
          <Field label="Full name">
            <Input required value={form.fullName} onChange={set("fullName")} autoComplete="name" />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
          {register.isError && <ErrorBanner message={errorMessage(register.error)} />}
          <Button type="submit" className="w-full" loading={register.isPending}>
            Create account
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link to="/login" state={location.state} className="font-medium text-emerald-800 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

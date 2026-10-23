import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demoAccounts";
import type { AuthResponse } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

export function useAuthRedirect() {
  const signIn = useAuth((s) => s.signIn);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  return (auth: AuthResponse) => {
    queryClient.clear();
    signIn(auth);
    if (auth.user.role === "MERCHANT") navigate("/merchant", { replace: true });
    else navigate(from ?? "/", { replace: true });
  };
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const onAuthenticated = useAuthRedirect();
  const location = useLocation();

  const login = useMutation({ mutationFn: api.login, onSuccess: onAuthenticated });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const consumers = DEMO_ACCOUNTS.filter((a) => a.role === "CONSUMER");
  const merchants = DEMO_ACCOUNTS.filter((a) => a.role === "MERCHANT");

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-stone-600">
          Several people can demo at once — each person picks a different account (or registers their own) on their own
          phone or browser.
        </p>
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {login.isError && <ErrorBanner message={errorMessage(login.error)} />}
          <Button type="submit" className="w-full" loading={login.isPending}>
            Sign in
          </Button>
        </form>
        <div className="mt-5 space-y-3 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Demo shoppers</p>
          <div className="flex flex-wrap gap-2">
            {consumers.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Demo merchants</p>
          <div className="flex flex-wrap gap-2">
            {merchants.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500">All demo passwords: {DEMO_PASSWORD}</p>
        </div>
      </Card>
      <p className="text-center text-sm text-stone-600">
        New to AfriSmart?{" "}
        <Link to="/register" state={location.state} className="font-medium text-emerald-800 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

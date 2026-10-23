import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
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

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-stone-600">
          Sign in with the account you registered — several people can use AfriSmart at once on their own devices.
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
      </Card>
      <p className="text-center text-sm text-stone-600">
        New here?{" "}
        <Link to="/register" state={location.state} className="font-medium text-emerald-800 hover:underline">
          Create an account
        </Link>{" "}
        and start from scratch — no seeded shops required.
      </p>
    </div>
  );
}

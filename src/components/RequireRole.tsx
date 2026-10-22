import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import type { Role } from "@/lib/types";

export function RequireRole({ role, children }: { role?: Role; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "MERCHANT" ? "/merchant" : "/"} replace />;
  }
  return <>{children}</>;
}

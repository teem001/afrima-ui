import { Link, NavLink, Outlet } from "react-router-dom";
import { Brain, Fingerprint, LogOut, MapPin, ShoppingBag, Store, Wallet as WalletIcon } from "lucide-react";
import { useRealtimeSync } from "@/lib/realtimeSync";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { Toasts } from "@/components/Toasts";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:text-stone-900"
  }`;

export function Layout() {
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  useRealtimeSync();

  // A full reload drops the previous user's cached queries and avoids racing the route guards.
  const signOut = () => {
    useAuth.persist.clearStorage();
    window.location.assign("/");
  };

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-[1000] border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-stone-900">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-amber-300">
              <MapPin className="size-4" />
            </span>
            AfriSmart
          </Link>

          <nav className="flex items-center gap-1">
            {user?.role !== "MERCHANT" && (
              <NavLink to="/" end className={navClass}>
                Search
              </NavLink>
            )}
            {user?.role === "CONSUMER" && (
              <NavLink to="/orders" className={navClass}>
                My orders
              </NavLink>
            )}
            {user?.role === "CONSUMER" && (
              <NavLink to="/profile" className={navClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Brain className="size-4" /> Profile
                </span>
              </NavLink>
            )}
            {user && (
              <NavLink to="/wallet" className={navClass}>
                <span className="inline-flex items-center gap-1.5">
                  <WalletIcon className="size-4" /> Wallet
                </span>
              </NavLink>
            )}
            <NavLink to="/verify" className={navClass}>
              <span className="inline-flex items-center gap-1.5">
                <Fingerprint className="size-4" /> Verify
              </span>
            </NavLink>
            {user?.role === "MERCHANT" && (
              <NavLink to="/merchant" className={navClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Store className="size-4" /> Merchant
                </span>
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ConnectionBadge />
            <NotificationBell />
            {user?.role !== "MERCHANT" && (
              <Link
                to="/cart"
                className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Cart"
              >
                <ShoppingBag className="size-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-semibold text-stone-900">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <>
                <span className="hidden text-sm text-stone-600 sm:inline">{user.fullName}</span>
                <button
                  onClick={signOut}
                  className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}

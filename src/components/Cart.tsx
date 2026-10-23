import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Route, ShoppingBag, Trash2 } from "lucide-react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { formatDistance, formatKobo } from "@/lib/format";
import type { NearbyOffer } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { cartTotalKobo, useCart, type CartLine } from "@/store/cart";
import { useSearchPrefs } from "@/store/searchPrefs";
import { Button, Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

const REROUTE_RADIUS_M = 20_000;

interface Alternative {
  storeId: string;
  storeName: string;
  address: string;
  distanceMeters: number;
  openNow: boolean;
  totalKobo: number;
  offers: NearbyOffer[];
}

/** Finds other nearby shops that can fill the whole cart when the chosen shop runs out. */
function Reroute({ lines, currentStoreId }: { lines: CartLine[]; currentStoreId: string }) {
  const { lat, lng, radiusMeters } = useSearchPrefs();
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);
  const radius = Math.max(radiusMeters, REROUTE_RADIUS_M);

  const results = useQueries({
    queries: lines.map((line) => ({
      queryKey: ["search", line.sku, lat, lng, radius],
      queryFn: () => api.search({ q: line.sku, lat, lng, radiusMeters: radius }),
      staleTime: 0,
    })),
  });

  const loading = results.some((r) => r.isPending);
  const failed = results.find((r) => r.isError);

  const alternatives = useMemo<Alternative[]>(() => {
    if (loading || failed) return [];
    const byStore = new Map<string, Alternative>();
    lines.forEach((line, i) => {
      for (const offer of results[i].data?.offers ?? []) {
        if (offer.productId !== line.productId || offer.storeId === currentStoreId) continue;
        if (offer.quantity < line.quantity) continue;
        const alt = byStore.get(offer.storeId) ?? {
          storeId: offer.storeId,
          storeName: offer.storeName,
          address: offer.address,
          distanceMeters: offer.distanceMeters,
          openNow: offer.openNow,
          totalKobo: 0,
          offers: [],
        };
        alt.offers.push(offer);
        alt.totalKobo += offer.unitPriceKobo * line.quantity;
        byStore.set(offer.storeId, alt);
      }
    });
    return [...byStore.values()]
      .filter((alt) => alt.offers.length === lines.length)
      .sort((a, b) => a.distanceMeters - b.distanceMeters || a.totalKobo - b.totalKobo);
  }, [loading, failed, lines, results, currentStoreId]);

  const switchTo = (alt: Alternative) => {
    const quantities = new Map(lines.map((l) => [l.productId, l.quantity]));
    clear();
    for (const offer of alt.offers) add(offer, quantities.get(offer.productId) ?? 1);
  };

  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
        <Route className="size-4" /> Reroute to another shop
      </p>
      {loading && <Spinner label="Checking nearby shops…" />}
      {failed && <ErrorBanner message={errorMessage(failed.error)} />}
      {!loading && !failed && alternatives.length === 0 && (
        <p className="text-sm text-amber-900/80">
          No other shop within {formatDistance(radius)} has everything in your cart. Try lowering quantities.
        </p>
      )}
      {alternatives.slice(0, 3).map((alt) => (
        <div key={alt.storeId} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2.5 ring-1 ring-amber-200">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900">{alt.storeName}</p>
            <p className="text-xs text-stone-500">
              {formatDistance(alt.distanceMeters)} · {formatKobo(alt.totalKobo)}
              {!alt.openNow && " · closed now"}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0 px-3 py-1.5" onClick={() => switchTo(alt)}>
            Switch
          </Button>
        </div>
      ))}
    </div>
  );
}

export function Cart() {
  const { store, lines, setQuantity, remove, clear } = useCart();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rerouteFor, setRerouteFor] = useState<string | null>(null);

  const place = useMutation({
    mutationFn: () =>
      api.placeOrder({
        storeId: store!.storeId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      }),
    onSuccess: (order) => {
      clear();
      setRerouteFor(null);
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "INSUFFICIENT_STOCK") setRerouteFor(store?.storeId ?? null);
    },
  });

  if (!store || lines.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ShoppingBag className="size-8" />} title="Your cart is empty">
          Search for an item and add it from the nearest shop that has it.
        </EmptyState>
      </Card>
    );
  }

  const total = cartTotalKobo(lines);
  const stockError = place.error instanceof ApiError && place.error.code === "INSUFFICIENT_STOCK";
  const fundsError = place.error instanceof ApiError && place.error.code === "INSUFFICIENT_FUNDS";

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Ordering from</p>
        <p className="font-semibold text-stone-900">{store.storeName}</p>
        <p className="text-sm text-stone-500">{store.address}</p>
      </div>

      <ul className="divide-y divide-stone-100">
        {lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">{line.productName}</p>
              <p className="text-xs text-stone-500">{formatKobo(line.unitPriceKobo)} each</p>
            </div>
            <div className="flex items-center rounded-lg ring-1 ring-stone-200">
              <button
                className="p-1.5 text-stone-600 hover:text-stone-900 disabled:opacity-40"
                onClick={() => setQuantity(line.productId, line.quantity - 1)}
                disabled={line.quantity <= 1}
                aria-label="Decrease"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
              <button
                className="p-1.5 text-stone-600 hover:text-stone-900 disabled:opacity-40"
                onClick={() => setQuantity(line.productId, line.quantity + 1)}
                disabled={line.quantity >= line.available}
                aria-label="Increase"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              className="p-1.5 text-stone-400 hover:text-red-600"
              onClick={() => remove(line.productId)}
              aria-label={`Remove ${line.productName}`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-stone-100 pt-3">
        <span className="text-sm text-stone-600">Total</span>
        <span className="text-lg font-semibold tabular-nums">{formatKobo(total)}</span>
      </div>

      {place.isError && (
        <ErrorBanner
          message={stockError ? `${store.storeName} can't fill this order anymore.` : errorMessage(place.error)}
        />
      )}
      {stockError && rerouteFor && <Reroute lines={lines} currentStoreId={rerouteFor} />}
      {fundsError && (
        <Link to="/wallet" className="block text-center text-sm font-medium text-emerald-800 hover:underline">
          Add demo funds to your wallet →
        </Link>
      )}
      <p className="text-center text-xs text-stone-500">Paid from your wallet into escrow; released to the shop on fulfilment.</p>

      {!user ? (
        <Link
          to="/login"
          state={{ from: "/cart" }}
          className="block rounded-lg bg-emerald-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-800"
        >
          Sign in to place order
        </Link>
      ) : user.role !== "CONSUMER" ? (
        <p className="text-center text-sm text-stone-500">Sign in with a consumer account to order.</p>
      ) : (
        <Button className="w-full py-2.5" loading={place.isPending} onClick={() => place.mutate()}>
          Place order · {formatKobo(total)}
        </Button>
      )}
    </Card>
  );
}

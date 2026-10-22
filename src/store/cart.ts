import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NearbyOffer } from "@/lib/types";

export interface CartLine {
  productId: string;
  productName: string;
  sku: string;
  unitPriceKobo: number;
  available: number;
  quantity: number;
}

export interface CartStore {
  storeId: string;
  storeName: string;
  address: string;
}

interface CartState {
  store: CartStore | null;
  lines: CartLine[];
  /** Orders are placed against one store, so adding from another store starts a new cart. */
  add: (offer: NearbyOffer, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      store: null,
      lines: [],
      add: (offer, quantity = 1) => {
        const { store, lines } = get();
        const sameStore = store?.storeId === offer.storeId;
        const base = sameStore ? lines : [];
        const existing = base.find((l) => l.productId === offer.productId);
        const next = existing
          ? base.map((l) =>
              l.productId === offer.productId
                ? { ...l, quantity: Math.min(l.quantity + quantity, offer.quantity), available: offer.quantity }
                : l,
            )
          : [
              ...base,
              {
                productId: offer.productId,
                productName: offer.productName,
                sku: offer.sku,
                unitPriceKobo: offer.unitPriceKobo,
                available: offer.quantity,
                quantity: Math.min(quantity, offer.quantity),
              },
            ];
        set({
          store: { storeId: offer.storeId, storeName: offer.storeName, address: offer.address },
          lines: next,
        });
      },
      setQuantity: (productId, quantity) =>
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.available)) } : l,
          ),
        }),
      remove: (productId) => {
        const lines = get().lines.filter((l) => l.productId !== productId);
        set({ lines, store: lines.length ? get().store : null });
      },
      clear: () => set({ store: null, lines: [] }),
    }),
    { name: "afrismart-cart" },
  ),
);

export const cartTotalKobo = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unitPriceKobo * l.quantity, 0);

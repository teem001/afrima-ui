import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Orders only carry ids, so resolve product and store names from the public catalog. */
export function useLookups() {
  const products = useQuery({ queryKey: ["products"], queryFn: api.products, staleTime: 5 * 60_000 });
  const stores = useQuery({ queryKey: ["stores"], queryFn: api.stores, staleTime: 5 * 60_000 });

  return useMemo(() => {
    const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
    const storeById = new Map((stores.data ?? []).map((s) => [s.id, s]));
    return {
      products: products.data ?? [],
      productName: (id: string) => productById.get(id)?.name ?? "Product",
      storeName: (id: string) => storeById.get(id)?.name ?? "Shop",
      store: (id: string) => storeById.get(id),
    };
  }, [products.data, stores.data]);
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtime } from "@/lib/ws";
import { formatKobo } from "@/lib/format";
import type { Order, StockChanged } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { useToasts } from "@/store/toasts";

/** Keeps cached queries current from server pushes, replacing the old polling intervals. */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let stockTimer: ReturnType<typeof setTimeout> | null = null;
    const touchedStores = new Set<string>();

    const upsertOrder = (order: Order) => {
      queryClient.setQueryData(["orders", order.id], order);
      for (const key of [
        ["orders", "mine"],
        ["orders", "merchant"],
      ]) {
        queryClient.setQueryData<Order[]>(key, (prev) => {
          if (!prev) return prev;
          return prev.some((o) => o.id === order.id)
            ? prev.map((o) => (o.id === order.id ? order : o))
            : [order, ...prev];
        });
      }
    };

    const offPlaced = realtime.on("order.placed", (data) => {
      const order = data as Order;
      upsertOrder(order);
      const me = useAuth.getState().user;
      if (me?.role === "MERCHANT") {
        useToasts.getState().push({
          title: "New order",
          body: `${order.items.reduce((n, l) => n + l.quantity, 0)} item(s) · ${formatKobo(order.totalKobo)}`,
          href: "/merchant",
        });
      }
    });

    const offUpdated = realtime.on("order.updated", (data) => {
      const order = data as Order;
      upsertOrder(order);
      if (useAuth.getState().user?.id === order.consumerId && order.status === "ACCEPTED") {
        useToasts.getState().push({
          title: "Order accepted",
          body: "The shop is getting your order ready.",
          href: `/orders/${order.id}`,
        });
      }
    });

    // An order with several lines fires one event per line; batch them into one refetch.
    const offStock = realtime.on("stock.changed", (data) => {
      touchedStores.add((data as StockChanged).storeId);
      if (stockTimer) return;
      stockTimer = setTimeout(() => {
        stockTimer = null;
        queryClient.invalidateQueries({ queryKey: ["search"] });
        touchedStores.forEach((storeId) => queryClient.invalidateQueries({ queryKey: ["inventory", storeId] }));
        touchedStores.clear();
      }, 300);
    });

    // Pushes sent while we were offline are lost, so catch up after a reconnect.
    let firstOpen = true;
    const offOpen = realtime.on("connection.open", () => {
      if (firstOpen) {
        firstOpen = false;
        return;
      }
      queryClient.invalidateQueries();
    });

    return () => {
      offPlaced();
      offUpdated();
      offStock();
      offOpen();
      if (stockTimer) clearTimeout(stockTimer);
    };
  }, [queryClient]);
}

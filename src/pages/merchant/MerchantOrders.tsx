import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo, shortHash } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import type { Order } from "@/lib/types";
import { Button, Card, EmptyState, ErrorBanner, Spinner, StatusBadge } from "@/components/ui";

export function MerchantOrders({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();
  const { productName } = useLookups();
  const orders = useQuery({
    queryKey: ["orders", "merchant"],
    queryFn: api.merchantOrders,
  });

  const accept = useMutation({
    mutationFn: api.acceptOrder,
    onSuccess: (updated) => {
      queryClient.setQueryData<Order[]>(["orders", "merchant"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)),
      );
    },
  });

  const fulfil = useMutation({
    mutationFn: api.fulfilOrder,
    onSuccess: (updated) => {
      queryClient.setQueryData<Order[]>(["orders", "merchant"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)),
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["twin"] });
    },
  });

  const cancel = useMutation({
    mutationFn: api.cancelOrder,
    onSuccess: (updated) => {
      queryClient.setQueryData<Order[]>(["orders", "merchant"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)),
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });

  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <ErrorBanner message={errorMessage(orders.error)} />;

  const mine = orders.data.filter((o) => o.storeId === storeId);
  const pending = mine.filter((o) => o.status === "PLACED");
  const rest = mine.filter((o) => o.status !== "PLACED");

  if (mine.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ClipboardList className="size-10" />} title="No orders yet">
          New orders show up here automatically.
        </EmptyState>
      </Card>
    );
  }

  const renderOrder = (order: Order) => (
    <Card key={order.id} className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-xs text-stone-500">{formatDateTime(order.createdAt)}</span>
        </div>
        <p className="text-sm text-stone-800">
          {order.items.map((i) => `${i.quantity}× ${productName(i.productId)}`).join(", ")}
        </p>
        <Link to={`/orders/${order.id}`} className="font-mono text-xs text-stone-500 hover:text-emerald-800">
          {shortHash(order.ledgerHash)}
        </Link>
      </div>
      <p className="font-semibold tabular-nums">{formatKobo(order.totalKobo)}</p>
      {order.status === "PLACED" && (
        <>
          <Button
            loading={accept.isPending && accept.variables === order.id}
            onClick={() => accept.mutate(order.id)}
          >
            Accept
          </Button>
          <Button variant="ghost" onClick={() => cancel.mutate(order.id)}>
            Cancel
          </Button>
        </>
      )}
      {order.status === "ACCEPTED" && (
        <>
          <Button
            loading={fulfil.isPending && fulfil.variables === order.id}
            onClick={() => fulfil.mutate(order.id)}
            title="Hands the order over: releases escrow to your wallet and anchors the receipt"
          >
            Mark fulfilled
          </Button>
          <Button variant="ghost" onClick={() => cancel.mutate(order.id)}>
            Cancel
          </Button>
        </>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {(accept.isError || fulfil.isError || cancel.isError) && (
        <ErrorBanner message={errorMessage(accept.error ?? fulfil.error ?? cancel.error)} />
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700">Needs attention ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">You're all caught up.</p>
        ) : (
          pending.map(renderOrder)
        )}
      </section>
      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">Earlier</h2>
          {rest.map(renderOrder)}
        </section>
      )}
    </div>
  );
}

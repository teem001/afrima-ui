import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import { Card, EmptyState, ErrorBanner, Spinner, StatusBadge } from "@/components/ui";

export function OrdersPage() {
  const orders = useQuery({ queryKey: ["orders", "mine"], queryFn: api.myOrders });
  const { storeName, productName } = useLookups();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
      {orders.isPending && <Spinner />}
      {orders.isError && <ErrorBanner message={errorMessage(orders.error)} />}
      {orders.data?.length === 0 && (
        <Card>
          <EmptyState icon={<Receipt className="size-10" />} title="No orders yet">
            <Link to="/" className="font-medium text-emerald-800 hover:underline">
              Find something nearby
            </Link>
          </EmptyState>
        </Card>
      )}
      <div className="space-y-3">
        {orders.data?.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="block">
            <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-900">{storeName(order.storeId)}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="truncate text-sm text-stone-600">
                  {order.items.map((i) => `${i.quantity}× ${productName(i.productId)}`).join(", ")}
                </p>
                <p className="text-xs text-stone-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <p className="font-semibold tabular-nums">{formatKobo(order.totalKobo)}</p>
              <ChevronRight className="size-5 text-stone-400" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

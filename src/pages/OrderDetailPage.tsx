import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Copy, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo, formatTime } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import { useAuth } from "@/store/auth";
import { Badge, Button, Card, ErrorBanner, Spinner, StatusBadge } from "@/components/ui";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const TIMELINE: { label: string; done: (s: string, p: string, anchored: boolean) => boolean }[] = [
  { label: "Reserved at shop", done: () => true },
  { label: "Paid into escrow", done: (_s, p) => p === "IN_ESCROW" || p === "RELEASED" },
  { label: "Accepted", done: (s) => s === "ACCEPTED" || s === "FULFILLED" },
  { label: "Fulfilled · escrow released", done: (s, p) => s === "FULFILLED" && p === "RELEASED" },
  { label: "Receipt anchored", done: (_s, _p, anchored) => anchored },
];

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const justPlaced = (useLocation().state as { justPlaced?: boolean } | null)?.justPlaced;
  const role = useAuth((s) => s.user?.role);
  const { productName, store } = useLookups();
  const queryClient = useQueryClient();

  const order = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => api.order(orderId),
  });
  const payment = useQuery({
    queryKey: ["payments", "order", orderId],
    queryFn: () => api.orderPayment(orderId),
    enabled: order.isSuccess,
  });
  const verify = useQuery({
    queryKey: ["verify", orderId],
    queryFn: () => api.verifyOrder(orderId),
    enabled: order.isSuccess,
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["twin"] });
    queryClient.invalidateQueries({ queryKey: ["verify", orderId] });
  };
  const fulfil = useMutation({ mutationFn: api.fulfilOrder, onSuccess: refresh });
  const cancel = useMutation({ mutationFn: api.cancelOrder, onSuccess: refresh });

  if (order.isPending) return <Spinner />;
  if (order.isError) return <ErrorBanner message={errorMessage(order.error)} />;

  const o = order.data;
  const shop = store(o.storeId);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        to={role === "MERCHANT" ? "/merchant" : "/orders"}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" /> {role === "MERCHANT" ? "Back to dashboard" : "All orders"}
      </Link>

      {justPlaced && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-700 p-4 text-white">
          <CheckCircle2 className="size-6 shrink-0 text-amber-300" />
          <div>
            <p className="font-semibold">Order placed</p>
            <p className="text-sm text-emerald-50">Stock is reserved. {shop?.name ?? "The shop"} will confirm shortly.</p>
          </div>
        </div>
      )}

      <Card className="divide-y divide-stone-100">
        <div className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Order</p>
            <p className="font-mono text-sm text-stone-700">{o.id}</p>
            <p className="mt-1 text-xs text-stone-500">{formatDateTime(o.createdAt)}</p>
          </div>
          <StatusBadge status={o.status} />
        </div>

        {shop && (
          <div className="p-4">
            <p className="font-semibold text-stone-900">{shop.name}</p>
            <p className="text-sm text-stone-600">{shop.address}</p>
            <p className="text-xs text-stone-500">
              Open {formatTime(shop.openAt)} – {formatTime(shop.closeAt)}
            </p>
          </div>
        )}

        <ul className="space-y-2 p-4">
          {o.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-4 text-sm">
              <span className="text-stone-700">
                {item.quantity}× {productName(item.productId)}
              </span>
              <span className="tabular-nums text-stone-900">{formatKobo(item.unitPriceKobo * item.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-stone-100 pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatKobo(o.totalKobo)}</span>
          </li>
        </ul>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <WalletIcon className="size-4 text-emerald-700" /> Payment &amp; fulfilment
        </p>
        {o.status === "CANCELLED" ? (
          <p className="text-sm text-stone-600">
            {payment.data?.status === "REFUNDED"
              ? "Cancelled — the escrow was refunded to the customer's wallet and the stock put back."
              : "This order was cancelled."}
          </p>
        ) : (
          <ol className="space-y-2">
            {TIMELINE.map((step) => {
              const done = step.done(o.status, payment.data?.status ?? "UNPAID", verify.data?.anchored ?? false);
              return (
                <li key={step.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={`grid size-5 place-items-center rounded-full ${
                      done ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-400"
                    }`}
                  >
                    <Check className="size-3" />
                  </span>
                  <span className={done ? "text-stone-800" : "text-stone-400"}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {payment.data && payment.data.status !== "UNPAID" && (
          <p className="text-xs text-stone-500">
            {formatKobo(payment.data.amountKobo)} {payment.data.status === "IN_ESCROW" && "held in escrow"}
            {payment.data.status === "RELEASED" &&
              `released · shop received ${formatKobo(payment.data.netKobo)} after ${formatKobo(payment.data.commissionKobo)} commission`}
            {payment.data.status === "REFUNDED" && "refunded from escrow"}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {role === "MERCHANT" && o.status === "ACCEPTED" && (
            <Button loading={fulfil.isPending} onClick={() => fulfil.mutate(o.id)}>
              Mark fulfilled
            </Button>
          )}
          {(o.status === "PLACED" || o.status === "ACCEPTED") && (
            <Button variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(o.id)}>
              Cancel order
            </Button>
          )}
          {(fulfil.isError || cancel.isError) && (
            <ErrorBanner message={errorMessage(fulfil.error ?? cancel.error)} />
          )}
        </div>
      </Card>

      <Card className="space-y-2 border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
            <ShieldCheck className="size-4" /> Ledger hash
          </p>
          <CopyButton value={o.ledgerHash} />
        </div>
        <p className="font-mono text-xs break-all text-emerald-950">{o.ledgerHash}</p>
        <p className="text-xs text-emerald-900/70">
          SHA-256 fingerprint of this order's shop, buyer, items, prices and time. Any change to the order produces a
          different hash, so it can be verified later.
        </p>
        {verify.data?.anchored && (
          <Badge tone="green">
            Anchored · {verify.data.txReference} · proof {verify.data.proofValid ? "valid" : "invalid"}
          </Badge>
        )}
        <Link to="/verify" className="block text-xs font-medium text-emerald-800 hover:underline">
          Verify this receipt →
        </Link>
      </Card>
    </div>
  );
}

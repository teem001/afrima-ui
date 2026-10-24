import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, MapPin, PiggyBank, ShieldCheck, ShoppingBag, Wallet as WalletIcon } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo, nairaToKobo } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { useSearchPrefs } from "@/store/searchPrefs";
import { Badge, Button, Card, ErrorBanner, Spinner } from "@/components/ui";

const TX_LABELS: Record<string, string> = {
  DEMO_FUND: "Demo funding",
  ESCROW_HOLD: "Paid into escrow",
  ESCROW_RELEASE: "Escrow released to you",
  ESCROW_REFUND: "Escrow refund",
  PAYOUT: "Payout to bank",
};

const txLabel = (type: string) => TX_LABELS[type] ?? type.replaceAll("_", " ").toLowerCase();

export function WalletPage() {
  const queryClient = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const prefs = useSearchPrefs();
  const cartLines = useCart((s) => s.lines.length);

  const wallet = useQuery({ queryKey: ["wallet"], queryFn: api.wallet });
  const transactions = useQuery({ queryKey: ["wallet", "transactions"], queryFn: api.walletTransactions });
  const twin = useQuery({ queryKey: ["twin", "me"], queryFn: api.myTwin, enabled: role === "CONSUMER" });
  const summary = useQuery({
    queryKey: ["payments", "merchantSummary"],
    queryFn: api.merchantPayments,
    enabled: role === "MERCHANT",
  });

  const fund = useMutation({
    mutationFn: api.fundWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["twin"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  if (wallet.isPending) return <Spinner />;
  if (wallet.isError) return <ErrorBanner message={errorMessage(wallet.error)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <WalletIcon className="size-6" /> My wallet
      </h1>

      <Card className="space-y-3 bg-emerald-700 p-5 text-white">
        <p className="text-sm text-emerald-100">Available balance (demo money)</p>
        <p className="text-3xl font-semibold tabular-nums">{formatKobo(wallet.data.balanceKobo)}</p>
        <div className="flex flex-wrap gap-2">
          {[1_000, 10_000, 50_000].map((naira) => (
            <Button
              key={naira}
              variant="secondary"
              className="px-3 py-1.5"
              loading={fund.isPending && fund.variables === nairaToKobo(naira)}
              onClick={() => fund.mutate(nairaToKobo(naira))}
            >
              <PiggyBank className="size-4" /> Add ₦{naira.toLocaleString()}
            </Button>
          ))}
        </div>
        {fund.isError && <p className="text-sm text-amber-200">{errorMessage(fund.error)}</p>}
      </Card>

      {role === "CONSUMER" && twin.data?.escrow && (
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-stone-900">
            <ShieldCheck className="size-4 text-emerald-700" /> Your activity snapshot
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-stone-500">In escrow</p>
              <p className="font-semibold tabular-nums">{formatKobo(twin.data.escrow.inEscrowKobo ?? 0)}</p>
              <p className="text-xs text-stone-500">{twin.data.escrow.heldOrders ?? 0} order(s) held</p>
            </div>
            <div>
              <p className="text-stone-500">Orders</p>
              <p className="font-semibold tabular-nums">{twin.data.ordersCount ?? 0}</p>
            </div>
            <div>
              <p className="text-stone-500">Total spent</p>
              <p className="font-semibold tabular-nums">{formatKobo(twin.data.totalSpentKobo ?? 0)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-stone-500">
                <MapPin className="size-3.5" /> Area
              </p>
              <p className="font-semibold">
                {prefs.label} · {(prefs.radiusMeters / 1000).toFixed(0)} km
              </p>
              <p className="flex items-center gap-1 text-xs text-stone-500">
                <ShoppingBag className="size-3.5" /> {cartLines} item(s) in cart
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-500">
            This is the state the assistant uses about you: where you shop, what's in your cart and what your money is
            doing. Escrow is released to the shop when your order is fulfilled.
          </p>
        </Card>
      )}

      {role === "MERCHANT" && summary.data && (
        <Card className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-stone-500">In escrow</p>
            <p className="font-semibold tabular-nums">{formatKobo(summary.data.inEscrowKobo ?? 0)}</p>
          </div>
          <div>
            <p className="text-stone-500">Earned (gross)</p>
            <p className="font-semibold tabular-nums">{formatKobo(summary.data.releasedGrossKobo ?? 0)}</p>
          </div>
          <div>
            <p className="text-stone-500">Commission (5%)</p>
            <p className="font-semibold tabular-nums">{formatKobo(summary.data.commissionKobo ?? 0)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-stone-500">
              <Landmark className="size-3.5" /> Paid out
            </p>
            <p className="font-semibold tabular-nums">{formatKobo(summary.data.paidOutKobo ?? 0)}</p>
          </div>
        </Card>
      )}

      <Card className="divide-y divide-stone-100">
        <p className="p-4 font-semibold text-stone-900">Transactions</p>
        {transactions.isPending && <Spinner />}
        {transactions.data?.length === 0 && <p className="p-4 text-sm text-stone-500">No transactions yet.</p>}
        {transactions.data?.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-stone-800">{txLabel(tx.type)}</p>
              <p className="text-xs text-stone-500">{formatDateTime(tx.createdAt)}</p>
            </div>
            <Badge tone={tx.amountKobo >= 0 ? "green" : "amber"}>
              <span className="tabular-nums">
                {tx.amountKobo >= 0 ? "+" : "−"}
                {formatKobo(Math.abs(tx.amountKobo))}
              </span>
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

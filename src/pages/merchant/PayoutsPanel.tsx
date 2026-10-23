import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo, nairaToKobo } from "@/lib/format";
import { Button, Card, ErrorBanner, Input, Spinner } from "@/components/ui";

export function PayoutsPanel() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const summary = useQuery({ queryKey: ["payments", "merchantSummary"], queryFn: api.merchantPayments });

  const payout = useMutation({
    mutationFn: api.requestPayout,
    onSuccess: () => {
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });

  if (summary.isPending) return <Spinner />;
  if (summary.isError) return <ErrorBanner message={errorMessage(summary.error)} />;
  const s = summary.data;
  const balanceNaira = s.walletBalanceKobo / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Available in wallet", s.walletBalanceKobo],
          ["Held in escrow", s.inEscrowKobo],
          ["Earned (gross)", s.releasedGrossKobo],
          ["Paid out", s.paidOutKobo],
        ].map(([label, kobo]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{formatKobo(kobo as number)}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-stone-600">
        Escrow releases to your wallet (minus the 5% platform commission, so far {formatKobo(s.commissionKobo)}) when
        you mark an order fulfilled. Payouts below are simulated to your demo bank account.
      </p>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <label className="block flex-1 space-y-1.5 sm:max-w-xs">
          <span className="text-sm font-medium text-stone-700">Payout amount (₦)</span>
          <Input
            type="number"
            min={1}
            max={balanceNaira}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={balanceNaira.toLocaleString()}
          />
        </label>
        <Button variant="secondary" onClick={() => setAmount(String(balanceNaira))} disabled={balanceNaira <= 0}>
          Max
        </Button>
        <Button
          loading={payout.isPending}
          disabled={!amount || Number(amount) <= 0 || nairaToKobo(Number(amount)) > s.walletBalanceKobo}
          onClick={() => payout.mutate(nairaToKobo(Number(amount)))}
        >
          <Landmark className="size-4" /> Request payout
        </Button>
        {payout.isError && <ErrorBanner message={errorMessage(payout.error)} />}
        {payout.isSuccess && <p className="text-sm text-emerald-800">Payout sent (simulated).</p>}
      </Card>

      <Card className="divide-y divide-stone-100">
        <p className="p-4 font-semibold text-stone-900">Payout history</p>
        {s.payouts.length === 0 && <p className="p-4 text-sm text-stone-500">No payouts yet.</p>}
        {s.payouts.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-stone-800">{formatKobo(p.amountKobo)}</p>
              <p className="text-xs text-stone-500">
                {formatDateTime(p.createdAt)} · {p.bankLabel}
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-800">{p.status.replaceAll("_", " ")}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

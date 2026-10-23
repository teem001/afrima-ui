import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FlaskConical, Lightbulb, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatKobo } from "@/lib/format";
import { Badge, Button, Card, ErrorBanner, Input, Spinner } from "@/components/ui";

export function TwinPanel({ storeId }: { storeId: string }) {
  const twin = useQuery({ queryKey: ["twin", "shop", storeId], queryFn: () => api.shopTwin(storeId) });
  const [productId, setProductId] = useState("");
  const [restockQty, setRestockQty] = useState("50");
  const [priceChange, setPriceChange] = useState("0");

  const simulate = useMutation({ mutationFn: api.simulate });

  if (twin.isPending) return <Spinner />;
  if (twin.isError) return <ErrorBanner message={errorMessage(twin.error)} />;
  const t = twin.data;
  const activeProduct = productId || t.stock[0]?.productId || "";

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700">
          <Store className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-stone-900">
            {t.storeName} <span className="font-normal text-stone-500">— digital twin</span>
          </p>
          <p className="text-sm text-stone-600">
            {t.address} · {t.openNow ? "Open now" : "Closed now"} · in escrow {formatKobo(t.money.inEscrowKobo)} ·
            available {formatKobo(t.money.walletBalanceKobo)}
          </p>
        </div>
        <Badge tone="blue" >Live mirror</Badge>
      </Card>

      {t.suggestions.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-stone-900">
            <Lightbulb className="size-4 text-amber-600" /> Twin suggestions
          </p>
          {t.suggestions.map((s, i) => (
            <p key={i} className="text-sm text-stone-700">
              <Badge tone={s.type === "PAYOUT" ? "green" : s.type === "ESCROW" ? "blue" : "amber"}>{s.type}</Badge>{" "}
              {s.message}
            </p>
          ))}
          <p className="text-xs text-stone-500">Suggestions only — the twin never changes stock, prices or money by itself.</p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">On shelf</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Sold (7d)</th>
              <th className="px-4 py-3 font-medium">Stock-out in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {t.stock.map((item) => (
              <tr key={item.productId} className={item.lowStock ? "bg-amber-50/50" : undefined}>
                <td className="px-4 py-3 font-medium text-stone-800">{item.productName}</td>
                <td className="px-4 py-3 tabular-nums">
                  {item.quantity} {item.lowStock && <Badge tone="amber">Low</Badge>}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatKobo(item.unitPriceKobo)}</td>
                <td className="px-4 py-3 tabular-nums">{item.unitsSold7d}</td>
                <td className="px-4 py-3 tabular-nums">
                  {item.daysToStockout === null ? "—" : `~${Math.floor(item.daysToStockout)} day(s)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 font-semibold text-stone-900">
          <FlaskConical className="size-4 text-sky-700" /> What-if simulation
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Product</span>
            <select
              value={activeProduct}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {t.stock.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.productName}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-32 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Restock qty</span>
            <Input type="number" min={0} value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
          </label>
          <label className="block w-36 space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Price change %</span>
            <Input type="number" value={priceChange} onChange={(e) => setPriceChange(e.target.value)} />
          </label>
          <Button
            loading={simulate.isPending}
            disabled={!activeProduct}
            onClick={() =>
              simulate.mutate({
                storeId,
                productId: activeProduct,
                restockQty: Number(restockQty) || 0,
                priceChangePercent: Number(priceChange) || 0,
              })
            }
          >
            Run simulation
          </Button>
        </div>
        {simulate.isError && <ErrorBanner message={errorMessage(simulate.error)} />}
        {simulate.data && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-stone-500">Stock-out now</p>
              <p className="font-semibold">
                {simulate.data.daysToStockoutNow === null ? "—" : `~${Math.floor(simulate.data.daysToStockoutNow)} day(s)`}
              </p>
            </div>
            <div>
              <p className="text-stone-500">After restock</p>
              <p className="font-semibold">
                {simulate.data.daysToStockoutAfterRestock === null
                  ? "—"
                  : `~${Math.floor(simulate.data.daysToStockoutAfterRestock)} day(s)`}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Revenue next 7d</p>
              <p className="font-semibold tabular-nums">{formatKobo(simulate.data.projectedRevenue7dKobo)}</p>
            </div>
            <div>
              <p className="text-stone-500">At simulated price ({formatKobo(simulate.data.simulatedPriceKobo)})</p>
              <p className="font-semibold tabular-nums">{formatKobo(simulate.data.simulatedRevenue7dKobo)}</p>
            </div>
            <p className="col-span-full text-xs text-stone-500">{simulate.data.note}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

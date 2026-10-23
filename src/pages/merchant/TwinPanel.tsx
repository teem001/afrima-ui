import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Lightbulb, PackagePlus, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatKobo } from "@/lib/format";
import type { StockTwin } from "@/lib/types";
import { MediaThumb } from "@/components/MediaThumb";
import { Badge, Button, Card, ErrorBanner, Input, Spinner } from "@/components/ui";

function suggestedAdd(item: StockTwin): number {
  return Math.max(10, Math.round(item.velocityPerDay * 14) - item.quantity);
}

export function TwinPanel({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();
  const twin = useQuery({ queryKey: ["twin", "shop", storeId], queryFn: () => api.shopTwin(storeId) });
  const [productId, setProductId] = useState("");
  const [restockQty, setRestockQty] = useState("50");
  const [priceChange, setPriceChange] = useState("0");
  const [addByProduct, setAddByProduct] = useState<Record<string, string>>({});
  const [restockError, setRestockError] = useState<string | null>(null);

  const simulate = useMutation({ mutationFn: api.simulate });
  const restock = useMutation({
    mutationFn: (body: { productId: string; addQuantity: number }) => api.restockInventory(storeId, body),
    onSuccess: () => {
      setRestockError(null);
      queryClient.invalidateQueries({ queryKey: ["twin"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", storeId] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (err) => setRestockError(errorMessage(err)),
  });

  if (twin.isPending) return <Spinner />;
  if (twin.isError) return <ErrorBanner message={errorMessage(twin.error)} />;
  const t = twin.data;
  const activeProduct = productId || t.stock[0]?.productId || "";
  const needsRestock = t.stock.filter((item) => item.lowStock || item.quantity === 0);

  const doRestock = (pid: string, qty: number) => {
    if (!Number.isInteger(qty) || qty < 1) {
      setRestockError("Enter how many units to add (at least 1)");
      return;
    }
    restock.mutate({ productId: pid, addQuantity: qty });
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-sky-50 text-sky-700">
          {t.imageUrl ? <MediaThumb url={t.imageUrl} /> : <Store className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900">{t.storeName}</p>
          <p className="text-sm text-stone-600">
            Live view of what you have on the shelf — same stock, prices and money as your physical shop.
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {t.address} · {t.openNow ? "Open now" : "Closed now"} · in escrow {formatKobo(t.money.inEscrowKobo)} ·
            available {formatKobo(t.money.walletBalanceKobo)}
          </p>
        </div>
        <Badge tone="blue">Live shelf</Badge>
      </Card>

      {needsRestock.length > 0 && (
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-stone-900">
            <PackagePlus className="size-4 text-amber-700" /> Restock low / out-of-stock items
          </p>
          <p className="text-sm text-stone-600">Adds units onto your real shelf — customers can buy them right away.</p>
          {restockError && <ErrorBanner message={restockError} />}
          <ul className="space-y-3">
            {needsRestock.map((item) => {
              const draft = addByProduct[item.productId] ?? String(suggestedAdd(item));
              const qty = Number(draft);
              return (
                <li key={item.productId} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50/60 px-3 py-2">
                  <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
                    <MediaThumb url={item.imageUrl} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{item.productName}</p>
                    <p className="text-xs text-stone-600">
                      Now {item.quantity}
                      {item.quantity === 0 ? (
                        <Badge tone="red">Out</Badge>
                      ) : (
                        <Badge tone="amber">Low</Badge>
                      )}{" "}
                      · {formatKobo(item.unitPriceKobo)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-stone-600">Add</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      value={draft}
                      onChange={(e) => setAddByProduct((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                    />
                  </label>
                  <Button
                    className="px-3 py-1.5"
                    loading={restock.isPending && restock.variables?.productId === item.productId}
                    onClick={() => doRestock(item.productId, qty)}
                  >
                    Restock
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {t.suggestions.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-stone-900">
            <Lightbulb className="size-4 text-amber-600" /> Suggestions for your shop
          </p>
          {t.suggestions.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
              <Badge tone={s.type === "PAYOUT" ? "green" : s.type === "ESCROW" ? "blue" : "amber"}>{s.type}</Badge>
              <span className="min-w-0 flex-1">{s.message}</span>
              {s.type === "RESTOCK" && s.productId && s.suggestedQty != null && (
                <Button
                  variant="secondary"
                  className="px-3 py-1"
                  loading={restock.isPending && restock.variables?.productId === s.productId}
                  onClick={() => doRestock(s.productId!, s.suggestedQty!)}
                >
                  Restock +{s.suggestedQty}
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
              <th className="px-4 py-3 font-medium">On the shelf</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Sold (7d)</th>
              <th className="px-4 py-3 font-medium">Stock-out in</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {t.stock.map((item) => {
              const needs = item.lowStock || item.quantity === 0;
              return (
                <tr key={item.productId} className={needs ? "bg-amber-50/50" : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        <MediaThumb url={item.imageUrl} />
                      </span>
                      <span className="font-medium text-stone-800">{item.productName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.quantity}{" "}
                    {item.quantity === 0 ? (
                      <Badge tone="red">Out</Badge>
                    ) : item.lowStock ? (
                      <Badge tone="amber">Low</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatKobo(item.unitPriceKobo)}</td>
                  <td className="px-4 py-3 tabular-nums">{item.unitsSold7d}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.daysToStockout === null ? "—" : `~${Math.floor(item.daysToStockout)} day(s)`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {needs && (
                      <Button
                        variant="secondary"
                        className="px-3 py-1.5"
                        loading={restock.isPending && restock.variables?.productId === item.productId}
                        onClick={() => doRestock(item.productId, suggestedAdd(item))}
                      >
                        Restock +{suggestedAdd(item)}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="flex items-center gap-1.5 font-semibold text-stone-900">
          <FlaskConical className="size-4 text-sky-700" /> What-if (does not change the real shelf)
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

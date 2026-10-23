import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, PackagePlus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatKobo, nairaToKobo } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import type { InventoryItem, Product } from "@/lib/types";
import { MediaThumb } from "@/components/MediaThumb";
import { Badge, Button, Card, ErrorBanner, Input, Spinner } from "@/components/ui";
import { CreateProductForm } from "@/pages/merchant/CreateProductForm";

function InventoryRow({ storeId, product, item }: { storeId: string; product: Product; item?: InventoryItem }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0));
  const [price, setPrice] = useState(item ? String(item.unitPriceKobo / 100) : "");
  const [addQty, setAddQty] = useState("20");
  const [saved, setSaved] = useState(false);

  const refresh = (updated: InventoryItem) => {
    queryClient.setQueryData<InventoryItem[]>(["inventory", storeId], (prev = []) => [
      ...prev.filter((i) => i.productId !== updated.productId),
      updated,
    ]);
    setQuantity(String(updated.quantity));
    setPrice(String(updated.unitPriceKobo / 100));
    queryClient.invalidateQueries({ queryKey: ["search"] });
    queryClient.invalidateQueries({ queryKey: ["twin"] });
  };

  const save = useMutation({
    mutationFn: () =>
      api.upsertInventory(storeId, {
        productId: product.id,
        quantity: Number(quantity),
        unitPriceKobo: nairaToKobo(Number(price)),
      }),
    onSuccess: (updated) => {
      refresh(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const restock = useMutation({
    mutationFn: () =>
      api.restockInventory(storeId, {
        productId: product.id,
        addQuantity: Number(addQty),
        unitPriceKobo: item ? undefined : nairaToKobo(Number(price) || 0),
      }),
    onSuccess: refresh,
  });

  const qty = Number(quantity);
  const priceValid = price !== "" && Number(price) >= 0;
  const dirty = !item || qty !== item.quantity || nairaToKobo(Number(price)) !== item.unitPriceKobo;
  const needsRestock = !!item && item.quantity <= 5;
  const addValid = Number.isInteger(Number(addQty)) && Number(addQty) >= 1;

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200">
            <MediaThumb url={product.imageUrl} />
          </span>
          <div>
            <p className="font-medium text-stone-900">{product.name}</p>
            <p className="font-mono text-xs text-stone-500">{product.sku}</p>
            {(save.isError || restock.isError) && (
              <p className="mt-1 text-xs text-red-600">{errorMessage(save.error ?? restock.error)}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {!item ? (
          <Badge>Not stocked</Badge>
        ) : item.quantity === 0 ? (
          <Badge tone="red">Out of stock</Badge>
        ) : item.quantity <= 5 ? (
          <Badge tone="amber">Low · {item.quantity}</Badge>
        ) : (
          <Badge tone="green">{item.quantity} in stock</Badge>
        )}
        {item && <p className="mt-1 text-xs text-stone-500">{formatKobo(item.unitPriceKobo)}</p>}
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24"
          aria-label={`${product.name} quantity`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="relative w-32">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400">₦</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            placeholder="0.00"
            onChange={(e) => setPrice(e.target.value)}
            className="pl-7"
            aria-label={`${product.name} price in naira`}
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-2">
          <Button
            variant={dirty ? "primary" : "secondary"}
            className="px-3 py-1.5"
            disabled={!dirty || !priceValid || !Number.isInteger(qty) || qty < 0}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {saved ? <Check className="size-4" /> : null}
            {saved ? "Saved" : item ? "Update" : "Stock"}
          </Button>
          {needsRestock && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="w-20"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                aria-label={`Add units of ${product.name}`}
              />
              <Button
                variant="secondary"
                className="px-3 py-1.5"
                disabled={!addValid}
                loading={restock.isPending}
                onClick={() => restock.mutate()}
              >
                <PackagePlus className="size-4" /> Restock
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function InventoryTable({ storeId }: { storeId: string }) {
  const { products } = useLookups();
  const inventory = useQuery({ queryKey: ["inventory", storeId], queryFn: () => api.inventory(storeId) });

  if (inventory.isPending) return <Spinner />;
  if (inventory.isError) return <ErrorBanner message={errorMessage(inventory.error)} />;

  const byProduct = new Map(inventory.data.map((i) => [i.productId, i]));
  const sorted = [...products].sort((a, b) => Number(byProduct.has(b.id)) - Number(byProduct.has(a.id)));

  return (
    <div className="space-y-4">
      <CreateProductForm storeId={storeId} />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs font-medium tracking-wide text-stone-500 uppercase">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((product) => (
              <InventoryRow
                key={`${storeId}:${product.id}:${byProduct.get(product.id)?.id ?? "new"}`}
                storeId={storeId}
                product={product}
                item={byProduct.get(product.id)}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

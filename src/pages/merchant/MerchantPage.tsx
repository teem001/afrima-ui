import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ClipboardList, Landmark, ScanEye, Settings2, Sparkles, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { AssistantPanel } from "@/components/AssistantPanel";
import { MediaThumb } from "@/components/MediaThumb";
import { Badge, ErrorBanner, Spinner } from "@/components/ui";
import { MerchantOrders } from "@/pages/merchant/MerchantOrders";
import { InventoryTable } from "@/pages/merchant/InventoryTable";
import { PayoutsPanel } from "@/pages/merchant/PayoutsPanel";
import { TwinPanel } from "@/pages/merchant/TwinPanel";
import { StoreForm } from "@/pages/merchant/StoreForm";

type Tab = "orders" | "inventory" | "payouts" | "shelf" | "shop" | "assistant";

export function MerchantPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const stores = useQuery({ queryKey: ["stores", "mine"], queryFn: api.myStores });
  const [storeId, setStoreId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (stores.isPending) return <Spinner />;
  if (stores.isError) return <ErrorBanner message={errorMessage(stores.error)} />;

  if (stores.data.length === 0 || creating) {
    return (
      <div className="space-y-4">
        {stores.data.length > 0 && (
          <button type="button" className="text-sm text-stone-600 underline" onClick={() => setCreating(false)}>
            Back to my shop
          </button>
        )}
        <StoreForm
          onDone={() => {
            setCreating(false);
            setTab("inventory");
          }}
        />
      </div>
    );
  }

  const active = stores.data.find((s) => s.id === storeId) ?? stores.data[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
            {active.imageUrl ? (
              <MediaThumb url={active.imageUrl} />
            ) : (
              <span className="grid size-full place-items-center text-stone-400">
                <Store className="size-6" />
              </span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{active.name}</h1>
              {active.openNow ? <Badge tone="green">Open now</Badge> : <Badge>Closed</Badge>}
              {active.category && <Badge tone="blue">{active.category}</Badge>}
            </div>
            <p className="text-sm text-stone-600">
              {active.address} · {formatTime(active.openAt)} – {formatTime(active.closeAt)}
              {active.phone ? ` · ${active.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stores.data.length > 1 && (
            <select
              value={active.id}
              onChange={(e) => setStoreId(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {stores.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            + Another shop
          </button>
        </div>
      </div>

      <div className="inline-flex flex-wrap rounded-xl bg-stone-200/60 p-1">
        {(
          [
            ["orders", "Orders", ClipboardList],
            ["inventory", "Inventory", Boxes],
            ["payouts", "Payouts", Landmark],
            ["shelf", "On the shelf", ScanEye],
            ["shop", "Shop details", Settings2],
            ["assistant", "Assistant", Sparkles],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "orders" && <MerchantOrders storeId={active.id} />}
      {tab === "inventory" && <InventoryTable storeId={active.id} />}
      {tab === "payouts" && <PayoutsPanel />}
      {tab === "shelf" && <TwinPanel storeId={active.id} />}
      {tab === "shop" && (
        <StoreForm
          existing={active}
          onDone={() => {
            /* stays on shop tab; query refresh updates header */
          }}
        />
      )}
      <div className={tab === "assistant" ? "max-w-2xl" : "hidden"}>
        <AssistantPanel
          screen="merchant"
          storeName={active.name}
          title="Shop assistant"
          suggestions={["What's running low?", "Any new orders?", "What's in my wallet?"]}
        />
      </div>
    </div>
  );
}

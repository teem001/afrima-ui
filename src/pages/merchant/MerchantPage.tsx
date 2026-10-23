import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ClipboardList, Landmark, ScanEye, Sparkles, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { AssistantPanel } from "@/components/AssistantPanel";
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { MerchantOrders } from "@/pages/merchant/MerchantOrders";
import { InventoryTable } from "@/pages/merchant/InventoryTable";
import { PayoutsPanel } from "@/pages/merchant/PayoutsPanel";
import { TwinPanel } from "@/pages/merchant/TwinPanel";

type Tab = "orders" | "inventory" | "payouts" | "twin" | "assistant";

export function MerchantPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const stores = useQuery({ queryKey: ["stores", "mine"], queryFn: api.myStores });
  const [storeId, setStoreId] = useState<string | null>(null);

  if (stores.isPending) return <Spinner />;
  if (stores.isError) return <ErrorBanner message={errorMessage(stores.error)} />;
  if (stores.data.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Store className="size-10" />} title="No shop yet">
          Your merchant account doesn't have a shop on AfriSmart. Ask the AfriSmart team to onboard your store.
        </EmptyState>
      </Card>
    );
  }

  const active = stores.data.find((s) => s.id === storeId) ?? stores.data[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{active.name}</h1>
            {active.openNow ? <Badge tone="green">Open now</Badge> : <Badge>Closed</Badge>}
          </div>
          <p className="text-sm text-stone-600">
            {active.address} · {formatTime(active.openAt)} – {formatTime(active.closeAt)}
          </p>
        </div>
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
      </div>

      <div className="inline-flex rounded-xl bg-stone-200/60 p-1">
        {(
          [
            ["orders", "Orders", ClipboardList],
            ["inventory", "Inventory", Boxes],
            ["payouts", "Payouts", Landmark],
            ["twin", "Twin", ScanEye],
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
      {tab === "twin" && <TwinPanel storeId={active.id} />}
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

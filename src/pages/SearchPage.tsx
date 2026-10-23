import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, PackageSearch, Plus, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDistance, formatKobo } from "@/lib/format";
import type { NearbyOffer } from "@/lib/types";
import { useCart } from "@/store/cart";
import { useSearchPrefs } from "@/store/searchPrefs";
import { AssistantPanel } from "@/components/AssistantPanel";
import { Cart } from "@/components/Cart";
import { LocationPicker } from "@/components/LocationPicker";
import { MediaThumb } from "@/components/MediaThumb";
import { OfferMap } from "@/components/OfferMap";
import { Badge, Button, Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

const SUGGESTIONS = ["pack of pens", "rice", "sachet water", "exercise book"];

function OfferCard({
  offer,
  nearest,
  cheapest,
  selected,
  onSelect,
}: {
  offer: NearbyOffer;
  nearest: boolean;
  cheapest: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const cart = useCart();
  const line =
    cart.store?.storeId === offer.storeId ? cart.lines.find((l) => l.productId === offer.productId) : undefined;
  const inCart = !!line;
  const atCap = !!line && line.quantity >= offer.quantity;

  const addToCart = () => {
    if (cart.store && cart.store.storeId !== offer.storeId && cart.lines.length > 0) {
      const ok = window.confirm(
        `Your cart has items from ${cart.store.storeName}. Orders go to one shop at a time — start a new cart with ${offer.storeName}?`,
      );
      if (!ok) return;
    }
    cart.add(offer);
  };

  const media = offer.productImageUrl ?? offer.storeImageUrl;

  return (
    <Card
      className={`p-4 transition-shadow ${selected ? "ring-2 ring-emerald-600" : "hover:shadow-md"}`}
    >
      <div className="flex items-start gap-4" onMouseEnter={onSelect}>
        <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
          <MediaThumb url={media} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {nearest && <Badge tone="blue">Nearest</Badge>}
            {cheapest && <Badge tone="green">Best price</Badge>}
            {offer.openNow ? (
              <Badge tone="green">Open now</Badge>
            ) : (
              <Badge tone="stone">
                <Clock className="size-3" /> Closed now
              </Badge>
            )}
          </div>
          <p className="font-semibold text-stone-900">{offer.storeName}</p>
          <p className="text-sm text-stone-600">{offer.productName}</p>
          <p className="text-xs text-stone-500">
            {offer.address} · {formatDistance(offer.distanceMeters)} away
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-lg font-semibold tabular-nums">{formatKobo(offer.unitPriceKobo)}</p>
          <p className={`text-xs ${offer.quantity <= 5 ? "font-medium text-amber-700" : "text-stone-500"}`}>
            {offer.quantity <= 5 ? `Only ${offer.quantity} left` : `${offer.quantity} in stock`}
          </p>
          <Button
            variant={inCart ? "secondary" : "primary"}
            className="px-3 py-1.5"
            onClick={addToCart}
            disabled={atCap}
            title={atCap ? "You have all the shop's stock in your cart" : undefined}
          >
            {inCart ? <Check className="size-4" /> : <Plus className="size-4" />}
            {atCap ? "All in cart" : inCart ? "Add another" : "Add"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(q);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<{ query: string; nonce: number } | null>(null);
  const [aiOffers, setAiOffers] = useState<NearbyOffer[]>([]);
  const { lat, lng, radiusMeters, label } = useSearchPrefs();

  const search = useQuery({
    queryKey: ["search", q, lat, lng, radiusMeters],
    queryFn: () => api.search({ q, lat, lng, radiusMeters }),
    enabled: q.length >= 2,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    setParams(value ? { q: value } : {});
    if (value) askAssistant(value);
  };

  const runSuggestion = (s: string) => {
    setDraft(s);
    setParams({ q: s });
    askAssistant(s);
  };

  const askAssistant = (query: string) => setAiRequest((prev) => ({ query, nonce: (prev?.nonce ?? 0) + 1 }));

  const offers = search.data?.offers ?? [];
  const showAiOffers = !!search.data && offers.length === 0 && aiOffers.length > 0;
  const mapOffers = showAiOffers ? aiOffers : offers;
  const cheapestKobo = search.data?.minPriceKobo ?? null;
  const nearestKey = offers[0] ? `${offers[0].storeId}:${offers[0].productId}` : null;

  const summary = useMemo(() => {
    if (!search.data || offers.length === 0) return null;
    const stores = new Set(offers.map((o) => o.storeId)).size;
    const range =
      search.data.minPriceKobo === search.data.maxPriceKobo
        ? formatKobo(search.data.minPriceKobo!)
        : `${formatKobo(search.data.minPriceKobo!)} – ${formatKobo(search.data.maxPriceKobo!)}`;
    return `${offers.length} offer${offers.length === 1 ? "" : "s"} from ${stores} shop${stores === 1 ? "" : "s"} · ${range}`;
  }, [search.data, offers]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Find it nearby, in stock.
          </h1>
          <p className="text-stone-600">Compare prices across Lagos shops and order from the closest one that has it.</p>
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What do you need? e.g. pack of pens"
              className="w-full rounded-xl border border-stone-300 bg-white py-3 pr-3 pl-10 text-base shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
            />
          </div>
          <Button type="submit" className="rounded-xl px-5" disabled={draft.trim().length < 2}>
            Search
          </Button>
        </form>
        <LocationPicker />
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => runSuggestion(s)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <AssistantPanel
            screen="search"
            searchRequest={aiRequest}
            onOffers={setAiOffers}
            suggestions={["Cheapest rice near me?", "Which shop is open now with sachet water?"]}
          />
          {!q && (
            <Card>
              <EmptyState icon={<PackageSearch className="size-10" />} title="Search for something you need">
                We'll list shops within {formatDistance(radiusMeters)} of {label} that have it in stock, nearest first.
              </EmptyState>
            </Card>
          )}
          {q && search.isFetching && !search.data && <Spinner label="Searching nearby shops…" />}
          {search.isError && <ErrorBanner message={errorMessage(search.error)} />}
          {summary && <p className="text-sm text-stone-600">{summary}</p>}
          {search.data && offers.length === 0 && !showAiOffers && (
            <Card>
              <EmptyState icon={<PackageSearch className="size-10" />} title={`No shops near ${label} have “${q}” in stock`}>
                Try a wider radius or a different name for the item.
              </EmptyState>
            </Card>
          )}
          {showAiOffers && (
            <>
              <p className="text-sm text-stone-600">
                No exact match for “{q}”, but the assistant found these:
              </p>
              {aiOffers.map((offer) => (
                <OfferCard
                  key={`ai:${offer.storeId}:${offer.productId}`}
                  offer={offer}
                  nearest={false}
                  cheapest={false}
                  selected={offer.storeId === selectedStoreId}
                  onSelect={() => setSelectedStoreId(offer.storeId)}
                />
              ))}
            </>
          )}
          {offers.map((offer) => (
            <OfferCard
              key={`${offer.storeId}:${offer.productId}`}
              offer={offer}
              nearest={`${offer.storeId}:${offer.productId}` === nearestKey && offers.length > 1}
              cheapest={offer.unitPriceKobo === cheapestKobo && offers.length > 1}
              selected={offer.storeId === selectedStoreId}
              onSelect={() => setSelectedStoreId(offer.storeId)}
            />
          ))}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="h-72 overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
            <OfferMap
              center={{ lat, lng }}
              radiusMeters={radiusMeters}
              offers={mapOffers}
              selectedStoreId={selectedStoreId}
              onSelectStore={setSelectedStoreId}
            />
          </div>
          <Cart />
        </aside>
      </div>
    </div>
  );
}

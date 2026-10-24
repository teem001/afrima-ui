import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Clock, PackageSearch, Plus, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDistance, formatKobo } from "@/lib/format";
import type { NearbyOffer } from "@/lib/types";
import { useCart } from "@/store/cart";
import { hasSearchLocation, useSearchPrefs } from "@/store/searchPrefs";
import { AssistantPanel } from "@/components/AssistantPanel";
import { Cart } from "@/components/Cart";
import { LocationPicker } from "@/components/LocationPicker";
import { MediaThumb } from "@/components/MediaThumb";
import { OfferMap } from "@/components/OfferMap";
import { Badge, Button, Card, EmptyState, ErrorBanner, Spinner } from "@/components/ui";

const SUGGESTIONS = ["pack of pens", "rice", "sachet water", "exercise book"];
const PAGE_SIZE = 20;

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
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<{ query: string; nonce: number } | null>(null);
  const [aiOffers, setAiOffers] = useState<NearbyOffer[]>([]);
  const { lat, lng, radiusMeters, label } = useSearchPrefs();
  const locationReady = hasSearchLocation(lat, lng);

  const search = useQuery({
    queryKey: ["search", q, lat, lng, page, PAGE_SIZE],
    queryFn: () =>
      api.search({
        q,
        lat: lat!,
        lng: lng!,
        page,
        pageSize: PAGE_SIZE,
        // No radius: any in-stock match from any store, nearest first.
      }),
    enabled: locationReady && q.length >= 2,
  });

  const setSearchParams = (next: { q?: string; page?: number }) => {
    const value = (next.q ?? q).trim();
    const nextPage = next.page ?? 1;
    const sp: Record<string, string> = {};
    if (value) sp.q = value;
    if (value && nextPage > 1) sp.page = String(nextPage);
    setParams(sp);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    setSearchParams({ q: value, page: 1 });
    if (value) askAssistant(value);
  };

  const runSuggestion = (s: string) => {
    setDraft(s);
    setSearchParams({ q: s, page: 1 });
    askAssistant(s);
  };

  const askAssistant = (query: string) => setAiRequest((prev) => ({ query, nonce: (prev?.nonce ?? 0) + 1 }));

  const offers = search.data?.offers ?? [];
  const totalCount = search.data?.totalCount ?? 0;
  const totalPages = search.data?.totalPages ?? 1;
  const showAiOffers = !!search.data && totalCount === 0 && aiOffers.length > 0;
  const mapOffers = showAiOffers ? aiOffers : offers;
  const cheapestKobo = search.data?.minPriceKobo ?? null;
  const nearestKey = page === 1 && offers[0] ? `${offers[0].storeId}:${offers[0].productId}` : null;

  const summary = useMemo(() => {
    if (!search.data || totalCount === 0) return null;
    const range =
      search.data.minPriceKobo === search.data.maxPriceKobo
        ? formatKobo(search.data.minPriceKobo!)
        : `${formatKobo(search.data.minPriceKobo!)} – ${formatKobo(search.data.maxPriceKobo!)}`;
    const from = (search.data.page - 1) * search.data.pageSize + 1;
    const to = from + offers.length - 1;
    return `${totalCount} in-stock offer${totalCount === 1 ? "" : "s"} from any shop · ${range} · showing ${from}–${to}`;
  }, [search.data, offers.length, totalCount]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Find it in stock, anywhere.
          </h1>
          <p className="text-stone-600">
            Set your location, then we list every shop that has the item — nearest first — so you can compare and order.
          </p>
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
            suggestions={[
              "Order the cheapest rice for me",
              "Which shop is open now with sachet water?",
              "Add ₦5,000 to my wallet",
            ]}
          />
          {!locationReady && (
            <Card>
              <EmptyState icon={<PackageSearch className="size-10" />} title="Set your location first">
                Type any place above (or use GPS) so we can sort shops by distance.
              </EmptyState>
            </Card>
          )}
          {locationReady && !q && (
            <Card>
              <EmptyState icon={<PackageSearch className="size-10" />} title="Search for something you need">
                We'll list every shop that has it in stock, nearest to {label} first.
              </EmptyState>
            </Card>
          )}
          {locationReady && q && search.isFetching && !search.data && <Spinner label="Searching all shops…" />}
          {search.isError && <ErrorBanner message={errorMessage(search.error)} />}
          {summary && <p className="text-sm text-stone-600">{summary}</p>}
          {search.data && totalCount === 0 && !showAiOffers && (
            <Card>
              <EmptyState icon={<PackageSearch className="size-10" />} title={`No shop has “${q}” in stock`}>
                Try a different name for the item.
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
              nearest={`${offer.storeId}:${offer.productId}` === nearestKey && totalCount > 1}
              cheapest={offer.unitPriceKobo === cheapestKobo && totalCount > 1}
              selected={offer.storeId === selectedStoreId}
              onSelect={() => setSelectedStoreId(offer.storeId)}
            />
          ))}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                className="px-3 py-1.5"
                disabled={page <= 1 || search.isFetching}
                onClick={() => setSearchParams({ page: page - 1 })}
              >
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <p className="text-sm text-stone-600">
                Page {search.data?.page ?? page} of {totalPages}
              </p>
              <Button
                variant="secondary"
                className="px-3 py-1.5"
                disabled={!search.data?.hasMore || search.isFetching}
                onClick={() => setSearchParams({ page: page + 1 })}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="h-72 overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
            {locationReady ? (
              <OfferMap
                center={{ lat: lat as number, lng: lng as number }}
                radiusMeters={radiusMeters}
                offers={mapOffers}
                selectedStoreId={selectedStoreId}
                onSelectStore={setSelectedStoreId}
              />
            ) : (
              <div className="grid h-full place-items-center bg-stone-50 px-6 text-center text-sm text-stone-500">
                Map appears after you set a location
              </div>
            )}
          </div>
          <Cart />
        </aside>
      </div>
    </div>
  );
}

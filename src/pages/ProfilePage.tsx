import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, RefreshCw, Sparkles, Tag } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatKobo } from "@/lib/format";
import { Badge, Button, Card, ErrorBanner, Spinner } from "@/components/ui";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["prefs", "me"], queryFn: api.shopperProfile });
  const refresh = useMutation({
    mutationFn: api.refreshShopperReview,
    onSuccess: (data) => {
      queryClient.setQueryData(["prefs", "me"], data);
    },
  });

  if (profile.isPending) return <Spinner label="Loading your shopping profile…" />;
  if (profile.isError) return <ErrorBanner message={errorMessage(profile.error)} />;

  const p = profile.data;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Brain className="size-6 text-emerald-700" /> Your shopping profile
        </h1>
        <p className="text-stone-600">
          Built from your searches and orders so the assistant can help you faster next time.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-stone-900">
              <Sparkles className="size-4 text-amber-600" /> AI shopper review
            </p>
            <p className="text-sm text-stone-600">A short brief the assistant reads when you chat.</p>
          </div>
          <Button
            variant="secondary"
            className="px-3 py-1.5"
            loading={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className="size-4" /> Refresh review
          </Button>
        </div>
        {refresh.isError && <ErrorBanner message={errorMessage(refresh.error)} />}
        {p.aiReview ? (
          <>
            <p className="text-sm whitespace-pre-wrap text-stone-800">{p.aiReview}</p>
            {p.aiReviewAt && (
              <p className="text-xs text-stone-500">Updated {formatDateTime(p.aiReviewAt)}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-600">
            No review yet — search or order something, then refresh so the assistant can summarise your taste.
          </p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-stone-900">Preferences</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-stone-500">Orders</p>
            <p className="font-semibold">{p.orderCount}</p>
          </div>
          <div>
            <p className="text-stone-500">Typical order</p>
            <p className="font-semibold tabular-nums">
              {p.avgOrderKobo != null ? formatKobo(p.avgOrderKobo) : "—"}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Median price interest</p>
            <p className="font-semibold tabular-nums">
              {p.priceBand.p50Kobo != null ? formatKobo(p.priceBand.p50Kobo) : "—"}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Deal sensitivity</p>
            <p className="font-semibold">{Math.round(p.discountSensitivity * 100)}%</p>
          </div>
          {p.orderFrequencyDays != null && (
            <div>
              <p className="text-stone-500">Order frequency</p>
              <p className="font-semibold">About every {p.orderFrequencyDays} days</p>
            </div>
          )}
        </div>
        {p.topCategories.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
              <Tag className="size-4" /> Favourite categories
            </p>
            <div className="flex flex-wrap gap-2">
              {p.topCategories.map((c) => (
                <Badge key={c.categoryId} tone="green">
                  {c.name ?? "Category"} · {c.count}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {p.topProducts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Frequent products</p>
            <ul className="space-y-1 text-sm text-stone-700">
              {p.topProducts.map((prod) => (
                <li key={prod.productId}>
                  {prod.name ?? prod.productId}{" "}
                  <span className="text-stone-400">×{prod.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.recentSearches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {p.recentSearches.map((s, i) => (
                <Link
                  key={`${s.query}-${i}`}
                  to={`/?q=${encodeURIComponent(s.query)}`}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
                >
                  {s.query}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CircleAlert, Fingerprint, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Badge, Button, Card, ErrorBanner, Spinner } from "@/components/ui";

export function VerifyPage() {
  const [params, setParams] = useSearchParams();
  const fromUrl = (params.get("orderId") || "").trim();
  const [draft, setDraft] = useState(fromUrl);
  const [orderId, setOrderId] = useState(fromUrl);

  useEffect(() => {
    const next = (params.get("orderId") || "").trim();
    setDraft(next);
    setOrderId(next);
  }, [params]);

  const verify = useQuery({
    queryKey: ["verify", orderId],
    queryFn: () => api.verifyOrder(orderId),
    enabled: orderId.length > 0,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = draft.trim();
    setOrderId(id);
    if (id) setParams({ orderId: id });
    else setParams({});
  };

  const data = verify.data;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Fingerprint className="size-6" /> Verify a receipt
        </h1>
        <p className="text-stone-600">
          Every order is sealed with a SHA-256 ledger hash and anchored in a Merkle batch. Paste an order ID to check
          it hasn't been changed.
        </p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Order ID, e.g. 071de973-b106-…"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
        />
        <Button type="submit" disabled={!draft.trim()}>
          <Search className="size-4" /> Verify
        </Button>
      </form>

      {verify.isFetching && <Spinner label="Recomputing hash and checking the anchor…" />}
      {verify.isError && <ErrorBanner message={errorMessage(verify.error)} />}
      {data && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {data.hashMatches ? (
              <Badge tone="green">
                <BadgeCheck className="size-3.5" /> Hash matches the order
              </Badge>
            ) : (
              <Badge tone="red">
                <CircleAlert className="size-3.5" /> Hash does not match — order changed
              </Badge>
            )}
            {data.anchored ? (
              <Badge tone="blue">Anchored {data.proofValid ? "· proof valid" : "· proof invalid"}</Badge>
            ) : (
              <Badge tone="amber">Not anchored yet</Badge>
            )}
          </div>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-stone-500">Ledger hash</dt>
              <dd className="font-mono text-xs break-all">{data.ledgerHash}</dd>
            </div>
            {data.merkleRoot && (
              <div>
                <dt className="text-stone-500">Merkle root (anchor batch)</dt>
                <dd className="font-mono text-xs break-all">{data.merkleRoot}</dd>
              </div>
            )}
            {data.txReference && (
              <div>
                <dt className="text-stone-500">Anchor reference</dt>
                <dd className="font-mono text-xs">
                  {data.txReference} <span className="text-stone-500">({data.anchorStatus?.toLowerCase()} — demo anchor, real chain anchoring plugs into the same record)</span>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}

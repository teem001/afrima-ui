import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, Check, CircleAlert, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatKobo } from "@/lib/format";
import type { AiClientContext, AiProgress, NearbyOffer, ToolExecution } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { useSearchPrefs } from "@/store/searchPrefs";
import { Button, Card } from "@/components/ui";

const TOOL_LABELS: Record<string, string> = {
  SEARCH_PRODUCTS_NEARBY: "Searching nearby shops",
  COMPARE_PRICES: "Comparing prices",
  FIND_ALTERNATIVE_STORES: "Finding other shops",
  GET_STORE_DETAILS: "Checking the shop",
  PLACE_ORDER: "Placing the order",
  GET_MY_ORDERS: "Looking up your orders",
  GET_MY_INVENTORY: "Reading your inventory",
  GET_LOW_STOCK_ITEMS: "Checking what's running low",
  GET_INCOMING_ORDERS: "Checking incoming orders",
  UPDATE_STOCK: "Updating stock",
  GET_MY_WALLET: "Checking your wallet",
};

const toolLabel = (tool: string) => TOOL_LABELS[tool] ?? tool.toLowerCase().replaceAll("_", " ");

interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
  tools?: ToolExecution[];
}

interface Step {
  key: string;
  label: string;
  state: "running" | "done" | "failed";
}

/** Offers the agent looked up, so the page can show them as cards next to (or instead of) keyword results. */
export function offersFromTools(tools: ToolExecution[]): NearbyOffer[] {
  const seen = new Map<string, NearbyOffer>();
  for (const call of tools) {
    if (!call.result.success) continue;
    const data = call.result.data as { offers?: NearbyOffer[]; alternatives?: NearbyOffer[] } | undefined;
    for (const offer of data?.offers ?? data?.alternatives ?? []) {
      seen.set(`${offer.storeId}:${offer.productId}`, offer);
    }
  }
  return [...seen.values()].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function clientContext(screen: string, searchQuery?: string, storeName?: string): AiClientContext {
  const prefs = useSearchPrefs.getState();
  const cart = useCart.getState();
  return {
    screen,
    searchQuery,
    storeName,
    locationLabel: prefs.label.slice(0, 120),
    radiusMeters: prefs.radiusMeters,
    cart: cart.lines.length
      ? {
          storeName: cart.store?.storeName,
          items: cart.lines.slice(0, 20).map((l) => ({
            productName: l.productName,
            quantity: l.quantity,
            unitPrice: formatKobo(l.unitPriceKobo),
          })),
        }
      : undefined,
  };
}

export function AssistantPanel({
  screen,
  storeName,
  searchRequest,
  onOffers,
  suggestions = [],
  title = "Ask AfriSmart",
}: {
  screen: "search" | "merchant";
  storeName?: string;
  /** Each new nonce starts a fresh conversation from what was typed in the search bar. */
  searchRequest?: { query: string; nonce: number } | null;
  onOffers?: (offers: NearbyOffer[]) => void;
  suggestions?: string[];
  title?: string;
}) {
  const user = useAuth((s) => s.user);
  const status = useQuery({ queryKey: ["ai", "status"], queryFn: api.aiStatus, staleTime: 60_000 });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState("");
  const generation = useRef(0);
  const turnId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const onOffersRef = useRef(onOffers);
  onOffersRef.current = onOffers;

  const available = !!user && status.data?.configured !== false && !offline;

  const send = async (message: string, options: { fresh?: boolean; searchQuery?: string } = {}) => {
    const text = message.trim();
    if (!text) return;
    const run = ++generation.current;
    const conversation = options.fresh ? undefined : conversationId;
    setTurns((prev) => [...(options.fresh ? [] : prev), { id: turnId.current++, role: "user", text }]);
    if (options.fresh) {
      setConversationId(undefined);
      onOffersRef.current?.([]);
    }
    setSteps([]);
    setError(null);
    setBusy(true);

    const onProgress = (progress: AiProgress) => {
      if (generation.current !== run) return;
      if (progress.phase === "conversation") setConversationId(progress.conversationId);
      if (progress.phase === "tool_started") {
        setSteps((prev) => [...prev, { key: `${prev.length}`, label: toolLabel(progress.tool), state: "running" }]);
      }
      if (progress.phase === "tool_finished") {
        setSteps((prev) => {
          const index = prev.map((s) => s.state).lastIndexOf("running");
          if (index < 0) return prev;
          const next = [...prev];
          next[index] = { ...next[index], state: progress.success ? "done" : "failed" };
          return next;
        });
      }
    };

    const prefs = useSearchPrefs.getState();
    try {
      const response = await api.aiChat(
        {
          conversationId: conversation,
          message: text,
          latitude: screen === "search" && prefs.lat != null ? prefs.lat : undefined,
          longitude: screen === "search" && prefs.lng != null ? prefs.lng : undefined,
          context: clientContext(screen, options.searchQuery, storeName),
        },
        onProgress,
      );
      if (generation.current !== run) return;
      setConversationId(response.conversationId);
      setTurns((prev) => [
        ...prev,
        { id: turnId.current++, role: "assistant", text: response.reply, tools: response.toolCalls },
      ]);
      const offers = offersFromTools(response.toolCalls);
      if (offers.length) onOffersRef.current?.(offers);
    } catch (e) {
      if (generation.current !== run) return;
      if (e instanceof ApiError && e.code === "AI_NOT_CONFIGURED") setOffline(true);
      setError(errorMessage(e));
    } finally {
      if (generation.current === run) {
        setBusy(false);
        setSteps([]);
      }
    }
  };

  const nonce = searchRequest?.nonce;
  useEffect(() => {
    if (!searchRequest || !user || status.data?.configured === false) return;
    void send(searchRequest.query, { fresh: true, searchQuery: searchRequest.query });
    // Only a new submit (nonce) should trigger a chat, not re-renders or status refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, user?.id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, steps]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  };

  const reset = () => {
    generation.current++;
    setTurns([]);
    setSteps([]);
    setConversationId(undefined);
    setBusy(false);
    setError(null);
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <Sparkles className="size-4" />
        </span>
        <p className="font-semibold text-stone-900">{title}</p>
        {status.data?.model && available && <span className="text-xs text-stone-400">{status.data.model}</span>}
        {turns.length > 0 && (
          <button
            onClick={reset}
            className="ml-auto rounded p-1 text-stone-400 hover:text-stone-700"
            title="New conversation"
            aria-label="New conversation"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      {!user ? (
        <div className="space-y-2 px-4 py-5 text-sm text-stone-600">
          <p>Sign in and the assistant will read your search, compare shops and reroute you when stock runs out.</p>
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Sign in to use the assistant
          </Link>
        </div>
      ) : status.data?.configured === false || offline ? (
        <div className="flex items-start gap-2 px-4 py-5 text-sm text-stone-600">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            The assistant is offline until the server is given an AI key.{" "}
            {screen === "search" ? "Keyword search still works." : "Orders and inventory still work."}
          </p>
        </div>
      ) : (
        <>
          <div ref={scroller} className="max-h-[28rem] min-h-24 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && !busy && (
              <div className="space-y-3 text-sm text-stone-500">
                <p>
                  {screen === "search"
                    ? "Search above and I'll pick the best shop for you — or ask me anything about what's nearby."
                    : "Ask about your stock, sales or incoming orders. I can update stock for you too."}
                </p>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => void send(s)}
                        className="rounded-full border border-stone-200 px-3 py-1 text-stone-700 hover:border-emerald-600 hover:text-emerald-800"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-700 px-3 py-2 text-sm text-white">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <div key={turn.id} className="flex gap-2">
                  <Bot className="mt-1 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm whitespace-pre-wrap text-stone-800">{turn.text}</p>
                    {turn.tools && turn.tools.length > 0 && (
                      <p className="text-xs text-stone-400">
                        Used: {[...new Set(turn.tools.map((t) => toolLabel(t.tool).toLowerCase()))].join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <ul className="space-y-1 text-sm text-stone-500">
                {steps.map((step) => (
                  <li key={step.key} className="flex items-center gap-2">
                    {step.state === "running" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : step.state === "done" ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <CircleAlert className="size-3.5 text-amber-600" />
                    )}
                    {step.label}
                  </li>
                ))}
                {steps.every((s) => s.state !== "running") && (
                  <li className="flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" /> Thinking…
                  </li>
                )}
              </ul>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-stone-100 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={turns.length ? "Ask a follow-up…" : "Ask the assistant…"}
              maxLength={4000}
              disabled={!available}
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
            />
            <Button type="submit" className="px-3" disabled={!draft.trim() || busy} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { searchPlaces, type PlaceHit } from "@/lib/geocode";

type Props = {
  value: string;
  onChange: (label: string) => void;
  onPick: (place: PlaceHit) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
};

export function PlaceAutocomplete({
  value,
  onChange,
  onPick,
  placeholder = "Type an address or place…",
  disabled,
  required,
  id,
}: Props) {
  const listId = useId();
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    const t = window.setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      searchPlaces(q, ac.signal)
        .then((results) => {
          if (ac.signal.aborted) return;
          setHits(results);
          setOpen(true);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setHits([]);
          setLoading(false);
          setError(err instanceof Error ? err.message : "Could not search places");
        });
    }, 350);

    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="street-address"
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => hits.length > 0 && setOpen(true)}
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pr-9 pl-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none disabled:opacity-60"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-stone-400" />
        )}
      </div>
      {open && hits.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {hits.map((hit) => (
            <li key={hit.id} role="option">
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-stone-800 hover:bg-emerald-50"
                onClick={() => {
                  onPick(hit);
                  setOpen(false);
                  setHits([]);
                }}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
                <span>{hit.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-[11px] text-stone-400">Places via OpenStreetMap / Photon</p>
    </div>
  );
}

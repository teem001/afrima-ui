import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { RADIUS_OPTIONS } from "@/lib/locations";
import { formatDistance } from "@/lib/format";
import { useSearchPrefs } from "@/store/searchPrefs";

const selectClass =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 focus:border-emerald-600 focus:outline-none";

export function LocationPicker() {
  const { label, radiusMeters, setLocation, setRadius } = useSearchPrefs();
  const [query, setQuery] = useState(label === "Set your location" ? "" : label);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = "My location";
        setLocation(next, pos.coords.latitude, pos.coords.longitude);
        setQuery(next);
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get GPS — type a place instead");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-stone-500">
          <MapPin className="size-4" /> Near
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
        >
          <Crosshair className={`size-4 ${locating ? "animate-spin" : ""}`} />
          {locating ? "Locating…" : "Use my GPS"}
        </button>
        <span className="text-stone-500">within</span>
        <select className={selectClass} value={radiusMeters} onChange={(e) => setRadius(Number(e.target.value))}>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {formatDistance(r)}
            </option>
          ))}
        </select>
      </div>
      <div className="max-w-md">
        <PlaceAutocomplete
          value={query}
          onChange={setQuery}
          onPick={(place) => {
            setQuery(place.label);
            setLocation(place.label, place.lat, place.lng);
            setGeoError(null);
          }}
          placeholder="Type any city, area, or address…"
        />
      </div>
      {label !== "Set your location" && (
        <p className="text-xs text-stone-500">
          Searching near <span className="font-medium text-stone-700">{label}</span>
        </p>
      )}
      {geoError && <span className="text-xs text-red-600">{geoError}</span>}
    </div>
  );
}

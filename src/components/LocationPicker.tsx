import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { LAGOS_PLACES, RADIUS_OPTIONS } from "@/lib/locations";
import { formatDistance } from "@/lib/format";
import { useSearchPrefs } from "@/store/searchPrefs";

const selectClass =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 focus:border-emerald-600 focus:outline-none";

export function LocationPicker() {
  const { label, lat, lng, radiusMeters, setLocation, setRadius } = useSearchPrefs();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const preset = LAGOS_PLACES.find((p) => p.lat === lat && p.lng === lng);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation("My location", pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your location — pick an area instead");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1 text-stone-500">
        <MapPin className="size-4" /> Near
      </span>
      <select
        className={selectClass}
        value={preset?.id ?? "custom"}
        onChange={(e) => {
          const place = LAGOS_PLACES.find((p) => p.id === e.target.value);
          if (place) setLocation(place.label, place.lat, place.lng);
        }}
      >
        {!preset && <option value="custom">{label}</option>}
        {LAGOS_PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
      >
        <Crosshair className={`size-4 ${locating ? "animate-spin" : ""}`} />
        {locating ? "Locating…" : "Use my location"}
      </button>
      <span className="text-stone-500">within</span>
      <select className={selectClass} value={radiusMeters} onChange={(e) => setRadius(Number(e.target.value))}>
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {formatDistance(r)}
          </option>
        ))}
      </select>
      {geoError && <span className="w-full text-xs text-red-600">{geoError}</span>}
    </div>
  );
}

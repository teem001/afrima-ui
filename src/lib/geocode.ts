/** Open-source place search via Photon (Komoot / OpenStreetMap). No API key. */

export interface PlaceHit {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

function formatLabel(p: NonNullable<PhotonFeature["properties"]>): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const locality = p.city || p.town || p.village || p.suburb;
  const parts = [p.name || street, locality, p.state, p.country].filter(Boolean);
  // Prefer name+locality; drop duplicate street if name already covers it
  return [...new Set(parts)].join(", ");
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "7");
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Place search failed");

  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .map((f, i) => {
      const coords = f.geometry?.coordinates;
      const props = f.properties;
      if (!coords || !props) return null;
      const [lng, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = formatLabel(props);
      if (!label) return null;
      const id = props.osm_type && props.osm_id != null ? `${props.osm_type}-${props.osm_id}` : `hit-${i}-${lat}-${lng}`;
      return { id, label, lat, lng } satisfies PlaceHit;
    })
    .filter((h): h is PlaceHit => h != null);
}

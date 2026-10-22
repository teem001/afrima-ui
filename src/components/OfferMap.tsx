import { useEffect, useMemo } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { NearbyOffer } from "@/lib/types";
import { formatDistance, formatKobo } from "@/lib/format";

interface StorePin {
  storeId: string;
  storeName: string;
  lat: number;
  lng: number;
  openNow: boolean;
  bestPriceKobo: number;
  distanceMeters: number;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  }, [map, bounds]);
  return null;
}

export function OfferMap({
  center,
  radiusMeters,
  offers,
  selectedStoreId,
  onSelectStore,
}: {
  center: { lat: number; lng: number };
  radiusMeters: number;
  offers: NearbyOffer[];
  selectedStoreId?: string | null;
  onSelectStore?: (storeId: string) => void;
}) {
  const pins = useMemo(() => {
    const byStore = new Map<string, StorePin>();
    for (const o of offers) {
      const pin = byStore.get(o.storeId);
      if (!pin) {
        byStore.set(o.storeId, {
          storeId: o.storeId,
          storeName: o.storeName,
          lat: o.latitude,
          lng: o.longitude,
          openNow: o.openNow,
          bestPriceKobo: o.unitPriceKobo,
          distanceMeters: o.distanceMeters,
        });
      } else if (o.unitPriceKobo < pin.bestPriceKobo) {
        pin.bestPriceKobo = o.unitPriceKobo;
      }
    }
    return [...byStore.values()];
  }, [offers]);

  const bounds = useMemo<LatLngBoundsExpression>(() => {
    const points: [number, number][] = [[center.lat, center.lng], ...pins.map((p) => [p.lat, p.lng] as [number, number])];
    if (points.length === 1) {
      const d = radiusMeters / 111_000;
      return [
        [center.lat - d, center.lng - d],
        [center.lat + d, center.lng + d],
      ];
    }
    return points;
  }, [center.lat, center.lng, pins, radiusMeters]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full min-h-72 w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bounds={bounds} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusMeters}
        pathOptions={{ color: "#047857", weight: 1, fillOpacity: 0.04, dashArray: "4 6" }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={7}
        pathOptions={{ color: "#fff", weight: 3, fillColor: "#0284c7", fillOpacity: 1 }}
      >
        <Tooltip direction="top">You are here</Tooltip>
      </CircleMarker>
      {pins.map((pin) => {
        const selected = pin.storeId === selectedStoreId;
        return (
          <CircleMarker
            key={pin.storeId}
            center={[pin.lat, pin.lng]}
            radius={selected ? 12 : 9}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: pin.openNow ? "#047857" : "#a8a29e",
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelectStore?.(pin.storeId) }}
          >
            <Tooltip direction="top" permanent={selected}>
              <strong>{pin.storeName}</strong>
              <br />
              from {formatKobo(pin.bestPriceKobo)} · {formatDistance(pin.distanceMeters)}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

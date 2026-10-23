import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crosshair, MapPin, Store } from "lucide-react";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { api, errorMessage } from "@/lib/api";
import type { Store as StoreType, UpsertStoreRequest } from "@/lib/types";
import { hasSearchLocation, useSearchPrefs } from "@/store/searchPrefs";
import { ImageUpload } from "@/components/ImageUpload";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

function toRequest(values: {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  openAt: string;
  closeAt: string;
  deliveryRadiusM: string;
  phone: string;
  category: string;
  imageMediaId: string | null;
}): UpsertStoreRequest {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    address: values.address.trim(),
    latitude: values.latitude,
    longitude: values.longitude,
    openAt: values.openAt.length === 5 ? `${values.openAt}:00` : values.openAt,
    closeAt: values.closeAt.length === 5 ? `${values.closeAt}:00` : values.closeAt,
    deliveryRadiusM: Number(values.deliveryRadiusM) || 5000,
    imageMediaId: values.imageMediaId,
    phone: values.phone.trim() || null,
    category: values.category.trim() || null,
  };
}

export function StoreForm({
  existing,
  onDone,
}: {
  existing?: StoreType;
  onDone?: (store: StoreType) => void;
}) {
  const prefs = useSearchPrefs();
  const queryClient = useQueryClient();
  const prefsReady = hasSearchLocation(prefs.lat, prefs.lng);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [latitude, setLatitude] = useState<number | null>(existing?.latitude ?? (prefsReady ? prefs.lat : null));
  const [longitude, setLongitude] = useState<number | null>(
    existing?.longitude ?? (prefsReady ? prefs.lng : null),
  );
  const [placeQuery, setPlaceQuery] = useState(existing?.address ?? "");
  const [openAt, setOpenAt] = useState((existing?.openAt ?? "08:00:00").slice(0, 5));
  const [closeAt, setCloseAt] = useState((existing?.closeAt ?? "20:00:00").slice(0, 5));
  const [deliveryRadiusM, setDeliveryRadiusM] = useState(String(existing?.deliveryRadiusM ?? 5000));
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [imageMediaId, setImageMediaId] = useState<string | null>(existing?.imageMediaId ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.imageUrl ?? null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const applyLocation = (label: string, lat: number, lng: number) => {
    setPlaceQuery(label);
    setAddress(label);
    setLatitude(lat);
    setLongitude(lng);
    setGeoError(null);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation("My location (GPS)", pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get GPS — type and pick a place instead");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      if (latitude == null || longitude == null) {
        throw new Error("Pick a place from the suggestions (or use GPS) so the shop has coordinates");
      }
      const body = toRequest({
        name,
        description,
        address: address || placeQuery,
        latitude,
        longitude,
        openAt,
        closeAt,
        deliveryRadiusM,
        phone,
        category,
        imageMediaId,
      });
      return existing ? api.updateStore(existing.id, body) : api.createStore(body);
    },
    onSuccess: (store) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      onDone?.(store);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <Card className="mx-auto max-w-xl space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
          <Store className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {existing ? "Update your shop" : "Set up your physical shop"}
          </h2>
          <p className="text-sm text-stone-600">
            Put your real shop on AfriSmart — type any place worldwide and pick it, or use GPS.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <ImageUpload
          label="Shop photo"
          valueUrl={imageUrl}
          onUploaded={(id, url) => {
            setImageMediaId(id);
            setImageUrl(url);
          }}
          onCleared={() => {
            setImageMediaId(null);
            setImageUrl(null);
          }}
          hint="Photo or short clip of your shopfront — compressed automatically"
        />

        <Field label="Shop name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} placeholder="Your shop name" />
        </Field>
        <Field label="What you sell">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={128}
            placeholder="Stationery, groceries, electronics…"
          />
        </Field>
        <Field label="About the shop">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
            placeholder="Short description customers will see"
          />
        </Field>

        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/80 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
            <MapPin className="size-4 text-emerald-700" /> Shop location
          </p>
          <p className="text-xs text-stone-500">Type to search OpenStreetMap, then pick a result — or use GPS.</p>
          <PlaceAutocomplete
            value={placeQuery}
            onChange={(v) => {
              setPlaceQuery(v);
              setAddress(v);
            }}
            onPick={(place) => applyLocation(place.label, place.lat, place.lng)}
            placeholder="Type street, area, city…"
            required
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            <Crosshair className={`size-4 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Locating…" : "Use my GPS"}
          </button>
          <Field label="Address on listing">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              maxLength={512}
              placeholder="Refine the street or landmark if needed"
            />
          </Field>
          <p className="font-mono text-xs text-stone-500">
            GPS:{" "}
            {latitude != null && longitude != null
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : "pick a place or use GPS"}
          </p>
          {geoError && <p className="text-xs text-red-600">{geoError}</p>}
        </div>

        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="0803…" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Opens">
            <Input type="time" value={openAt} onChange={(e) => setOpenAt(e.target.value)} required />
          </Field>
          <Field label="Closes">
            <Input type="time" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} required />
          </Field>
          <Field label="Delivery radius (m)">
            <Input type="number" min={100} value={deliveryRadiusM} onChange={(e) => setDeliveryRadiusM(e.target.value)} />
          </Field>
        </div>

        {save.isError && <ErrorBanner message={errorMessage(save.error)} />}

        <Button type="submit" loading={save.isPending} className="w-full">
          {existing ? "Save shop details" : "Create shop"}
        </Button>
      </form>
    </Card>
  );
}

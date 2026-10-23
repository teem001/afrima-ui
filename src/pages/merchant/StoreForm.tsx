import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { Store as StoreType, UpsertStoreRequest } from "@/lib/types";
import { useSearchPrefs } from "@/store/searchPrefs";
import { ImageUpload } from "@/components/ImageUpload";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

function toRequest(values: {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
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
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
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
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [latitude, setLatitude] = useState(String(existing?.latitude ?? prefs.lat));
  const [longitude, setLongitude] = useState(String(existing?.longitude ?? prefs.lng));
  const [openAt, setOpenAt] = useState((existing?.openAt ?? "08:00:00").slice(0, 5));
  const [closeAt, setCloseAt] = useState((existing?.closeAt ?? "20:00:00").slice(0, 5));
  const [deliveryRadiusM, setDeliveryRadiusM] = useState(String(existing?.deliveryRadiusM ?? 5000));
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [imageMediaId, setImageMediaId] = useState<string | null>(existing?.imageMediaId ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.imageUrl ?? null);

  const save = useMutation({
    mutationFn: async () => {
      const body = toRequest({
        name,
        description,
        address,
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
            Put your real shop on AfriSmart — name, photo, address and hours — so customers see what you actually have.
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
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} placeholder="Yaba Campus Mart" />
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
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={512} placeholder="Street, area, Lagos" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="0803…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
          </Field>
          <Field label="Longitude">
            <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
          </Field>
        </div>
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

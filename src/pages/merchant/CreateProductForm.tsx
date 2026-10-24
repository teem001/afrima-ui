import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { nairaToKobo } from "@/lib/format";
import { ImageUpload } from "@/components/ImageUpload";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";

export function CreateProductForm({ storeId, onDone }: { storeId: string; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["catalog", "categories"], queryFn: api.categories, staleTime: 300_000 });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [aliases, setAliases] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("");
  const [imageMediaId, setImageMediaId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const product = await api.createProduct({
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        aliases: aliases
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        imageMediaId,
        categoryId: categoryId || null,
      });
      await api.upsertInventory(storeId, {
        productId: product.id,
        quantity: Math.max(0, Number(quantity) || 0),
        unitPriceKobo: nairaToKobo(Number(price) || 0),
      });
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", storeId] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["twin"] });
      setName("");
      setDescription("");
      setSku("");
      setAliases("");
      setCategoryId("");
      setQuantity("10");
      setPrice("");
      setImageMediaId(null);
      setImageUrl(null);
      onDone?.();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <PackagePlus className="size-5 text-emerald-700" />
        <div>
          <p className="font-semibold text-stone-900">Add a product from your shelf</p>
          <p className="text-sm text-stone-600">Upload a photo of the real item, then set how many you have and the price.</p>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <ImageUpload
            label="Product photo"
            valueUrl={imageUrl}
            onUploaded={(id, url) => {
              setImageMediaId(id);
              setImageUrl(url);
            }}
            onCleared={() => {
              setImageMediaId(null);
              setImageUrl(null);
            }}
            hint="Photo or short clip of the real product — compressed automatically"
          />
        </div>
        <Field label="Product name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} placeholder="Pack of 10 pens" />
        </Field>
        <Field label="SKU (optional)">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={64} placeholder="Auto if left blank" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
              placeholder="What it is, size, brand…"
            />
          </Field>
        </div>
        <Field label="Search aliases (comma-separated)">
          <Input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="biro, pens" />
        </Field>
        <Field label="Category">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
          >
            <option value="">Other</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity on shelf">
            <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </Field>
          <Field label="Unit price (₦)">
            <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="750" />
          </Field>
        </div>
        {create.isError && (
          <div className="sm:col-span-2">
            <ErrorBanner message={errorMessage(create.error)} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={create.isPending}>
            Add to shop
          </Button>
        </div>
      </form>
    </Card>
  );
}

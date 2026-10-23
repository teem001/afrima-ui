import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { compressMediaFile, formatBytes } from "@/lib/compressMedia";
import { mediaUrl } from "@/lib/media";
import { MediaThumb } from "@/components/MediaThumb";
import { Button } from "@/components/ui";

export function ImageUpload({
  label = "Photo or short video",
  valueUrl,
  onUploaded,
  onCleared,
  hint = "Photos and videos are compressed automatically · photo ~350 KB · video under ~2.5 MB / 20s",
  acceptVideo = true,
}: {
  label?: string;
  valueUrl?: string | null;
  onUploaded: (mediaId: string, url: string) => void;
  onCleared?: () => void;
  hint?: string;
  acceptVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"image" | "video">("image");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = preview ?? mediaUrl(valueUrl);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !(acceptVideo && isVideo)) {
      setError(acceptVideo ? "Pick a photo or a short video" : "Pick an image file");
      return;
    }

    setError(null);
    setBusy(true);
    setStatus(`Compressing ${isVideo ? "video" : "photo"}…`);
    try {
      const compressed = await compressMediaFile(file);
      setPreview(compressed.dataUrl);
      setPreviewKind(compressed.kind);
      setStatus(`Uploading (${formatBytes(compressed.byteSize)})…`);
      const uploaded = await api.uploadMedia({
        contentType: compressed.contentType,
        data: compressed.dataUrl,
      });
      setStatus(`Saved · ${formatBytes(compressed.byteSize)}`);
      onUploaded(uploaded.id, uploaded.url);
    } catch (err) {
      setPreview(null);
      setStatus(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setPreview(null);
    setStatus(null);
    setError(null);
    onCleared?.();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-700">{label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="relative grid size-28 place-items-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-500 transition hover:border-emerald-600 hover:bg-emerald-50/40 disabled:opacity-60"
        >
          {shown ? (
            preview ? (
              previewKind === "video" ? (
                <video src={preview} className="size-full object-cover" muted playsInline />
              ) : (
                <img src={preview} alt="" className="size-full object-cover" />
              )
            ) : (
              <MediaThumb url={valueUrl} />
            )
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-6" />
              Add media
            </span>
          )}
        </button>
        <div className="space-y-2">
          <Button type="button" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" /> {shown ? "Change" : "Upload"}
          </Button>
          {shown && onCleared && (
            <Button type="button" variant="ghost" className="px-2" onClick={clear}>
              <X className="size-4" /> Remove
            </Button>
          )}
          <p className="text-xs text-stone-500">{hint}</p>
          {status && !error && <p className="text-xs text-emerald-700">{status}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptVideo ? "image/*,video/*" : "image/*"}
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}

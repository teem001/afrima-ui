import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";

/** Renders a stored media URL as image or video based on Content-Type. */
export function MediaThumb({
  url,
  className = "size-full object-cover",
  muted = true,
}: {
  url: string | null | undefined;
  className?: string;
  muted?: boolean;
}) {
  const resolved = mediaUrl(url);
  const [kind, setKind] = useState<"image" | "video">("image");

  useEffect(() => {
    if (!resolved || resolved.startsWith("data:image/")) {
      setKind("image");
      return;
    }
    if (resolved.startsWith("data:video/")) {
      setKind("video");
      return;
    }
    let cancelled = false;
    fetch(resolved, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        setKind(ct.startsWith("video/") ? "video" : "image");
      })
      .catch(() => {
        if (!cancelled) setKind("image");
      });
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  if (!resolved) return null;
  if (kind === "video") {
    return <video src={resolved} className={className} muted={muted} playsInline loop autoPlay />;
  }
  return <img src={resolved} alt="" className={className} />;
}

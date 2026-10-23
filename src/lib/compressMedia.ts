/** Client-side resize/re-encode so uploads stay small before they hit the API. */

export const IMAGE_MAX_EDGE = 1280;
export const IMAGE_TARGET_BYTES = 350_000;
export const IMAGE_MAX_INPUT_BYTES = 12_000_000;

export const VIDEO_MAX_EDGE = 640;
export const VIDEO_TARGET_BITS = 600_000;
export const VIDEO_MAX_DURATION_SEC = 20;
export const VIDEO_MAX_INPUT_BYTES = 25_000_000;
export const VIDEO_MAX_OUTPUT_BYTES = 2_500_000;

export type CompressedMedia = {
  contentType: string;
  dataUrl: string;
  byteSize: number;
  kind: "image" | "video";
};

export async function compressMediaFile(file: File): Promise<CompressedMedia> {
  if (file.type.startsWith("image/")) {
    return compressImage(file);
  }
  if (file.type.startsWith("video/")) {
    return compressVideo(file);
  }
  throw new Error("Pick a photo or a short video");
}

export async function compressImage(file: File): Promise<CompressedMedia> {
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new Error("Photo is too large (max 12 MB before compression)");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image for compression");
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob.size > IMAGE_TARGET_BYTES && quality > 0.45) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (blob.size > IMAGE_TARGET_BYTES * 1.6) {
      const tighter = Math.min(1, 960 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * tighter));
      canvas.height = Math.max(1, Math.round(height * tighter));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, "image/jpeg", 0.7);
    }

    const dataUrl = await blobToDataUrl(blob);
    return { contentType: "image/jpeg", dataUrl, byteSize: blob.size, kind: "image" };
  } finally {
    bitmap.close();
  }
}

export async function compressVideo(file: File): Promise<CompressedMedia> {
  if (file.size > VIDEO_MAX_INPUT_BYTES) {
    throw new Error("Video is too large (max 40 MB before compression)");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await waitForEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Could not read video length");
    }
    if (video.duration > VIDEO_MAX_DURATION_SEC) {
      throw new Error(`Keep videos under ${VIDEO_MAX_DURATION_SEC} seconds`);
    }

    const scale = Math.min(1, VIDEO_MAX_EDGE / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    const width = Math.max(2, Math.round((video.videoWidth || 640) * scale / 2) * 2);
    const height = Math.max(2, Math.round((video.videoHeight || 360) * scale / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare video for compression");

    const stream = canvas.captureStream(24);
    const mimeType = pickRecorderMime();
    const containerType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_TARGET_BITS,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: containerType }));
      recorder.onerror = () => reject(new Error("Video compression failed"));
    });

    video.currentTime = 0;
    await waitForEvent(video, "seeked");
    recorder.start(250);
    await video.play();

    const draw = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    await waitForEvent(video, "ended");
    // Final frame
    ctx.drawImage(video, 0, 0, width, height);
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    const blob = await done;
    if (blob.size === 0) throw new Error("Compressed video was empty");
    if (blob.size > VIDEO_MAX_OUTPUT_BYTES) {
      throw new Error("Video is still too large after compression — try a shorter clip");
    }

    const dataUrl = await blobToDataUrl(blob);
    return {
      contentType: containerType.includes("mp4") ? "video/mp4" : "video/webm",
      dataUrl,
      byteSize: blob.size,
      kind: "video",
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  throw new Error("This browser cannot compress video — use a photo instead");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
      type,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read compressed media"));
    reader.readAsDataURL(blob);
  });
}

function waitForEvent(target: EventTarget, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(`Media ${event} failed`));
    };
    const cleanup = () => {
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };
    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export const formatKobo = (kobo: number) => naira.format(kobo / 100);

export const nairaToKobo = (naira: number) => Math.round(naira * 100);

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export const formatTime = (localTime: string) => localTime.slice(0, 5);

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export const shortHash = (hash: string) => (hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash);

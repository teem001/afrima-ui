import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchPrefsState {
  label: string;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  setLocation: (label: string, lat: number, lng: number) => void;
  setRadius: (radiusMeters: number) => void;
}

/** No hardcoded city — user picks via geocode or GPS. */
export const useSearchPrefs = create<SearchPrefsState>()(
  persist(
    (set) => ({
      label: "Set your location",
      lat: null,
      lng: null,
      radiusMeters: 10000,
      setLocation: (label, lat, lng) => set({ label, lat, lng }),
      setRadius: (radiusMeters) => set({ radiusMeters }),
    }),
    { name: "afrismart-search-prefs-v2" },
  ),
);

export function hasSearchLocation(lat: number | null, lng: number | null): lat is number {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

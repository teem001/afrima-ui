import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LAGOS_PLACES } from "@/lib/locations";

interface SearchPrefsState {
  label: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  setLocation: (label: string, lat: number, lng: number) => void;
  setRadius: (radiusMeters: number) => void;
}

const home = LAGOS_PLACES[0];

export const useSearchPrefs = create<SearchPrefsState>()(
  persist(
    (set) => ({
      label: home.label,
      lat: home.lat,
      lng: home.lng,
      radiusMeters: 10000,
      setLocation: (label, lat, lng) => set({ label, lat, lng }),
      setRadius: (radiusMeters) => set({ radiusMeters }),
    }),
    { name: "afrismart-search-prefs" },
  ),
);

export interface Place {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export const LAGOS_PLACES: Place[] = [
  { id: "unilag", label: "Yaba / UNILAG", lat: 6.5158, lng: 3.3791 },
  { id: "surulere", label: "Surulere", lat: 6.4969, lng: 3.3481 },
  { id: "ikeja", label: "Ikeja", lat: 6.6018, lng: 3.3515 },
  { id: "lekki", label: "Lekki Phase 1", lat: 6.4474, lng: 3.4723 },
];

export const RADIUS_OPTIONS = [2000, 5000, 10000, 20000];

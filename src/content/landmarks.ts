// Map labels for water and parks (v1's EXTRA list, less its second "Lake Michigan",
// which put the name on screen twice at the fitted zoom), and the neighborhoods v1
// labelled only once zoomed in (its MINOR list).

export type Landmark = Readonly<{ name: string; lat: number; lng: number; kind: "lake" | "river" | "park" }>;

export const LANDMARKS: readonly Landmark[] = [
  { name: "Lake Michigan", lat: 41.888, lng: -87.598, kind: "lake" },
  { name: "Chicago River", lat: 41.8878, lng: -87.629, kind: "river" },
  { name: "Grant Park", lat: 41.8745, lng: -87.6195, kind: "park" },
  { name: "Lincoln Park", lat: 41.9235, lng: -87.631, kind: "park" },
  { name: "Navy Pier", lat: 41.8917, lng: -87.604, kind: "park" },
];

export const MINOR_HOODS: readonly string[] = [
  "Wrigleyville",
  "Boystown",
  "DePaul",
  "West Town",
  "United Center",
  "Printers Row",
  "Mag Mile",
  "Bridgeport",
  "Armour Square",
  "Greektown",
];

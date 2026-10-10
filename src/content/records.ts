import type { SourceId } from "./sources";

// The Records tab: the record book and the seven world records set on these streets.

export const RECORD_HERO = {
  eyebrow: "Men's world record · London, April 26, 2026",
  time: "1:59:30",
  name: "Sabastian Sawe",
  text: "ran 1:59:30 in London on April 26, 2026, the first sub-two-hour marathon in a record-eligible race. World Athletics ratified it on July 23, 2026. Two more men finished inside the old record in the same race.",
  sources: ["S12", "S13"] as readonly SourceId[],
} as const;

export type BookEntry = Readonly<{ time: string; title: string; text: string; sources: readonly SourceId[] }>;

export const RECORD_BOOK: readonly BookEntry[] = [
  { time: "2:00:35", title: "Chicago course record", text: "Kelvin Kiptum (KEN), 2023. It was the world record until London 2026.", sources: ["S14", "S12"] },
  { time: "2:09:56", title: "Women's world record (mixed race)", text: "Ruth Chepngetich (KEN), Chicago 2024. Also the Chicago course record.", sources: ["S15", "S30"] },
  { time: "2:15:41", title: "Women-only record", text: "Tigst Assefa (ETH), London 2026, in a race with no male pacers.", sources: ["S12", "S13"] },
  { time: "2:02:23", title: "2025 Chicago men's winner", text: "Jacob Kiplimo (UGA), back to defend in 2026 with a 2:00:28 best.", sources: ["S17", "S8", "S7"] },
  { time: "2:14:56", title: "2025 Chicago women's winner", text: "Hawi Feysa (ETH), also back in 2026.", sources: ["S17", "S11", "S7"] },
  { time: "2:04:43", title: "American record", text: "Conner Mantz, set here in 2025, finishing fourth.", sources: ["S11", "S17"] },
];

export type WorldRecord = Readonly<{ year: number; name: string; country: string; time: string; women: boolean; sources: readonly SourceId[] }>;

export const WORLD_RECORDS: readonly WorldRecord[] = [
  { year: 1984, name: "Steve Jones", country: "Wales (GBR)", time: "2:08:05", women: false, sources: ["S19", "S18"] },
  { year: 1999, name: "Khalid Khannouchi", country: "Morocco", time: "2:05:42", women: false, sources: ["S19"] },
  { year: 2001, name: "Catherine Ndereba", country: "Kenya", time: "2:18:47", women: true, sources: ["S19"] },
  { year: 2002, name: "Paula Radcliffe", country: "Great Britain", time: "2:17:18", women: true, sources: ["S19"] },
  { year: 2019, name: "Brigid Kosgei", country: "Kenya", time: "2:14:04", women: true, sources: ["S19"] },
  { year: 2023, name: "Kelvin Kiptum", country: "Kenya", time: "2:00:35", women: false, sources: ["S14"] },
  { year: 2024, name: "Ruth Chepngetich", country: "Kenya · still the record (mixed race)", time: "2:09:56", women: true, sources: ["S15", "S30"] },
];

export const WORLD_RECORDS_COPY = {
  title: "Seven world records on these streets",
  caption: "Chicago's flat, fast course has produced seven marathon world records, four of them by women.",
  legend: "Blue dots are men's records, purple dots are women's.",
  sources: ["S7", "S5", "S19"] as readonly SourceId[],
} as const;

export const RECORDS_COPY = {
  bookTitle: "The record book",
  chepngetichNote:
    "Chepngetich was banned for three years in October 2025 after a March 2025 positive test. The ban covers results from March 2025 onward, so the 2024 record stands.",
  chepngetichSources: { sources: ["S15", "S16"] as readonly SourceId[] },
} as const;

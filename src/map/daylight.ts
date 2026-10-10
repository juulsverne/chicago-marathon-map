import { mixOklch } from "./oklch";
import { DAY, type MapPalette } from "./palette";

// Light through the race day: palette keyframes mixed in OKLCH and applied
// to the map by the race clock. The course's red and blue never change, and every
// keyframe keeps them at least 3:1 against land (tests/unit/daylight.test.ts). The
// panels are solid surfaces, so their text never depends on this.

/** Sunrise and sunset in Chicago on October 11, 2026, CDT, from NOAA's solar equations
 *  (src/model/sun.ts; the unit test recomputes them). */
export const SUNRISE = 419; // 6:59 AM
export const SUNSET = 1096; // 6:16 PM (the NOAA equations give 6:16; an independent calendar gives 6:17)

/** The colors that change through the day. The rest (the course, runners, leaders and
 *  highlights) come from DAY unchanged. */
type Light = Pick<
  MapPalette,
  "bg" | "land" | "water" | "waterInk" | "park" | "parkInk" | "street" | "casing" | "arterialCasing" | "highway" | "highwayCasing" | "label" | "halo" | "hood" | "courseCasing"
>;

export type Sky = Readonly<{ "sky-color": string; "horizon-color": string; "fog-color": string }>;

const NIGHT: Light = {
  bg: "#07090d",
  land: "#0d1018",
  water: "#06101c",
  waterInk: "#5f8fb3",
  park: "#0c1612",
  parkInk: "#6b9a7a",
  street: "#1c2230",
  casing: "#080a10",
  arterialCasing: "#07080d",
  highway: "#2e2c3a",
  highwayCasing: "#18171f",
  label: "#a9b2c4",
  halo: "#0d1018",
  hood: "#77809a",
  courseCasing: "#0c0f17",
};

const BLUE_HOUR: Light = {
  bg: "#0a1220",
  land: "#121b2c",
  water: "#0c2440",
  waterInk: "#78b0db",
  park: "#122420",
  parkInk: "#78aa8c",
  street: "#26324a",
  casing: "#0b1120",
  arterialCasing: "#0a0f1c",
  highway: "#3c3c56",
  highwayCasing: "#202134",
  label: "#bac6db",
  halo: "#121b2c",
  hood: "#8592ab",
  courseCasing: "#101827",
};

const SUNRISE_LIGHT: Light = {
  bg: "#170f14",
  land: "#251b21",
  water: "#1b2b45",
  waterInk: "#e9a98a",
  park: "#1d281f",
  parkInk: "#9cc092",
  street: "#3b2e35",
  casing: "#140e12",
  arterialCasing: "#110c10",
  highway: "#6b4a2d",
  highwayCasing: "#3a281b",
  label: "#e6d5c8",
  halo: "#251b21",
  hood: "#b59d90",
  courseCasing: "#1b1318",
};

const DAY_LIGHT: Light = {
  bg: DAY.bg,
  land: DAY.land,
  water: DAY.water,
  waterInk: DAY.waterInk,
  park: DAY.park,
  parkInk: DAY.parkInk,
  street: DAY.street,
  casing: DAY.casing,
  arterialCasing: DAY.arterialCasing,
  highway: DAY.highway,
  highwayCasing: DAY.highwayCasing,
  label: DAY.label,
  halo: DAY.halo,
  hood: DAY.hood,
  courseCasing: DAY.courseCasing,
};

const GOLDEN: Light = {
  bg: "#120e0b",
  land: "#211b15",
  water: "#192b33",
  waterInk: "#a3d2df",
  park: "#1c291a",
  parkInk: "#a4c68d",
  street: "#3a3229",
  casing: "#120f0b",
  arterialCasing: "#0f0d09",
  highway: "#6d5631",
  highwayCasing: "#3c301b",
  label: "#e4d8c3",
  halo: "#211b15",
  hood: "#ab9a81",
  courseCasing: "#16120e",
};

const SUNSET_LIGHT: Light = {
  bg: "#140d14",
  land: "#231920",
  water: "#1b2140",
  waterInk: "#c6a0d8",
  park: "#1b231f",
  parkInk: "#92b192",
  street: "#392c38",
  casing: "#130d13",
  arterialCasing: "#100b10",
  highway: "#6a403a",
  highwayCasing: "#3a2222",
  label: "#e2cad2",
  halo: "#231920",
  hood: "#aa909e",
  courseCasing: "#171017",
};

const SKY = {
  night: { "sky-color": "#04060b", "horizon-color": "#121c30", "fog-color": "#0d1018" },
  blue: { "sky-color": "#0c1a33", "horizon-color": "#2d4c7a", "fog-color": "#121b2c" },
  sunrise: { "sky-color": "#1c2a4a", "horizon-color": "#e6855c", "fog-color": "#251b21" },
  day: { "sky-color": "#0e1420", "horizon-color": "#2b3543", "fog-color": "#191b1e" },
  golden: { "sky-color": "#1a1d2a", "horizon-color": "#d99b4f", "fog-color": "#211b15" },
  sunset: { "sky-color": "#1d1932", "horizon-color": "#cf625b", "fog-color": "#231920" },
} satisfies Record<string, Sky>;

export type Keyframe = Readonly<{ name: string; t: number; light: Light; sky: Sky }>;

/** The keyframes, in time order. */
export const KEYFRAMES: readonly Keyframe[] = [
  { name: "night", t: 300, light: NIGHT, sky: SKY.night },
  { name: "blue hour", t: 390, light: BLUE_HOUR, sky: SKY.blue },
  { name: "sunrise", t: SUNRISE, light: SUNRISE_LIGHT, sky: SKY.sunrise },
  { name: "day", t: 480, light: DAY_LIGHT, sky: SKY.day },
  { name: "golden", t: 1050, light: GOLDEN, sky: SKY.golden },
  { name: "sunset", t: SUNSET, light: SUNSET_LIGHT, sky: SKY.sunset },
  { name: "dusk", t: 1125, light: NIGHT, sky: SKY.night },
];

/** The day palette holds from 8:00 AM until an hour before golden hour, so the
 *  middle of the race reads in v1's most legible colors. */
const DAY_HOLD_UNTIL = 990; // 4:30 PM
const STOPS: readonly Keyframe[] = [...KEYFRAMES.slice(0, 4), { ...KEYFRAMES[3], name: "day (hold)", t: DAY_HOLD_UNTIL }, ...KEYFRAMES.slice(4)];

function between(t: number): { a: Keyframe; b: Keyframe; f: number } {
  if (t <= STOPS[0].t) return { a: STOPS[0], b: STOPS[0], f: 0 };
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      return { a, b, f: (t - a.t) / (b.t - a.t) };
    }
  }
  const last = STOPS[STOPS.length - 1];
  return { a: last, b: last, f: 0 };
}

function mixRecord<T extends Record<string, string>>(a: T, b: T, f: number): T {
  const out = {} as Record<string, string>;
  for (const key of Object.keys(a)) out[key] = mixOklch(a[key], b[key], f);
  return out as T;
}

/** The map palette at race minute `t`. */
export function paletteAt(t: number): MapPalette {
  const { a, b, f } = between(t);
  return { ...DAY, ...mixRecord(a.light, b.light, f) };
}

/** The sky (seen when the camera is pitched) at race minute `t`. */
export function skyAt(t: number): Sky {
  const { a, b, f } = between(t);
  return mixRecord(a.sky, b.sky, f);
}

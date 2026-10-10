import type { LeaderId } from "@/content/race";

/** The map's colors as JS values: MapLibre styles and WebGL uniforms need them in
 *  code, and Next's CSS pipeline rewrites CSS color tokens, so they cannot be read
 *  back at runtime. Tokens that also exist in src/app/globals.css must stay equal
 *  (tests/unit/palette.test.ts checks). This is the "day" palette (v1's dark theme);
 *  src/map/daylight.ts mixes keyframes through the race day. */
export type MapPalette = Readonly<{
  bg: string;
  land: string;
  water: string;
  waterInk: string;
  park: string;
  parkInk: string;
  street: string;
  casing: string;
  arterialCasing: string;
  highway: string;
  highwayCasing: string;
  label: string;
  halo: string;
  hood: string;
  courseCasing: string;
  closed: string;
  open: string;
  highlight: string;
  runner: string;
  runnerEdge: string;
  leaderEdge: string;
  leaders: Readonly<Record<LeaderId, string>>;
}>;

export const DAY: MapPalette = {
  bg: "#0c0d0f",
  land: "#191b1e",
  water: "#0b2635",
  waterInk: "#71c7ee",
  park: "#16271b",
  parkInk: "#86c493",
  street: "#2c3035",
  casing: "#121315",
  arterialCasing: "#0e0f11",
  highway: "#4e4128",
  highwayCasing: "#2d2619",
  label: "#c9ced5",
  halo: "#141619",
  hood: "#868e98",
  courseCasing: "#141619",
  closed: "#ff3b57",
  open: "#4cc0f0",
  highlight: "#f2f4f6",
  runner: "#ffffff",
  runnerEdge: "#a6a6a6", // v1's rgba(0,0,0,.35) stroke over a white dot
  leaderEdge: "#ffffff",
  leaders: {
    wcm: "#14b8a6",
    wcw: "#5eead4",
    men: "#2563eb",
    wom: "#9333ea",
    wr: "#e0a100",
    you: "#d6178f",
  },
};

/** v1's accent colors that do not change through the day: the timeline's
 *  key-moment tones and the three start waves. */
export const ACCENTS = {
  moments: { close: "#ff3b57", start: "#f2f4f6", first: "#e0a100", last: "#79818b", open: "#4cc0f0" },
  waves: ["#ffffff", "#ffc93d", "#9fe6ff"],
} as const;

/** CSS tokens in globals.css and the TypeScript value each must equal. */
export const CSS_TOKENS: Readonly<Record<string, string>> = {
  "--color-bg": DAY.bg,
  "--color-land": DAY.land,
  "--color-water": DAY.water,
  "--color-park": DAY.park,
  "--color-panel": DAY.courseCasing,
  "--color-fg": DAY.highlight,
  "--color-closed": DAY.closed,
  "--color-open": DAY.open,
  "--color-leader-wcm": DAY.leaders.wcm,
  "--color-leader-wcw": DAY.leaders.wcw,
  "--color-leader-men": DAY.leaders.men,
  "--color-leader-wom": DAY.leaders.wom,
  "--color-leader-wr": DAY.leaders.wr,
  "--color-leader-you": DAY.leaders.you,
  "--color-moment-close": ACCENTS.moments.close,
  "--color-moment-start": ACCENTS.moments.start,
  "--color-moment-first": ACCENTS.moments.first,
  "--color-moment-last": ACCENTS.moments.last,
  "--color-moment-open": ACCENTS.moments.open,
  "--color-wave-1": ACCENTS.waves[0],
  "--color-wave-2": ACCENTS.waves[1],
  "--color-wave-3": ACCENTS.waves[2],
};

/** "#rrggbb" to premultiplied RGBA floats for WebGL (alpha defaults to 1). */
export function glColor(hex: string, alpha = 1): [number, number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Expected #rrggbb, got ${hex}`);
  const c = (i: number) => (parseInt(m[i], 16) / 255) * alpha;
  return [c(1), c(2), c(3), alpha];
}

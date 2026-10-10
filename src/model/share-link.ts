import { DAY_END, DAY_START } from "@/content/race";

// Shared links: `?t=HHMM&s=<slug>` opens the map paused at a moment
// (24-hour Central Time) with a street selected. Each parameter is checked on its own
// and a bad one is ignored. Dropped pins and locations never enter a URL.

export type ShareLink = Readonly<{ t: number | null; slug: string | null }>;

const HHMM = /^([01][0-9]|2[0-3])([0-5][0-9])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 120;

/** "1030" for 10:30 AM, "1415" for 2:15 PM: the whole minute. */
export function formatShareTime(t: number): string {
  const m = Math.floor(t);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
}

/** Minutes after midnight, or null unless `raw` is HHMM within the race-day timeline. */
export function parseShareTime(raw: string | null): number | null {
  const match = raw === null ? null : HHMM.exec(raw);
  if (!match) return null;
  const t = Number(match[1]) * 60 + Number(match[2]);
  return t >= DAY_START && t <= DAY_END ? t : null;
}

/** A well-formed slug, or null. Whether it names a closure is the caller's check. */
export function parseShareSlug(raw: string | null): string | null {
  return raw !== null && raw.length <= SLUG_MAX && SLUG.test(raw) ? raw : null;
}

/** The shared moment and street in a query string (`location.search`). */
export function readShareLink(search: string): ShareLink {
  const params = new URLSearchParams(search);
  return { t: parseShareTime(params.get("t")), slug: parseShareSlug(params.get("s")) };
}

/** The link to a moment and a street; `page` is the app's absolute URL. */
export function shareHref(page: string, t: number, slug: string): string {
  return `${page}?t=${formatShareTime(t)}&s=${slug}`;
}

import { BASE_PATH } from "@/lib/base-path";

// Files the map engine fetches at runtime. scripts/vendor-assets.ts copies them
// from node_modules into public/vendor/ (git-ignored) before `dev` and `build`.

/** Must equal the installed maplibre-gl version (a unit test checks). The folder is
 *  versioned so an upgrade never pairs a cached shared chunk with a new worker. */
export const MAPLIBRE_VERSION = "6.11.2";
/** The worker imports ./maplibre-gl-shared.mjs, so both files share one folder. */
export const MAPLIBRE_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"] as const;
export const MAPLIBRE_DIR = `vendor/maplibre/${MAPLIBRE_VERSION}`;

/** MapLibre `font-faces` names and the self-hosted file for each: static weights of
 *  the app's own families (SIL Open Font License), from exact-pinned Fontsource
 *  packages. MapLibre rasterizes a face at its file's weight, so each weight is its
 *  own file. */
export const MAP_FONTS = {
  display: { face: "Big Shoulders Bold", pkg: "big-shoulders", file: "big-shoulders-latin-700-normal.woff2" },
  sans: { face: "Instrument Sans Medium", pkg: "instrument-sans", file: "instrument-sans-latin-500-normal.woff2" },
  sansBold: { face: "Instrument Sans SemiBold", pkg: "instrument-sans", file: "instrument-sans-latin-600-normal.woff2" },
  sansItalic: { face: "Instrument Sans SemiBold Italic", pkg: "instrument-sans", file: "instrument-sans-latin-600-italic.woff2" },
  mono: { face: "IBM Plex Mono SemiBold", pkg: "ibm-plex-mono", file: "ibm-plex-mono-latin-600-normal.woff2" },
} as const;
export type MapFont = keyof typeof MAP_FONTS;
export const FONT_DIR = "vendor/fonts";
/** Each font package's OFL license is copied beside its files as `<pkg>-LICENSE.txt`. */
export const FONT_PACKAGES: readonly string[] = [...new Set(Object.values(MAP_FONTS).map((f) => f.pkg))];

/** Absolute URL of a file under the base path, e.g. assetUrl(origin, "data/course.json").
 *  Absolute, because MapLibre's worker resolves relative URLs against its own script. */
export function assetUrl(origin: string, path: string): string {
  return `${origin}${BASE_PATH}/${path}`;
}

/** Root-relative worker URL for maplibre's setWorkerUrl. Same origin, so no blob: URL. */
export const WORKER_URL = `${BASE_PATH}/${MAPLIBRE_DIR}/maplibre-gl-worker.mjs`;

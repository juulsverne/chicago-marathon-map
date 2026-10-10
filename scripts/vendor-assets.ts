// Copies the map engine's runtime files from node_modules into public/vendor/
// (git-ignored): MapLibre's worker and the map label fonts with their licenses.
// Runs before `dev` and `build` (the predev and prebuild npm scripts).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FONT_DIR, FONT_PACKAGES, MAPLIBRE_DIR, MAPLIBRE_FILES, MAPLIBRE_VERSION, MAP_FONTS } from "../src/map/assets";

const installed = (JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8")) as { version: string }).version;
if (installed !== MAPLIBRE_VERSION) {
  throw new Error(`maplibre-gl ${installed} is installed, but src/map/assets.ts expects ${MAPLIBRE_VERSION}`);
}

const copy = (from: string, toDir: string, name = path.basename(from)) => {
  mkdirSync(toDir, { recursive: true });
  copyFileSync(from, path.join(toDir, name));
};

for (const file of MAPLIBRE_FILES) copy(`node_modules/maplibre-gl/dist/${file}`, `public/${MAPLIBRE_DIR}`);
for (const font of Object.values(MAP_FONTS)) copy(`node_modules/@fontsource/${font.pkg}/files/${font.file}`, `public/${FONT_DIR}`);
for (const pkg of FONT_PACKAGES) copy(`node_modules/@fontsource/${pkg}/LICENSE`, `public/${FONT_DIR}`, `${pkg}-LICENSE.txt`);
console.log(`vendored maplibre-gl ${MAPLIBRE_VERSION}'s worker and ${Object.keys(MAP_FONTS).length} map fonts into public/vendor`);

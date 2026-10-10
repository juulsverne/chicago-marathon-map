// Decodes data/source/mapdata.json into the committed runtime data:
//   src/data/route.json        bundled with the client (route, segment times, SVG projection)
//   src/data/course-svg.json   server-only (the prerendered SVG course and basemap)
//   src/data/histogram.json    server-only (runners on the course through the day)
//   src/data/hoods.json        neighborhood points for the Race tab (server and lazy layer only)
//   public/data/<name>.json    GeoJSON that MapLibre's worker fetches at runtime
// Run after changing source data, content or the runner model: npm run build:data
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { MAP_DATA_FILES, buildData } from "../src/lib/build-data";
import type { MapData } from "../src/lib/geo/decode";

const source = JSON.parse(readFileSync("data/source/mapdata.json", "utf8")) as MapData;
const { route, svg, histogram, hoods, geojson } = buildData(source);

const write = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value) + "\n");
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
write("src/data/route.json", route);
write("src/data/course-svg.json", svg);
write("src/data/histogram.json", histogram);
write("src/data/hoods.json", hoods);
for (const name of MAP_DATA_FILES) write(`public/data/${name}.json`, geojson[name]);
console.log(
  `route ${route.len.toFixed(1)} m, ${route.points.length} points, ${route.segments.length} segments; svg ${svg.width}x${svg.height}; ` +
    `geojson ${geojson.streets.features.length} streets, ${geojson.labels.features.length} labels, ${geojson.course.features.length} course segments`,
);

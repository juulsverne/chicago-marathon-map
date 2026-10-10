/** Every page and asset lives under this prefix (next.config.ts sets it as basePath;
 *  a unit test keeps the two equal). Client code that builds URLs by hand
 *  (MapLibre's worker, map data and map fonts) must include it. */
export const BASE_PATH = "/chicago-marathon-map";

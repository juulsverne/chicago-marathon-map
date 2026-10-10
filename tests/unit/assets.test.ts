import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig, { CONTENT_SECURITY_POLICY } from "../../next.config";
import { BASE_PATH } from "@/lib/base-path";
import { FONT_PACKAGES, MAPLIBRE_VERSION, MAP_FONTS, WORKER_URL, assetUrl } from "@/map/assets";

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

describe("map engine assets", () => {
  it("vendors the installed, exactly pinned maplibre-gl", () => {
    expect(json("node_modules/maplibre-gl/package.json").version).toBe(MAPLIBRE_VERSION);
    expect(json("package.json").dependencies["maplibre-gl"]).toBe(MAPLIBRE_VERSION);
  });

  it("takes every map font from an exactly pinned Fontsource package", () => {
    const dev = json("package.json").devDependencies;
    for (const pkg of FONT_PACKAGES) expect(dev[`@fontsource/${pkg}`]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.keys(MAP_FONTS)).toHaveLength(5);
  });

  it("builds URLs under the base path", () => {
    expect(nextConfig.basePath).toBe(BASE_PATH);
    expect(WORKER_URL).toBe(`/chicago-marathon-map/vendor/maplibre/${MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`);
    expect(assetUrl("https://lab.elijahos.com", "data/course.json")).toBe("https://lab.elijahos.com/chicago-marathon-map/data/course.json");
  });
});

describe("content security policy", () => {
  const directives = new Map(
    CONTENT_SECURITY_POLICY.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values] as const;
    }),
  );

  it("lets MapLibre run from same-origin files only", () => {
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("worker-src")).toEqual(["'self'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("img-src")).toEqual(["'self'"]);
    expect(directives.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
  });

  it("allows no eval, no blob: and no third-party host outside dev", () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-eval");
    expect(CONTENT_SECURITY_POLICY).not.toContain("blob:");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:/);
  });
});

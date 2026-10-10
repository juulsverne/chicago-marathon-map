import { expect, test } from "@playwright/test";
import { APP } from "./app";

const MAPLIBRE = `${APP}/vendor/maplibre/6.11.2`;
const FONTS = [
  "big-shoulders-latin-700-normal.woff2",
  "instrument-sans-latin-500-normal.woff2",
  "instrument-sans-latin-600-normal.woff2",
  "instrument-sans-latin-600-italic.woff2",
  "ibm-plex-mono-latin-600-normal.woff2",
];
const DATA = ["streets", "lake", "parks", "rivers", "labels", "course", "miles"];

test("serves MapLibre's worker as JavaScript under the base path, cached for a year (the path is versioned)", async ({ request }) => {
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    const response = await request.get(`${MAPLIBRE}/${file}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^(text|application)\/javascript/);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  }
});

test("serves the self-hosted map fonts with their licenses, and the map data", async ({ request }) => {
  for (const font of FONTS) {
    const response = await request.get(`${APP}/vendor/fonts/${font}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("font/woff2");
  }
  for (const pkg of ["big-shoulders", "instrument-sans", "ibm-plex-mono"]) {
    const license = await request.get(`${APP}/vendor/fonts/${pkg}-LICENSE.txt`);
    expect(license.status()).toBe(200);
    expect(await license.text()).toContain("SIL Open Font License");
  }
  for (const name of DATA) {
    const response = await request.get(`${APP}/data/${name}.json`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^application\/json/);
  }
});

test("sends the Content-Security-Policy with the page", async ({ request }) => {
  const csp = (await request.get(APP)).headers()["content-security-policy"];
  expect(csp).toContain("worker-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).not.toContain("unsafe-eval");
});

test("renders the shell with no CSP violations", async ({ page }) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on("console", (m) => {
    if (/CSP violation|Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  await page.goto(APP);
  await expect(page.getByTestId("date-chip")).toBeVisible(); // renders only after hydration
  expect(violations).toEqual([]);
});

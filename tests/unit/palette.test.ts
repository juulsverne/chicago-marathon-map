import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site";
import { ACCENTS, CSS_TOKENS, DAY, glColor } from "@/map/palette";

const css = readFileSync("src/app/globals.css", "utf8");
const theme = css.slice(css.indexOf("@theme {"), css.indexOf("}", css.indexOf("@theme {")));
const tokens = new Map([...theme.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));

describe("map palette", () => {
  it.each(Object.entries(CSS_TOKENS))("keeps %s equal to the CSS token", (token, value) => {
    expect(tokens.get(token)).toBe(value);
  });

  it("mirrors the moment tones from the closure, fg, soft and open tokens, as v1 did", () => {
    expect(ACCENTS.moments.close).toBe(tokens.get("--color-closed"));
    expect(ACCENTS.moments.start).toBe(tokens.get("--color-fg"));
    expect(ACCENTS.moments.last).toBe(tokens.get("--color-soft"));
    expect(ACCENTS.moments.open).toBe(tokens.get("--color-open"));
  });

  it("keeps the browser theme color on the page background", () => {
    expect(SITE.themeColor).toBe(DAY.bg);
  });

  it("uses only #rrggbb colors", () => {
    const values = Object.values(DAY).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v)));
    for (const v of values) expect(v).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("glColor", () => {
  it("converts to premultiplied floats", () => {
    expect(glColor("#ffffff")).toEqual([1, 1, 1, 1]);
    expect(glColor("#ff0000", 0.5)).toEqual([0.5, 0, 0, 0.5]);
  });
});

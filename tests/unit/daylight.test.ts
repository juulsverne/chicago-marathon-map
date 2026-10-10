import { describe, expect, it } from "vitest";
import { DAY, type MapPalette } from "@/map/palette";
import { KEYFRAMES, SUNRISE, SUNSET, paletteAt, skyAt } from "@/map/daylight";
import { hexToOklch, mixOklch, oklchToHex } from "@/map/oklch";
import { sunTimes } from "@/model/sun";

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("OKLCH", () => {
  it("round-trips sRGB colors", () => {
    for (const hex of ["#000000", "#ffffff", "#ff3b57", "#4cc0f0", "#191b1e", "#0b2635"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("matches published OKLCH values (white L=1, pure red L=0.628 C=0.258 h=29.2)", () => {
    const [l, c] = hexToOklch("#ffffff");
    expect(l).toBeCloseTo(1, 3);
    expect(c).toBeCloseTo(0, 3);
    const red = hexToOklch("#ff0000");
    expect(red[0]).toBeCloseTo(0.628, 3);
    expect(red[1]).toBeCloseTo(0.2577, 3);
    expect(red[2]).toBeCloseTo(29.23, 1);
  });

  it("mixes through the shorter way round the hue circle, with the ends exact", () => {
    expect(mixOklch("#191b1e", "#2a1f24", 0)).toBe("#191b1e");
    expect(mixOklch("#191b1e", "#2a1f24", 1)).toBe("#2a1f24");
    const mid = hexToOklch(mixOklch("#ff0000", "#ff00ff", 0.5));
    expect(mid[2]).toBeGreaterThan(330); // between red (29) and magenta (328), the short way
  });
});

describe("the sun over Chicago on race day (NOAA solar equations)", () => {
  it("rises at 6:59 AM and sets at 6:16 PM CDT on October 11, 2026", () => {
    const { sunrise, sunset } = sunTimes({ year: 2026, month: 10, day: 11, lat: 41.8781, lng: -87.6298, utcOffsetHours: -5 });
    expect(Math.round(sunrise)).toBe(419);
    expect(Math.round(sunset)).toBe(1096);
    expect(SUNRISE).toBe(419);
    expect(SUNSET).toBe(1096);
  });
});

describe("light through the day", () => {
  it("has its keyframes in time order", () => {
    expect(KEYFRAMES.map((k) => [k.name, k.t])).toEqual([
      ["night", 300],
      ["blue hour", 390],
      ["sunrise", 419],
      ["day", 480],
      ["golden", 1050],
      ["sunset", 1096],
      ["dusk", 1125],
    ]);
  });

  it("is v1's day palette in the day and holds the ends outside the keyframes", () => {
    expect(paletteAt(600)).toEqual(DAY);
    expect(paletteAt(299)).toEqual(paletteAt(300));
    expect(paletteAt(1140)).toEqual(paletteAt(1125));
  });

  it("keeps the course colors constant and at least 3:1 against land, all day", () => {
    for (let t = 300; t <= 1140; t += 2) {
      const p: MapPalette = paletteAt(t);
      expect(p.closed).toBe(DAY.closed);
      expect(p.open).toBe(DAY.open);
      expect(contrast(p.closed, p.land), `closed at ${t}`).toBeGreaterThanOrEqual(3);
      expect(contrast(p.open, p.land), `open at ${t}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("warms at sunrise: the sky at 6:59 is not the sky at 6:00 or at noon", () => {
    expect(skyAt(419)["horizon-color"]).not.toBe(skyAt(360)["horizon-color"]);
    expect(skyAt(419)["horizon-color"]).not.toBe(skyAt(720)["horizon-color"]);
  });
});

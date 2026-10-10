import type { LayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { paletteAt } from "@/map/daylight";
import { paintTargets } from "@/map/palette-apply";
import { buildStyle } from "@/map/style";

describe("the palette applied through the day", () => {
  for (const t of [300, 419, 600, 1096]) {
    it(`targets exactly the paint properties the style draws from the palette (at minute ${t})`, () => {
      const palette = paletteAt(t);
      const style = buildStyle({ origin: "https://example.test", palette });
      const layers = new Map(style.layers.map((l) => [l.id, l as LayerSpecification & { paint?: Record<string, unknown> }]));
      const targets = paintTargets(palette);
      expect(new Set(targets.map(([l, p]) => `${l} ${p}`)).size).toBe(targets.length);
      for (const [layer, property, color] of targets) {
        const paint = layers.get(layer)?.paint;
        expect(paint, `layer ${layer}`).toBeDefined();
        expect(paint?.[property], `${layer} ${property}`).toBe(color);
      }
    });
  }
});

// sRGB <-> OKLCH, for mixing the map's palette keyframes perceptually.
// Björn Ottosson's OKLab (https://bottosson.github.io/posts/oklab/), hand-written:
// a color library would cost more bytes than these few lines.

export type Oklch = [l: number, c: number, h: number];

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function hexToOklch(hex: string): Oklch {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Expected #rrggbb, got ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => toLinear(parseInt(x, 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const h = C < 1e-7 ? 0 : (Math.atan2(B, A) * 180) / Math.PI;
  return [L, C, h < 0 ? h + 360 : h];
}

export function oklchToHex([L, C, h]: Oklch): string {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** `a` to `b` at `t` (0..1) in OKLCH, around the hue circle the short way. Exact at the ends. */
export function mixOklch(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [l1, c1, h1] = hexToOklch(a);
  const [l2, c2, h2] = hexToOklch(b);
  // A grey has no hue: keep the other color's, so the mix does not swing through red.
  const ha = c1 < 1e-4 ? h2 : h1;
  const hb = c2 < 1e-4 ? h1 : h2;
  let dh = hb - ha;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (ha + dh * t + 360) % 360;
  return oklchToHex([l1 + (l2 - l1) * t, c1 + (c2 - c1) * t, h]);
}

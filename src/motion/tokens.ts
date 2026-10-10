// Motion language. Every animation in the app uses these values: CSS
// through the custom properties in src/app/globals.css (tests/unit/motion.test.ts
// keeps both in step), and Motion and NumberFlow through the exports below.

/** Durations in milliseconds. */
export const DURATION = { quick: 120, base: 200, slow: 320, deliberate: 600 } as const;

/** Cubic-bezier control points: `standard` for most moves, `emphasized` for things arriving. */
export const EASING = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.05, 0.7, 0.1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Springs. The sheet is stiff with light damping (a short, firm settle); UI springs are gentle. */
export const SPRING = {
  sheet: { type: "spring", stiffness: 520, damping: 36, mass: 1 },
  ui: { type: "spring", stiffness: 220, damping: 28, mass: 1 },
} as const;

export type SpringToken = (typeof SPRING)[keyof typeof SPRING];

/** A CSS easing string for an EASING token. */
export function cssEasing(curve: readonly [number, number, number, number]): string {
  return `cubic-bezier(${curve.join(", ")})`;
}

/** Below 1 a spring overshoots; the lower, the more it bounces. */
export function dampingRatio(spring: SpringToken): number {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}

/** Motion takes seconds. */
export const seconds = (ms: number): number => ms / 1000;

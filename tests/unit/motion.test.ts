import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { DURATION, EASING, SPRING, cssEasing, dampingRatio, seconds } from "@/motion/tokens";
import { clockParts } from "@/model/time";
import { cancelChoreography, choreographyCancelled } from "@/ui/choreography";
import { Store } from "@/ui/store";

const css = readFileSync("src/app/globals.css", "utf8");
const cssVar = (name: string) => new RegExp(`${name}:\s*([^;]+);`).exec(css)?.[1].trim();

describe("motion tokens", () => {
  it("uses the four durations, 120, 200, 320 and 600 ms, in TypeScript and CSS alike", () => {
    expect(Object.values(DURATION)).toEqual([120, 200, 320, 600]);
    expect(cssVar("--motion-quick")).toBe("120ms");
    expect(cssVar("--motion-base")).toBe("200ms");
    expect(cssVar("--motion-slow")).toBe("320ms");
    expect(cssVar("--motion-deliberate")).toBe("600ms");
    expect(seconds(DURATION.base)).toBe(0.2);
  });

  it("has a standard and an emphasized easing, the same in CSS", () => {
    expect(Object.keys(EASING)).toEqual(["standard", "emphasized"]);
    expect(cssVar("--ease-standard")).toBe(cssEasing(EASING.standard));
    expect(cssVar("--ease-emphasized")).toBe(cssEasing(EASING.emphasized));
  });

  it("makes the sheet spring stiff with light damping and the UI spring gentle", () => {
    expect(SPRING.sheet.stiffness).toBeGreaterThan(SPRING.ui.stiffness * 2);
    // Light damping: a small overshoot, settling fast.
    expect(dampingRatio(SPRING.sheet)).toBeGreaterThan(0.7);
    expect(dampingRatio(SPRING.sheet)).toBeLessThan(0.85);
    // Gentle: nearly no overshoot.
    expect(dampingRatio(SPRING.ui)).toBeGreaterThan(0.9);
    expect(dampingRatio(SPRING.ui)).toBeLessThan(1);
  });
});

describe("Store", () => {
  it("notifies subscribers only when the value changes", () => {
    const store = new Store<number | null>(null);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set(null);
    expect(listener).not.toHaveBeenCalled();
    store.set(3);
    expect(store.get()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set(4);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("choreography", () => {
  it("is cancelled once, for good", () => {
    expect(choreographyCancelled.get()).toBe(false);
    cancelChoreography();
    cancelChoreography();
    expect(choreographyCancelled.get()).toBe(true);
  });
});

describe("clockParts", () => {
  it("splits a time for the rolling clock", () => {
    expect(clockParts(572)).toEqual({ hour: 9, minute: 32, meridiem: "AM" });
    expect(clockParts(720)).toEqual({ hour: 12, minute: 0, meridiem: "PM" });
    expect(clockParts(1080.6)).toEqual({ hour: 6, minute: 1, meridiem: "PM" });
  });
});

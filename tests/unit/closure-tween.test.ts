import { describe, expect, it } from "vitest";
import { ClosureTween } from "@/map/closure-tween";

function collect(tween: ClosureTween, now: number) {
  const sent = new Map<number, number>();
  const animating = tween.step(now, (i, v) => sent.set(i, v));
  return { sent, animating };
}

describe("ClosureTween", () => {
  it("sends every segment's state once, without animating, on the first retarget", () => {
    const tween = new ClosureTween(3, 400);
    expect(tween.retarget((i) => i !== 1, 0)).toBe(true);
    const { sent, animating } = collect(tween, 0);
    expect([...sent]).toEqual([
      [0, 1],
      [1, 0],
      [2, 1],
    ]);
    expect(animating).toBe(false);
    expect(collect(tween, 16).sent.size).toBe(0);
  });

  it("tweens only the segments that changed, over the duration", () => {
    const tween = new ClosureTween(3, 400);
    tween.retarget(() => false, 0);
    collect(tween, 0);
    expect(tween.retarget((i) => i === 2, 1000)).toBe(true);
    expect(tween.retarget((i) => i === 2, 1000)).toBe(false);

    const mid = collect(tween, 1200);
    expect([...mid.sent.keys()]).toEqual([2]);
    expect(mid.sent.get(2)).toBeCloseTo(0.5, 6);
    expect(mid.animating).toBe(true);

    const end = collect(tween, 1400);
    expect(end.sent.get(2)).toBe(1);
    expect(end.animating).toBe(false);
    expect(collect(tween, 1500).sent.size).toBe(0);
  });

  it("reverses from wherever a segment is mid-tween", () => {
    const tween = new ClosureTween(1, 400);
    tween.retarget(() => false, 0);
    collect(tween, 0);
    tween.retarget(() => true, 0);
    const quarter = collect(tween, 100).sent.get(0) as number; // smoothstep(0.25) = 0.15625
    expect(quarter).toBeCloseTo(0.15625, 6);
    tween.retarget(() => false, 100);
    expect(collect(tween, 100).sent.size).toBe(0);
    expect(collect(tween, 300).sent.get(0)).toBeCloseTo(0.078125, 6);
    expect(collect(tween, 500).sent.get(0)).toBe(0);
  });

  it("jumps straight to the target when the duration is zero (reduced motion)", () => {
    const tween = new ClosureTween(1, 0);
    tween.retarget(() => false, 0);
    collect(tween, 0);
    tween.retarget(() => true, 10);
    const { sent, animating } = collect(tween, 10);
    expect(sent.get(0)).toBe(1);
    expect(animating).toBe(false);
  });

  it("re-sends everything after resend()", () => {
    const tween = new ClosureTween(2, 400);
    tween.retarget(() => true, 0);
    collect(tween, 0);
    tween.resend();
    expect([...collect(tween, 50).sent]).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });
});

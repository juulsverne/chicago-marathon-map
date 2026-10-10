import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToDateChanges } from "@/ui/date-subscription";

let listeners: Map<string, Set<() => void>>;
let doc: {
  hidden: boolean;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

function dispatch(type: string) {
  for (const fn of listeners.get(type) ?? []) fn();
}

beforeEach(() => {
  vi.useFakeTimers();
  listeners = new Map();
  doc = {
    hidden: false,
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
  };
  vi.stubGlobal("document", doc);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("subscribeToDateChanges", () => {
  it("fires every 60 seconds while the tab is visible", () => {
    const callback = vi.fn();
    const stop = subscribeToDateChanges(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(59_999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120_000);
    expect(callback).toHaveBeenCalledTimes(3);
    stop();
  });

  it("fires when the tab becomes visible again and restarts the minute count", () => {
    const callback = vi.fn();
    const stop = subscribeToDateChanges(callback);
    vi.advanceTimersByTime(30_000);
    doc.hidden = true;
    dispatch("visibilitychange");
    expect(callback).not.toHaveBeenCalled();

    doc.hidden = false;
    dispatch("visibilitychange");
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(59_999);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(2);
    stop();
  });

  it("runs no interval while the tab is hidden", () => {
    const callback = vi.fn();
    doc.hidden = true;
    const stop = subscribeToDateChanges(callback);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10 * 60_000);
    expect(callback).not.toHaveBeenCalled();

    doc.hidden = false;
    dispatch("visibilitychange");
    expect(vi.getTimerCount()).toBe(1);
    doc.hidden = true;
    dispatch("visibilitychange");
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it("never stacks intervals when visibility flips repeatedly", () => {
    const stop = subscribeToDateChanges(vi.fn());
    dispatch("visibilitychange");
    dispatch("visibilitychange");
    expect(vi.getTimerCount()).toBe(1);
    stop();
  });

  it("cleanup removes the listener and the interval", () => {
    const callback = vi.fn();
    const stop = subscribeToDateChanges(callback);
    expect(listeners.get("visibilitychange")?.size).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(listeners.get("visibilitychange")?.size ?? 0).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5 * 60_000);
    dispatch("visibilitychange");
    expect(callback).not.toHaveBeenCalled();
  });
});

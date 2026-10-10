import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { throttleSubscribe } from "@/ui/throttle";

/** A store stand-in: `emit` fires the current listener, `unsubscribe` is observable. */
function fakeStore() {
  let listener: () => void = () => undefined;
  const unsubscribe = vi.fn();
  return {
    subscribe: (cb: () => void) => {
      listener = cb;
      return unsubscribe;
    },
    emit: () => listener(),
    unsubscribe,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("throttleSubscribe", () => {
  it("notifies at once on the first change", () => {
    const store = fakeStore();
    const notify = vi.fn();
    throttleSubscribe(store.subscribe, 10)(notify); // 100 ms gap
    store.emit();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst inside one gap into a single trailing notify at the gap's end", () => {
    const store = fakeStore();
    const notify = vi.fn();
    throttleSubscribe(store.subscribe, 10)(notify); // 100 ms gap
    store.emit(); // t=0, leading
    vi.advanceTimersByTime(10);
    store.emit(); // t=10, schedules the trailing notify for t=100
    vi.advanceTimersByTime(10);
    store.emit(); // t=20
    vi.advanceTimersByTime(10);
    store.emit(); // t=30
    expect(notify).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(69); // t=99
    expect(notify).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1); // t=100
    expect(notify).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(500);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("unsubscribing clears a pending trailing notify", () => {
    const store = fakeStore();
    const notify = vi.fn();
    const cleanup = throttleSubscribe(store.subscribe, 10)(notify);
    store.emit(); // leading
    vi.advanceTimersByTime(10);
    store.emit(); // schedules a trailing notify
    expect(vi.getTimerCount()).toBe(1);

    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect(store.unsubscribe).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

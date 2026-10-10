import { describe, expect, it, vi } from "vitest";
import { Flag } from "@/ui/flag";

describe("Flag", () => {
  it("notifies subscribers only when the value changes", () => {
    const flag = new Flag(true);
    const listener = vi.fn();
    const unsubscribe = flag.subscribe(listener);
    flag.set(true);
    expect(listener).not.toHaveBeenCalled();
    flag.set(false);
    expect(flag.get()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    flag.set(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

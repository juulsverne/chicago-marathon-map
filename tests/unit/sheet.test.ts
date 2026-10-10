import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextSnap, settleSnap } from "@/ui/panel/sheet-state";

describe("sheet snaps", () => {
  const offsets = { full: 0, half: 400, peek: 640 };

  it("settles on the snap nearest to where the sheet would coast", () => {
    expect(settleSnap(offsets, 380, 0)).toBe("half");
    expect(settleSnap(offsets, 180, 0)).toBe("full");
    expect(settleSnap(offsets, 560, 0)).toBe("peek");
    // A flick carries it on: from 300 px moving down at 2,000 px/s it coasts to 700.
    expect(settleSnap(offsets, 300, 2000)).toBe("peek");
    expect(settleSnap(offsets, 450, -1500)).toBe("full");
  });

  it("steps from the handle like v1: peek to half, half to full, full to half", () => {
    expect(nextSnap("peek")).toBe("half");
    expect(nextSnap("half")).toBe("full");
    expect(nextSnap("full")).toBe("half");
  });
});

describe("overlays and the Back gesture", () => {
  // A minimal browser history: entries, pushState, and back() firing popstate later.
  let entries: unknown[];
  let listeners: (() => void)[];
  const back = () => {
    entries.pop();
    setTimeout(() => listeners.forEach((l) => l()), 0);
  };

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    entries = ["page"];
    listeners = [];
    vi.stubGlobal("window", { addEventListener: (_type: string, l: () => void) => listeners.push(l) });
    vi.stubGlobal("history", { pushState: (state: unknown) => entries.push(state), back: vi.fn(back) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("pushes one entry per overlay and closes the top one on Back", async () => {
    const { openOverlay, isOverlayOpen } = await import("@/ui/overlays");
    const closeCard = vi.fn();
    const closeSheet = vi.fn();
    openOverlay("card", closeCard);
    openOverlay("card", closeCard); // already open: no second entry
    openOverlay("sheet", closeSheet);
    expect(entries).toHaveLength(3);
    back(); // the user presses Back
    vi.runAllTimers();
    expect(closeSheet).toHaveBeenCalledTimes(1);
    expect(closeCard).not.toHaveBeenCalled();
    expect(isOverlayOpen("sheet")).toBe(false);
    back();
    vi.runAllTimers();
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(entries).toEqual(["page"]);
  });

  it("goes back by itself when the UI closes the top overlay, without closing anything else", async () => {
    const { closeOverlay, openOverlay } = await import("@/ui/overlays");
    const closeCard = vi.fn();
    openOverlay("card", closeCard);
    closeOverlay("card");
    expect(history.back).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(closeCard).not.toHaveBeenCalled();
    expect(entries).toEqual(["page"]);
  });
});

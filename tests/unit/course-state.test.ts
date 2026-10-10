import { describe, expect, it } from "vitest";
import { CourseStateStore } from "@/map/course-state";
import type { CourseState } from "@/map/style";

function make(count = 3) {
  const writes: [number, CourseState][] = [];
  const store = new CourseStateStore(count, (id, state) => writes.push([id, state]));
  return { store, writes };
}

describe("CourseStateStore", () => {
  it("keeps state but writes nothing until the style is ready", () => {
    const { store, writes } = make();
    store.setClosed(0, 1);
    store.setFlag(1, "selected", true);
    expect(store.ready).toBe(false);
    expect(writes).toEqual([]);
  });

  it("writes every segment's full stored state when it becomes ready", () => {
    const { store, writes } = make();
    store.setClosed(0, 1);
    store.setClosed(1, 0.25);
    store.setClosed(2, 0);
    store.setFlag(1, "selected", true);
    store.setFlag(2, "hover", true);
    store.setReady(true);
    expect(writes).toEqual([
      [0, { closed: 1, selected: false, hover: false }],
      [1, { closed: 0.25, selected: true, hover: false }],
      [2, { closed: 0, selected: false, hover: true }],
    ]);
  });

  it("omits `closed` for a segment that never got a value", () => {
    const { store, writes } = make(2);
    store.setClosed(1, 1);
    store.setReady(true);
    expect(writes).toEqual([
      [0, { selected: false, hover: false }],
      [1, { closed: 1, selected: false, hover: false }],
    ]);
  });

  it("writes only what changed once the style is ready", () => {
    const { store, writes } = make();
    store.setReady(true);
    writes.length = 0;
    store.setClosed(1, 0.5);
    store.setFlag(2, "hover", true);
    store.setFlag(2, "hover", true); // unchanged: not written again
    store.setFlag(2, "selected", false); // unchanged
    store.setFlag(2, "hover", false);
    expect(writes).toEqual([
      [1, { closed: 0.5 }],
      [2, { hover: true }],
      [2, { hover: false }],
    ]);
  });

  it("keeps every change made while the style is not ready, and writes the latest on restore", () => {
    const { store, writes } = make();
    store.setClosed(0, 0);
    store.setClosed(1, 1);
    store.setClosed(2, 1);
    store.setFlag(0, "selected", true);
    store.setReady(true);
    writes.length = 0;

    store.setReady(false); // the context was lost
    store.setClosed(1, 0.4); // the clock moved while lost
    store.setClosed(1, 0);
    store.setFlag(2, "hover", true);
    store.setFlag(0, "selected", false);
    store.setFlag(0, "selected", true);
    expect(writes).toEqual([]);

    store.setReady(true); // the rebuilt style has loaded
    expect(writes).toEqual([
      [0, { closed: 0, selected: true, hover: false }],
      [1, { closed: 0, selected: false, hover: false }],
      [2, { closed: 1, selected: false, hover: true }],
    ]);
  });

  it("flush writes everything again when ready, and nothing when not", () => {
    const { store, writes } = make(1);
    store.setClosed(0, 1);
    store.flush();
    expect(writes).toEqual([]);
    store.setReady(true);
    writes.length = 0;
    store.flush();
    expect(writes).toEqual([[0, { closed: 1, selected: false, hover: false }]]);
  });

  it("does not flush again when told it is ready twice", () => {
    const { store, writes } = make(1);
    store.setReady(true);
    writes.length = 0;
    store.setReady(true);
    expect(writes).toEqual([]);
  });

  it("rejects a segment that does not exist", () => {
    const { store } = make(3);
    expect(() => store.setClosed(3, 1)).toThrow(RangeError);
    expect(() => store.setFlag(-1, "hover", true)).toThrow(RangeError);
    expect(() => store.setFlag(1.5, "selected", true)).toThrow(RangeError);
  });
});

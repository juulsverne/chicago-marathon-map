"use client";

import { animate, motionValue, type AnimationPlaybackControlsWithThen } from "motion/react";
import { useEffect } from "react";
import { PANEL_COPY } from "@/content/panel-copy";
import { SPRING } from "@/motion/tokens";
import { notifyLayout } from "../layout-event";
import { closeOverlay, openOverlay } from "../overlays";
import { nextSnap, settleSnap, sheetSnap, type Snap } from "./sheet-state";

// The phone sheet's gesture and physics. It drives the prerendered
// sheet by transform only: while a drag or a spring runs, the sheet and the
// UI riding above it get inline transforms; when it settles, main[data-snap] takes the
// new snap and the inline transforms go, so CSS holds the position at rest. The snap
// offsets are read from that CSS, so the stylesheet stays their single source.
//
// Drag only from the sheet's head (handle, summary, tab bar) or, inside the scroller,
// when its content is at the top: there a downward drag always moves the sheet and an
// upward drag moves it unless it is already full. Otherwise the content scrolls natively.

const PHONE = "(max-width: 47.99rem)";
const DRAG_SLOP = 6;
const RUBBER = 0.15;
const SNAPS = ["peek", "half", "full"] as const;

/** Mounted once by the panel; does nothing above phone width. */
export function SheetController() {
  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    let detach = () => {};
    const sync = () => {
      detach();
      detach = phone.matches ? attach() : () => {};
    };
    sync();
    phone.addEventListener("change", sync);
    return () => {
      phone.removeEventListener("change", sync);
      detach();
    };
  }, []);
  return null;
}

function attach(): () => void {
  const main = document.querySelector("main");
  const sheet = document.querySelector<HTMLElement>('[data-testid="panel"]');
  const handle = sheet?.querySelector<HTMLElement>("[data-sheet-handle]");
  const summary = sheet?.querySelector<HTMLElement>("[data-sheet-summary]");
  const scroller = sheet?.querySelector<HTMLElement>("[data-panel-scroll]");
  if (!main || !sheet || !handle || !scroller) return () => {};
  const riders = Array.from(document.querySelectorAll<HTMLElement>(".rides-sheet"));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The snap the CSS shows now, and each snap's translateY in px, read from the CSS.
  let committed = (main.dataset.snap as Snap | undefined) ?? "half";
  let offsets: Record<Snap, number> = { peek: 0, half: 0, full: 0 };
  const measure = () => {
    const transform = sheet.style.transform;
    sheet.style.transform = "";
    for (const snap of SNAPS) {
      main.dataset.snap = snap;
      offsets = { ...offsets, [snap]: new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42 };
    }
    main.dataset.snap = committed;
    sheet.style.transform = transform;
  };
  measure();

  const y = motionValue(offsets[committed]);
  const unsubscribeY = y.on("change", (v) => {
    sheet.style.transform = `translate3d(0, ${v}px, 0)`;
    for (const r of riders) r.style.transform = `translate3d(0, ${v - offsets[committed]}px, 0)`;
  });
  let spring: AnimationPlaybackControlsWithThen | null = null;
  let animating = false;
  // Gesture state.
  let startY = 0;
  let startOffset = 0;
  let inScroller = false;
  let decided: "drag" | "scroll" | null = null;
  let dragging = false;

  // At rest: CSS owns the position again.
  const settle = (snap: Snap) => {
    committed = snap;
    main.dataset.snap = snap;
    sheet.style.transform = "";
    for (const r of riders) r.style.transform = "";
    notifyLayout(); // the map's uncovered area changed (Recenter)
  };

  const moveTo = (snap: Snap, velocity = 0) => {
    spring?.stop();
    if (reduced()) {
      y.jump(offsets[snap]);
      settle(snap);
      return;
    }
    animating = true;
    spring = animate(y, offsets[snap], { ...SPRING.sheet, velocity });
    spring.then(() => {
      animating = false;
      if (sheetSnap.get() === snap) settle(snap);
    });
  };

  // The handle is a button for keyboards and screen readers.
  const label = () => {
    const snap = sheetSnap.get();
    handle.setAttribute("aria-label", snap === "peek" ? PANEL_COPY.sheetShow : snap === "half" ? PANEL_COPY.sheetExpand : PANEL_COPY.sheetShrink);
  };
  handle.setAttribute("role", "button");
  handle.tabIndex = 0;
  label();

  // Store -> sheet: animate to whatever snap the rest of the UI asks for; the full snap
  // owns one history entry, so Back lowers the sheet instead of leaving.
  let last = sheetSnap.get();
  const unsubscribeSnap = sheetSnap.subscribe(() => {
    const snap = sheetSnap.get();
    label();
    if (snap === "full" && last !== "full") openOverlay("sheet", () => sheetSnap.set("half"));
    if (snap !== "full" && last === "full") closeOverlay("sheet");
    last = snap;
    if (!dragging) moveTo(snap, y.getVelocity());
  });
  // A sheet left at another snap by the prerendered page (it is always "peek") starts in step.
  if (committed !== sheetSnap.get()) moveTo(sheetSnap.get());

  // The gesture. Touch events, so a drag can cancel native scrolling on its first move.
  const begin = (clientY: number, target: EventTarget | null) => {
    startY = clientY;
    inScroller = target instanceof Node && scroller.contains(target);
    decided = null;
  };
  const decide = (dy: number): "drag" | "scroll" => {
    if (!inScroller) return "drag";
    if (scroller.scrollTop > 0) return "scroll";
    return dy > 0 || sheetSnap.get() !== "full" ? "drag" : "scroll";
  };
  const drag = (clientY: number) => {
    const raw = startOffset + clientY - startY;
    const min = offsets.full;
    const max = offsets.peek;
    y.set(raw < min ? min - (min - raw) * RUBBER : raw > max ? max + (raw - max) * RUBBER : raw);
  };
  const startDrag = () => {
    spring?.stop();
    startOffset = y.get();
    dragging = true;
  };
  const release = () => {
    dragging = false;
    const velocity = y.getVelocity();
    const snap = settleSnap(offsets, y.get(), velocity);
    if (snap === sheetSnap.get()) moveTo(snap, velocity);
    else sheetSnap.set(snap); // the subscription animates and keeps history in step
  };
  // A tap on the handle or the summary line steps through the snaps, as v1's handle did.
  const tap = (target: EventTarget | null) => {
    if (target instanceof Node && (handle.contains(target) || summary?.contains(target))) sheetSnap.set(nextSnap(sheetSnap.get()));
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    begin(e.touches[0].clientY, e.target);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1 || decided === "scroll") return;
    const clientY = e.touches[0].clientY;
    if (decided === null) {
      if (Math.abs(clientY - startY) < DRAG_SLOP) return;
      decided = decide(clientY - startY);
      if (decided === "scroll") return;
      startDrag();
      startY = clientY;
    }
    if (e.cancelable) e.preventDefault();
    drag(clientY);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (decided === "drag") release();
    else if (decided === null) tap(e.target);
    decided = null;
  };

  // A mouse or pen drags from the head only (phones are touch; this is for small desktop windows).
  let pointerId = -1;
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.button !== 0 || scroller.contains(e.target as Node)) return;
    pointerId = e.pointerId;
    begin(e.clientY, e.target);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (decided === null) {
      if (Math.abs(e.clientY - startY) < DRAG_SLOP) return;
      decided = "drag";
      sheet.setPointerCapture(e.pointerId);
      startDrag();
      startY = e.clientY;
    }
    drag(e.clientY);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    if (decided === "drag") release();
    else tap(e.target);
    decided = null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    sheetSnap.set(nextSnap(sheetSnap.get()));
  };
  const onResize = () => {
    measure();
    if (!dragging && !animating) y.jump(offsets[committed]);
  };

  sheet.addEventListener("touchstart", onTouchStart, { passive: true });
  sheet.addEventListener("touchmove", onTouchMove, { passive: false });
  sheet.addEventListener("touchend", onTouchEnd);
  sheet.addEventListener("touchcancel", onTouchEnd);
  sheet.addEventListener("pointerdown", onPointerDown);
  sheet.addEventListener("pointermove", onPointerMove);
  sheet.addEventListener("pointerup", onPointerUp);
  sheet.addEventListener("pointercancel", onPointerUp);
  handle.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);

  return () => {
    sheet.removeEventListener("touchstart", onTouchStart);
    sheet.removeEventListener("touchmove", onTouchMove);
    sheet.removeEventListener("touchend", onTouchEnd);
    sheet.removeEventListener("touchcancel", onTouchEnd);
    sheet.removeEventListener("pointerdown", onPointerDown);
    sheet.removeEventListener("pointermove", onPointerMove);
    sheet.removeEventListener("pointerup", onPointerUp);
    sheet.removeEventListener("pointercancel", onPointerUp);
    handle.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    unsubscribeSnap();
    unsubscribeY();
    spring?.stop();
    settle(committed);
    handle.removeAttribute("role");
    handle.removeAttribute("aria-label");
    handle.removeAttribute("tabindex");
  };
}

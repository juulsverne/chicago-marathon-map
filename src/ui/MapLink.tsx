"use client";

import { animate } from "motion/react";
import { useEffect } from "react";
import type { LngLatPair } from "@/map/camera";
import { useStage } from "@/map/stage-context";
import { SPRING } from "@/motion/tokens";
import { nearestClosure } from "@/model/nearest";
import { clearSelection, selectSegment, selection } from "./selection";
import { revealSpot, setPin, spot } from "./spot";

/** Connects the selection and the pinned spot to the map engine: a tap on
 *  the course selects that street and a tap beside it clears the selection (or, while
 *  picking, drops the pin); the selected segment glows (the engine's `selected` flag) and
 *  the camera eases to it once the card has laid out; the pin lands with a spring and a
 *  dashed line runs to the nearest closure. Renders nothing. Mounted inside the map
 *  stage, so it sees the engine when it starts. */
export function MapLink() {
  const api = useStage().api;

  useEffect(() => {
    if (!api) return;
    let shown: number | null = null;
    let frame = 0;
    const show = () => {
      const next = selection.get()?.index ?? null;
      if (next === shown) return;
      if (shown !== null) api.setSegmentFlag(shown, "selected", false);
      if (next !== null) api.setSegmentFlag(next, "selected", true);
      shown = next;
      cancelAnimationFrame(frame);
      // A frame later, so the fit padding includes the card that just opened.
      if (next !== null) frame = requestAnimationFrame(() => api.fitSegment(next));
    };
    show();
    const unsubscribe = selection.subscribe(show);
    const untap = api.onTap((tap) => {
      if (spot.get().picking) {
        setPin([tap.lngLat[1], tap.lngLat[0]]);
        revealSpot();
        return;
      }
      if (tap.segment !== null) selectSegment(tap.segment, "map");
      else clearSelection();
    });

    let shownPin: string | null = null;
    const showSpot = () => {
      const s = spot.get();
      api.setPicking(s.picking);
      const key = s.pin ? s.pin.join(",") : null;
      if (key === shownPin) return;
      shownPin = key;
      const near = s.pin ? nearestClosure(s.pin) : null;
      if (!s.pin || !near || near.kind === "outside") {
        api.setSpot(null);
        return;
      }
      const pin: LngLatPair = [s.pin[1], s.pin[0]];
      const graphic = api.setSpot({ pin, nearest: near.kind === "near" ? [near.point[1], near.point[0]] : null });
      if (s.from === "location") api.centerOn(pin);
      if (graphic && s.from !== "saved" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animate(graphic, { y: [-28, 0], scale: [0.7, 1] }, SPRING.ui);
      }
    };
    showSpot();
    const unsubscribeSpot = spot.subscribe(showSpot);
    return () => {
      unsubscribe();
      unsubscribeSpot();
      untap();
      cancelAnimationFrame(frame);
      if (shown !== null) api.setSegmentFlag(shown, "selected", false);
    };
  }, [api]);

  return null;
}

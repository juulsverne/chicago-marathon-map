"use client";

import { useEffect } from "react";
import { KEY_COPY } from "@/content/map-key";
import { useStage } from "@/map/stage-context";
import { selection } from "../selection";
import { spot } from "../spot";
import { KEY_ID, peoplePerDot } from "./map-key";

/** The key's runner line, live: how many people a dot stands for at the tier MapLibre
 *  runs at (it starts at the High tier's figure); the simple map draws no dots. */
export function KeyRunners() {
  const { engine, tier } = useStage();
  const r = KEY_COPY.runners;
  return (
    <>
      <b className="font-semibold text-fg">{r.label}</b>
      {engine === "fallback" ? r.simple : r.rest(peoplePerDot(tier ?? "high"))}
    </>
  );
}

/** Closes the key when a street is picked or a pin is being dropped (v1). Renders nothing. */
export function KeyDismiss() {
  useEffect(() => {
    const key = document.getElementById(KEY_ID);
    if (!key) return;
    const close = () => {
      if (key.matches(":popover-open")) key.hidePopover();
    };
    const unsubscribeSelection = selection.subscribe(() => {
      if (selection.get()) close();
    });
    const unsubscribeSpot = spot.subscribe(() => {
      if (spot.get().picking) close();
    });
    return () => {
      unsubscribeSelection();
      unsubscribeSpot();
    };
  }, []);
  return null;
}

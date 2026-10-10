"use client";

import { useEffect } from "react";
import { SEGMENTS } from "@/model/course";
import { readShareLink } from "@/model/share-link";
import { selectSegment } from "../selection";

let applied = false;

/** Selects a shared link's street once per page load, when the interaction
 *  layer arrives; a slug that names no closure is ignored. The link's moment was
 *  applied at hydration (src/ui/clock-context.tsx). Renders nothing. */
export function SharedStreet() {
  useEffect(() => {
    if (applied) return;
    applied = true;
    const { slug } = readShareLink(window.location.search);
    const index = slug === null ? -1 : SEGMENTS.findIndex((s) => s.slug === slug);
    if (index >= 0) selectSegment(index, "link");
  }, []);
  return null;
}

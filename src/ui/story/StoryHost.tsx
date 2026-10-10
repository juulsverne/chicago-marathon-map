"use client";

import { Suspense, lazy, useSyncExternalStore } from "react";
import { storyOpen } from "./story-state";

// The story's code (its copy, the course map and GSAP) loads only when it opens.
const Story = lazy(() => import("./Story"));

/** Renders the story while it is open (an interaction-layer island). */
export function StoryHost() {
  const open = useSyncExternalStore(storyOpen.subscribe, storyOpen.get, () => false);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <Story />
    </Suspense>
  );
}

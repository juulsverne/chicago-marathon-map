"use client";

import { STORY_ENTRY } from "@/content/story-entry";
import { STORY_BUTTON } from "./StoryEntry";
import { openStory } from "./story-state";

/** The live "How it was built" button (an interaction-layer island). */
export function StoryButton() {
  return (
    <button type="button" className={STORY_BUTTON} data-testid="story-open" onClick={(e) => openStory(e.currentTarget)}>
      {STORY_ENTRY.button}
    </button>
  );
}

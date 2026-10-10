import { STORY_ENTRY } from "@/content/story-entry";
import { Upgrade } from "../Upgrade";

/** The look the prerendered button and the live one share, so nothing shifts on upgrade. */
export const STORY_BUTTON =
  "pressable mt-3 inline-flex min-h-11 items-center rounded-full bg-fg px-5 text-sm font-semibold text-bg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open";

/** "How it was built": a card that opens the story. A server component; the
 *  button works once the interaction layer has loaded. */
export function StoryEntry() {
  return (
    <section aria-labelledby="story-entry-title" className="rounded-lg bg-panel-2 px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{STORY_ENTRY.eyebrow}</p>
      <h3 id="story-entry-title" className="mt-1 font-display text-lg font-bold uppercase leading-tight tracking-wide text-fg">
        {STORY_ENTRY.title}
      </h3>
      <Upgrade name="storyButton">
        {/* Disabled until the interaction layer upgrades it to the working button. */}
        <button type="button" disabled className={STORY_BUTTON} data-testid="story-open">
          {STORY_ENTRY.button}
        </button>
      </Upgrade>
    </section>
  );
}

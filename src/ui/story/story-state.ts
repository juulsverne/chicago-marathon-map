import { cancelChoreography } from "../choreography";
import { closeOverlay, openOverlay } from "../overlays";
import { Store } from "../store";

// Whether "How it was built" is open. Opening it pushes one history entry, so Back
// closes it instead of leaving the page; focus goes back to the control
// that opened it.

export const storyOpen = new Store(false);

let opener: HTMLElement | null = null;

function restoreFocus() {
  const el = opener;
  opener = null;
  if (el) requestAnimationFrame(() => el.focus());
}

export function openStory(trigger: HTMLElement | null): void {
  if (storyOpen.get()) return;
  opener = trigger;
  cancelChoreography(); // a UI action, like a tab change
  storyOpen.set(true);
  openOverlay("story", () => {
    storyOpen.set(false);
    restoreFocus();
  });
}

export function closeStory(): void {
  if (!storyOpen.get()) return;
  storyOpen.set(false);
  closeOverlay("story");
  restoreFocus();
}

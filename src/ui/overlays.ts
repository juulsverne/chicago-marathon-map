// Back closes the top-most overlay instead of leaving the page (in
// LinkedIn's in-app browser, Back can exit entirely). Opening an overlay (the street
// card, the phone sheet at its full snap; the story) pushes one history
// entry; Back pops it and closes that overlay. Closing an overlay from the UI goes
// back one entry itself when it is the top one, so Back never has to be pressed twice.
// An overlay closed from the UI while another sits above it leaves its entry behind;
// the next Back then closes whatever overlay is on top, which is what Back should do.

type Entry = { id: string; close: () => void };

const stack: Entry[] = [];
let ignoredPops = 0;
let listening = false;

function onPopState() {
  if (ignoredPops > 0) {
    ignoredPops--;
    return;
  }
  stack.pop()?.close();
}

/** Pushes a history entry for an overlay that has just opened. `close` is called when
 *  Back pops it; it must close the overlay without calling closeOverlay. */
export function openOverlay(id: string, close: () => void): void {
  if (!listening) {
    window.addEventListener("popstate", onPopState);
    listening = true;
  }
  if (stack.some((e) => e.id === id)) return;
  stack.push({ id, close });
  history.pushState({ cmmOverlay: id }, "");
}

/** Call when the UI closes an overlay. */
export function closeOverlay(id: string): void {
  const i = stack.findIndex((e) => e.id === id);
  if (i < 0) return;
  const top = i === stack.length - 1;
  stack.splice(i, 1);
  if (top) {
    ignoredPops++;
    history.back();
  }
}

export function isOverlayOpen(id: string): boolean {
  return stack.some((e) => e.id === id);
}

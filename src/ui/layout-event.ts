/** Fired when UI over the map settles into a new layout (the phone sheet at a new snap,
 *  the street card opening or closing), so the map engine can re-check what it shows. */
export const LAYOUT_EVENT = "cmm:layout";

export function notifyLayout(): void {
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

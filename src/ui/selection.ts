import { cancelChoreography } from "./choreography";
import { Store } from "./store";

/** The selected course segment and how it was chosen: a tap on the map, a
 *  row or block in the Streets tab, a shared link, or the nearest closure to a pin. The
 *  map engine glows it and eases the camera to it; the street card shows it. */
export type Selection = Readonly<{ index: number; via: "map" | "list" | "link" | "spot" }>;

export const selection = new Store<Selection | null>(null);

/** Selects a segment. A street tap cancels the opening choreography, and so
 *  does opening a shared link. */
export function selectSegment(index: number, via: Selection["via"]): void {
  cancelChoreography();
  const current = selection.get();
  if (current?.index === index && current.via === via) return;
  selection.set({ index, via });
}

export function clearSelection(): void {
  selection.set(null);
}

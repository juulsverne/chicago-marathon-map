import { Store } from "../store";

/** The phone sheet's snap point. The sheet controller animates to whatever
 *  this says and writes it back after a drag; other UI moves the sheet by setting it
 *  (a tab press opens a peeking sheet, a street pick lowers it so the map shows). */
export type Snap = "peek" | "half" | "full";

// Phones open at peek (the one-line summary) so the map, and the opening, show first; a tab
// press, the summary or the handle raises the sheet.
export const sheetSnap = new Store<Snap>("peek");

/** v1's handle cycle: peek to half, half to full, full back to half. */
export function nextSnap(snap: Snap): Snap {
  return snap === "half" ? "full" : "half";
}

/** The snap a released drag settles on: the one nearest to where the sheet would
 *  coast in 0.2 s at its release velocity (px/s, positive downward). `offsets` are the
 *  sheet's translateY at each snap. */
export function settleSnap(offsets: Readonly<Record<Snap, number>>, y: number, velocity: number): Snap {
  const projected = y + velocity * 0.2;
  let best: Snap = "half";
  for (const snap of ["peek", "half", "full"] as const) {
    if (Math.abs(offsets[snap] - projected) < Math.abs(offsets[best] - projected)) best = snap;
  }
  return best;
}

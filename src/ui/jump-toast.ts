import { Store } from "./store";

/** A jump to a key moment (a timeline pill or an agenda item), for v1's toast that names
 *  the moment. `n` lets a second jump to the same moment show the toast again. */
export const jumpToast = new Store<Readonly<{ t: number; n: number }> | null>(null);

let jumps = 0;

export function showJump(t: number): void {
  jumps += 1;
  jumpToast.set({ t, n: jumps });
}

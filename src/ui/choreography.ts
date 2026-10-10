import { Flag } from "./flag";

/** Any map drag, zoom or rotate, timeline touch, street tap or tab change
 *  cancels the opening camera choreography for the rest of the session, and so does
 *  opening a shared link. The map engine's choreography watches this flag; UI actions
 *  raise it. It never goes back to false. */
export const choreographyCancelled = new Flag(false);

export function cancelChoreography(): void {
  choreographyCancelled.set(true);
}

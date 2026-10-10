import { useSyncExternalStore } from "react";

/** Whether a media query matches, kept current. Interaction layer only (the server
 *  snapshot is false). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The phone layout: below 768 px. */
export const PHONE_QUERY = "(max-width: 47.99rem)";

import { useSyncExternalStore } from "react";

// The interaction layer (src/ui/interaction.tsx: tabs, sheet physics, street card,
// search, Check your spot, rolling digits, Motion) is one lazily loaded chunk, so
// it never counts against the 150 KB first-load budget.
// The prerendered panels work as plain HTML until it arrives, and every
// component that upgrades renders exactly the same box first, so nothing shifts.

type Interaction = typeof import("./interaction");

let loaded: Interaction | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Starts loading the interaction layer once. MapStage calls it right after it
 *  requests the map engine (or decides it cannot), after first paint. A failed
 *  load (a dropped connection) can be retried by calling again. */
export function loadInteraction(): void {
  if (requested) return;
  requested = true;
  import("./interaction").then(
    (module) => {
      loaded = module;
      for (const listener of listeners) listener();
    },
    () => {
      requested = false;
    },
  );
}

/** The interaction layer once it has loaded; null on the server, during hydration
 *  and until the chunk arrives. */
export function useInteraction(): Interaction | null {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}

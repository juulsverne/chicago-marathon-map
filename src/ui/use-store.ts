import { useSyncExternalStore } from "react";
import type { Store } from "./store";

/** A Store's value in React. Only for components that render on the client (the
 *  interaction layer), so the server snapshot is the store's current value. */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

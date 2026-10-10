/** A tiny external store for one value, for useSyncExternalStore and plain code alike
 *  (the selection, the sheet's snap point, the pace settings). `get` and `subscribe`
 *  are bound, so they can be passed around directly. */
export class Store<T> {
  private value: T;
  private readonly listeners = new Set<() => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get = (): T => this.value;

  set(next: T): void {
    if (Object.is(next, this.value)) return;
    this.value = next;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

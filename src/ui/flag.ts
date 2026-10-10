/** A boolean external store, such as "the map is on screen", that the frame loop
 *  can sleep on and React can subscribe to. */
export class Flag {
  private value: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(initial: boolean) {
    this.value = initial;
  }

  get = (): boolean => this.value;

  set(next: boolean): void {
    if (next === this.value) return;
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

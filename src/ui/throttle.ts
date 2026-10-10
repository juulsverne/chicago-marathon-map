/** Caps how often a store listener reaches React. The first change notifies at
 *  once; changes inside the gap collapse into one trailing notify when the gap
 *  ends, so the final value is always delivered. Cleanup cancels a pending
 *  trailing notify. `hz` is notifications per second. */
export function throttleSubscribe(
  subscribe: (listener: () => void) => () => void,
  hz: number,
): (notify: () => void) => () => void {
  return (notify) => {
    const gap = 1000 / hz;
    let last = -Infinity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe(() => {
      const now = performance.now();
      if (now - last >= gap) {
        last = now;
        notify();
      } else if (timer === undefined) {
        timer = setTimeout(() => {
          timer = undefined;
          last = performance.now();
          notify();
        }, gap - (now - last));
      }
    });
    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  };
}

const REFRESH_MS = 60_000;

/** Calls `callback` whenever the page may have outlived its date: when the tab
 *  becomes visible again, and once a minute while it stays visible. Hidden tabs run
 *  no timer. A store subscribe function for `useSyncExternalStore`. */
export function subscribeToDateChanges(callback: () => void): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const start = () => {
    stop();
    timer = setInterval(callback, REFRESH_MS);
  };
  const onVisibility = () => {
    if (document.hidden) {
      stop();
      return;
    }
    callback();
    start();
  };

  document.addEventListener("visibilitychange", onVisibility);
  if (!document.hidden) start();

  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

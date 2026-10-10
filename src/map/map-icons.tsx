// Icons for the map controls; they load with the engine, not with the shell.

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function FitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** v1's map pin, for Drop a pin. */
export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
      <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

export function RecenterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2">
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
    </svg>
  );
}

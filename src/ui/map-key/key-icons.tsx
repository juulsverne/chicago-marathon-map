import { KEY_COPY } from "@/content/map-key";

// The key's symbols, drawn like the map draws them (server components; colors are tokens).

const LINE = "M4 8h28";

function CourseLine({ tone }: { tone: "stroke-closed" | "stroke-open" }) {
  return (
    <svg viewBox="0 0 36 16" aria-hidden="true" className="h-4 w-9">
      <path d={LINE} className="stroke-bg" strokeWidth={8} strokeLinecap="round" />
      <path d={LINE} className={tone} strokeWidth={4.5} strokeLinecap="round" />
    </svg>
  );
}

export const ClosedIcon = () => <CourseLine tone="stroke-closed" />;
export const OpenIcon = () => <CourseLine tone="stroke-open" />;

export function RunnersIcon() {
  return (
    <svg viewBox="0 0 36 16" aria-hidden="true" className="h-4 w-9">
      <path d={LINE} className="stroke-bg" strokeWidth={8} strokeLinecap="round" />
      <path d={LINE} className="stroke-closed" strokeWidth={4.5} strokeLinecap="round" />
      {[7, 11, 14, 19, 22, 25, 30].map((x) => (
        <circle key={x} cx={x} cy={8} r={1.4} className="fill-fg" />
      ))}
    </svg>
  );
}

export function MileIcon() {
  return <span className="block w-9 text-center font-mono text-xs font-bold text-fg">{KEY_COPY.mile.tag}</span>;
}

export function StartIcon() {
  return <span className="block w-9 text-center font-display text-[11px] font-bold uppercase tracking-wide text-fg">{KEY_COPY.startFinish.tag}</span>;
}

function Dots({ tones }: { tones: readonly string[] }) {
  return (
    <span className="flex w-9 items-center justify-center -space-x-1">
      {tones.map((tone) => (
        <i key={tone} className={`size-3 rounded-full ring-2 ring-fg ${tone}`} />
      ))}
    </span>
  );
}

export const LeadersIcon = () => <Dots tones={["bg-leader-men", "bg-leader-wom", "bg-leader-wcm", "bg-leader-wcw"]} />;
export const RecordIcon = () => <Dots tones={["bg-leader-wr"]} />;
export const PaceIcon = () => <Dots tones={["bg-leader-you"]} />;

/** The timeline's shading as the dock draws it: red up to the thumb, grey after it. */
export function ShadingIcon() {
  return (
    <svg viewBox="0 0 36 16" aria-hidden="true" className="h-4 w-9">
      <defs>
        <clipPath id="key-shading-played">
          <rect width="18" height="16" />
        </clipPath>
      </defs>
      <path d="M2 14C9 14 10 3 16 3s9 11 18 11z" className="fill-fg/15" />
      <path d="M2 14C9 14 10 3 16 3s9 11 18 11z" clipPath="url(#key-shading-played)" className="fill-closed/45" />
      <path d="M18 14h16" className="stroke-line" strokeWidth={2} strokeLinecap="round" />
      <path d="M2 14h16" className="stroke-closed" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** The same pin the map drops (src/map/engine.ts). */
export function SpotIcon() {
  return (
    <svg viewBox="0 0 26 34" aria-hidden="true" className="mx-auto h-5 w-9">
      <path d="M13 33s11-10.2 11-19.3A11 11 0 0 0 2 13.7C2 22.8 13 33 13 33z" className="spot-pin-body" />
      <circle cx={13} cy={13} r={4.2} className="spot-pin-dot" />
    </svg>
  );
}

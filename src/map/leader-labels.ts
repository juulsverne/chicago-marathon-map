import type { Leader, LeaderId } from "@/content/race";

// Leader name pills over the map: plain DOM moved by CSS transforms, laid out
// with v1's overlap rule. Five elements updated per frame cost far less than a
// MapLibre symbol layer fed by setData every frame (a worker round trip and a
// symbol re-layout per frame).

/** A leader marker on screen, CSS px. `r` is the marker radius. */
export type LeaderPoint = Readonly<{ id: LeaderId; x: number; y: number; r: number }>;

export type LabelPlacement = Readonly<{
  id: LeaderId;
  /** Top-left corner of the pill. */
  x: number;
  y: number;
  /** True when the pill was pushed up and needs a line back to its marker. */
  lifted: boolean;
  line: readonly [x1: number, y1: number, x2: number, y2: number];
}>;

export const LABEL_HEIGHT = 20;
/** v1 showed leader labels from Leaflet zoom 12.25 (MapLibre 11.25). */
export const LABEL_MIN_ZOOM = 11.25;

/** v1's layout: each pill sits up and to the right of its marker; while it would
 *  overlap a pill placed earlier (in LEADERS order) it moves up 22 px, at most 4
 *  times. A lifted pill gets a line from the top of its marker. */
export function layoutLeaderLabels(points: readonly LeaderPoint[], widths: ReadonlyMap<LeaderId, number>): LabelPlacement[] {
  const placed: { x: number; y: number; w: number }[] = [];
  return points.map((p) => {
    const w = widths.get(p.id) ?? 0;
    const x = p.x + p.r + 5;
    let y = p.y - p.r - 13;
    const overlaps = () => placed.some((b) => x < b.x + b.w && x + w > b.x && Math.abs(y - b.y) < LABEL_HEIGHT + 1);
    for (let tries = 0; tries < 4 && overlaps(); tries++) y -= LABEL_HEIGHT + 2;
    placed.push({ x, y, w });
    const lifted = y < p.y - p.r - 14;
    return { id: p.id, x, y, lifted, line: [p.x, p.y - p.r, x + 6, y + LABEL_HEIGHT] };
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** The DOM for the leader labels, owned by the map engine. */
export class LeaderLabelOverlay {
  private readonly pills = new Map<LeaderId, HTMLSpanElement>();
  private readonly lines = new Map<LeaderId, SVGLineElement>();
  private readonly widths = new Map<LeaderId, number>();
  private readonly svg: SVGSVGElement;

  constructor(
    private readonly root: HTMLElement,
    leaders: readonly Leader[],
  ) {
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.setAttribute("class", "leader-lines");
    root.append(this.svg);
    for (const l of leaders) {
      const line = document.createElementNS(SVG_NS, "line");
      line.dataset.leader = l.id;
      line.style.visibility = "hidden";
      this.svg.append(line);
      this.lines.set(l.id, line);
      const pill = document.createElement("span");
      pill.className = "leader-label";
      pill.dataset.leader = l.id;
      pill.textContent = l.name;
      pill.style.visibility = "hidden";
      root.append(pill);
      this.pills.set(l.id, pill);
    }
    // Pill widths depend on the web font; measure again once it has loaded.
    void document.fonts?.ready.then(() => this.widths.clear());
  }

  /** Places the pills for the markers on screen; hides the rest. */
  update(points: readonly LeaderPoint[], zoom: number): void {
    const shown = zoom >= LABEL_MIN_ZOOM ? points : [];
    for (const p of shown) {
      if (!this.widths.has(p.id)) this.widths.set(p.id, this.pills.get(p.id)?.offsetWidth ?? 0);
    }
    const visible = new Set<LeaderId>();
    for (const place of layoutLeaderLabels(shown, this.widths)) {
      visible.add(place.id);
      const pill = this.pills.get(place.id);
      const line = this.lines.get(place.id);
      if (!pill || !line) continue;
      pill.style.transform = `translate3d(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px, 0)`;
      pill.style.visibility = "visible";
      if (place.lifted) {
        const [x1, y1, x2, y2] = place.line;
        line.setAttribute("x1", x1.toFixed(1));
        line.setAttribute("y1", y1.toFixed(1));
        line.setAttribute("x2", x2.toFixed(1));
        line.setAttribute("y2", y2.toFixed(1));
        line.style.visibility = "visible";
      } else {
        line.style.visibility = "hidden";
      }
    }
    for (const [id, pill] of this.pills) {
      if (visible.has(id)) continue;
      pill.style.visibility = "hidden";
      const line = this.lines.get(id);
      if (line) line.style.visibility = "hidden";
    }
  }

  destroy(): void {
    this.root.replaceChildren();
  }
}

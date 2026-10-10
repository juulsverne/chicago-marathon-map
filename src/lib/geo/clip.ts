export type XY = readonly [number, number];
export type Box = Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;

type Side = Readonly<{ inside: (p: XY) => boolean; cut: (a: XY, b: XY) => XY }>;

function sides(box: Box): Side[] {
  const atX = (x: number) => (a: XY, b: XY): XY => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const atY = (y: number) => (a: XY, b: XY): XY => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  return [
    { inside: (p) => p[0] >= box.minX, cut: atX(box.minX) },
    { inside: (p) => p[0] <= box.maxX, cut: atX(box.maxX) },
    { inside: (p) => p[1] >= box.minY, cut: atY(box.minY) },
    { inside: (p) => p[1] <= box.maxY, cut: atY(box.maxY) },
  ];
}

/** Sutherland-Hodgman: the part of a closed ring inside `box`, or [] when none is. */
export function clipRing(ring: readonly XY[], box: Box): XY[] {
  let out: XY[] = [...ring];
  for (const { inside, cut } of sides(box)) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cut(prev, cur));
      }
    }
    if (out.length === 0) return [];
  }
  return out;
}

/** Liang-Barsky for one segment: the clipped ends and whether each end was cut. */
function clipSegment(a: XY, b: XY, box: Box): [XY, XY, boolean, boolean] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - box.minX, box.maxX - a[0], a[1] - box.minY, box.maxY - a[1]];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 4; k++) {
    if (p[k] === 0) {
      if (q[k] < 0) return null;
      continue;
    }
    const r = q[k] / p[k];
    if (p[k] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy], t0 > 0, t1 < 1];
}

/** The runs of an open polyline that lie inside `box`; each run has at least 2 points. */
export function clipLine(line: readonly XY[], box: Box): XY[][] {
  const runs: XY[][] = [];
  let run: XY[] = [];
  const flush = () => {
    if (run.length > 1) runs.push(run);
    run = [];
  };
  for (let i = 1; i < line.length; i++) {
    const seg = clipSegment(line[i - 1], line[i], box);
    if (!seg) {
      flush();
      continue;
    }
    const [a, b, cutStart, cutEnd] = seg;
    if (cutStart || run.length === 0) {
      flush();
      run.push(a);
    }
    run.push(b);
    if (cutEnd) flush();
  }
  flush();
  return runs;
}

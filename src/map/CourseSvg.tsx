import svg from "@/data/course-svg.json";
import { COPY } from "@/content/copy";
import { OPENING_TIME } from "@/content/race";
import { isClosed } from "@/model/closures";
import { SEGMENTS } from "@/model/course";
import { CourseSvgState } from "./CourseSvgState";

// The viewBox is about 3x larger than the screen, so this radius in user units reads as a roughly 4 to 5 px dot.
const START_R = 14;

/** First paint and the no-WebGL fallback. A server component: every path renders
 *  into the prerendered HTML and none of the path data ships in client JavaScript.
 *  CourseSvgState (a client component) keeps the closure states and leaders current. */
export function CourseSvg() {
  const [sx, sy] = svg.start;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${svg.width} ${svg.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={COPY.mapLabel}
    >
      {svg.lake.map((d, i) => (
        <path key={`lake-${i}`} d={d} className="fill-water" fillRule="evenodd" />
      ))}
      {svg.parks.map((d, i) => (
        <path key={`park-${i}`} d={d} className="fill-park" fillRule="evenodd" />
      ))}
      {svg.rivers.map((d, i) => (
        <path key={`river-${i}`} d={d} className="fill-none stroke-water" strokeWidth={4} vectorEffect="non-scaling-stroke" />
      ))}
      {svg.course.map((d, i) => (
        <path key={`casing-${i}`} d={d} className="course-casing" vectorEffect="non-scaling-stroke" />
      ))}
      {svg.course.map((d, i) => (
        <path
          key={SEGMENTS[i].slug}
          d={d}
          className="course-seg"
          data-slug={SEGMENTS[i].slug}
          data-state={isClosed(SEGMENTS[i], OPENING_TIME) ? "closed" : "open"}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={sx} cy={sy} r={START_R} className="course-start" vectorEffect="non-scaling-stroke" />
      <CourseSvgState />
    </svg>
  );
}

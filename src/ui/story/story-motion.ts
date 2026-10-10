import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DURATION, EASING, seconds } from "@/motion/tokens";

// The story's scroll-driven motion, loaded only when the story opens and
// never with reduced motion. Returns a function that undoes every tween and trigger.

const ease = (curve: readonly [number, number, number, number]) => `cubic-bezier(${curve.join(",")})`;

export function animateStory(root: HTMLElement, scroller: HTMLElement): () => void {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  const reveal = { duration: seconds(DURATION.deliberate), ease: ease(EASING.emphasized) };
  const ctx = gsap.context(() => {
    const stage = root.querySelector<HTMLElement>("[data-story-stage]");
    const rows = gsap.utils.toArray<HTMLElement>('[data-testid="story-row"]', root);
    const segments = gsap.utils.toArray<SVGPathElement>(".story-seg", root);
    if (stage) {
      // Each row lifts off the notice as its street draws onto the course, in race order.
      const lift = gsap.timeline({ scrollTrigger: { trigger: stage, scroller, start: "top top", end: "bottom bottom", scrub: 0.4 } });
      segments.forEach((segment, i) => {
        lift.fromTo(segment, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1, ease: "none" }, i * 0.8);
        if (rows[i]) lift.to(rows[i], { y: -3, opacity: 0.4, duration: 0.6, ease: "power1.out" }, i * 0.8);
      });
    }
    for (const el of gsap.utils.toArray<HTMLElement>("[data-story-reveal]", root)) {
      gsap.from(el, { opacity: 0, y: 18, ...reveal, scrollTrigger: { trigger: el, scroller, start: "top 88%" } });
    }
    const closeLine = root.querySelector<HTMLElement>('[data-testid="story-close-line"]');
    if (closeLine) {
      // Words stay ordinary text in spans, so screen readers read the line as it is; an
      // aria-label on a paragraph would be invalid (axe: aria-prohibited-attr).
      const split = SplitText.create(closeLine, { type: "words", aria: "none" });
      gsap.from(split.words, { opacity: 0, y: 14, stagger: 0.07, ...reveal, scrollTrigger: { trigger: closeLine, scroller, start: "top 90%" } });
    }
  }, root);
  root.dataset.storyAnimated = "true";
  return () => ctx.revert();
}

"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { DURATION, EASING, cssEasing } from "@/motion/tokens";
import { clockParts } from "@/model/time";

const TIMING = { duration: DURATION.slow, easing: cssEasing(EASING.standard) };
const FADE = { duration: DURATION.base, easing: cssEasing(EASING.standard) };

/** The clock's rolling digits: decoration laid over the plain time,
 *  which stays in place for screen readers and keeps the box the same size.
 *  `animated` is false while the clock runs faster than a minute a second, so the
 *  digits do not spin constantly. */
export function ClockDigits({ minute, animated }: { minute: number; animated: boolean }) {
  const { hour, minute: mm, meridiem } = clockParts(minute);
  return (
    <NumberFlowGroup>
      <NumberFlow value={hour} trend={0} animated={animated} transformTiming={TIMING} spinTiming={TIMING} opacityTiming={FADE} />
      :
      <NumberFlow
        value={mm}
        trend={0}
        format={{ minimumIntegerDigits: 2 }}
        digits={{ 1: { max: 5 } }}
        animated={animated}
        transformTiming={TIMING}
        spinTiming={TIMING}
        opacityTiming={FADE}
      />
      &nbsp;{meridiem}
    </NumberFlowGroup>
  );
}

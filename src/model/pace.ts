import { WAVES, leader, type Leader } from "@/content/race";

/** The wave a marathon time most likely starts in (v1's guess): up to 3:45 Wave 1, up to
 *  4:30 Wave 2, slower Wave 3. Index into WAVES. */
export function youWave(finishMinutes: number): 0 | 1 | 2 {
  return finishMinutes <= 225 ? 0 : finishMinutes <= 270 ? 1 : 2;
}

/** The "your pace" ghost for a marathon time: it starts 8 minutes after its wave's gun
 *  (v1) and runs a constant pace to that finish time. */
export function youLeader(finishMinutes: number): Leader {
  return { ...leader("you"), T: finishMinutes, start: WAVES[youWave(finishMinutes)].start + 8 };
}

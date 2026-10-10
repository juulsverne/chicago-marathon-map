import { LEADERS, type Leader } from "@/content/race";
import { youLeader } from "@/model/pace";
import { Store } from "./store";

/** Which pace markers the map draws and the "Your marathon time" slider:
 *  your pace is off until you ask for it, world-record pace is on. */
export type LeaderSettings = Readonly<{ you: boolean; wr: boolean; youMinutes: number }>;

export const leaderSettings = new Store<LeaderSettings>({ you: false, wr: true, youMinutes: 270 });

/** The leaders to draw, in label priority order, with your pace at your time. */
export function shownLeaders(s: LeaderSettings): Leader[] {
  const shown: Leader[] = [];
  for (const l of LEADERS) {
    if (l.id === "you") {
      if (s.you) shown.push(youLeader(s.youMinutes));
    } else if (l.id !== "wr" || s.wr) shown.push(l);
  }
  return shown;
}

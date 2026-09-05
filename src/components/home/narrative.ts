import { ProximityState } from "../../types";
export function narrative(state: ProximityState, name: string, cherri: string) {
  const lines: Record<ProximityState, [string, string]> = {
    HOME: [`${cherri} is chilling`, "A little company for wherever you go."],
    SENSED: [
      `${name} is nearby`,
      "A familiar presence, just around the corner.",
    ],
    APPROACHING: [
      `${name} is getting closer`,
      "Looks like your paths are about to cross.",
    ],
    VERY_CLOSE: [`${name} is right here`, "Good timing. Good company."],
    TOGETHER: [
      `Together with ${name}`,
      "Enjoy this little stretch of the journey.",
    ],
    SYNC: [`In sync with ${name}`, "Your Cherris found their rhythm."],
    CONNECTED: [`Connected with ${name}`, "Sharing the moment."],
    RECOGNIZED: [`Oh, it’s ${name}`, "A familiar face on your way."],
    GOODBYE: [`Until next time, ${name}`, "Another little memory to keep."],
  };
  return lines[state];
}

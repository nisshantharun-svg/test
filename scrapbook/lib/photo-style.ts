/**
 * Every photo needs a "random" rotation, tape color, and tape placement —
 * but it has to be the SAME random choice on every render and every
 * reload, or the page would visibly jitter each time it re-fetches.
 * Hashing the photo's own id gives each photo a stable, deterministic
 * "roll of the dice."
 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const TAPE_COLORS = ["rose", "teal", "gold"] as const;

export interface PhotoStyle {
  rotation: number;
  tapeColor: (typeof TAPE_COLORS)[number];
  doubleTaped: boolean;
}

export function getPhotoStyle(photoId: string): PhotoStyle {
  const hash = hashString(photoId);
  return {
    // -6deg to +6deg, never perfectly straight — a straight photo reads as
    // a UI element, a slightly crooked one reads as pasted in by hand.
    rotation: (hash % 13) - 6,
    tapeColor: TAPE_COLORS[hash % TAPE_COLORS.length],
    doubleTaped: hash % 3 === 0,
  };
}

const TAPE_COLORS = {
  rose: "bg-rose/70",
  teal: "bg-teal/70",
  gold: "bg-gold/70",
} as const;

interface TapeProps {
  color?: keyof typeof TAPE_COLORS;
  className?: string;
  rotate?: number;
}

/**
 * A strip of "washi tape" with torn, slightly ragged ends — used to pin
 * photo corners onto the page. Pure CSS clip-path, no image asset.
 */
export function Tape({ color = "rose", className = "", rotate = 0 }: TapeProps) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-6 w-16 ${TAPE_COLORS[color]} shadow-sm ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        clipPath:
          "polygon(3% 0%, 97% 0%, 100% 20%, 96% 38%, 100% 55%, 95% 72%, 100% 88%, 97% 100%, 3% 100%, 0% 85%, 5% 68%, 0% 50%, 4% 32%, 0% 15%)",
        backgroundImage:
          "repeating-linear-gradient(115deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 2px, transparent 2px, transparent 7px)",
      }}
    />
  );
}

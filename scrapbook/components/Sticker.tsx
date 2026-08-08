interface StickerProps {
  kind?: "star" | "heart" | "swirl";
  className?: string;
}

/**
 * Small hand-drawn-style doodles scattered around the page margins.
 * Inline SVG so the whole app ships with zero external image assets.
 */
export function Sticker({ kind = "star", className = "" }: StickerProps) {
  const common = "pointer-events-none select-none";

  if (kind === "heart") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 40 36"
        className={`${common} ${className}`}
        fill="none"
      >
        <path
          d="M20 33S3 22.5 3 11.8C3 5.8 7.6 2 12.4 2c3.4 0 6.2 1.8 7.6 4.6C21.4 3.8 24.2 2 27.6 2 32.4 2 37 5.8 37 11.8 37 22.5 20 33 20 33Z"
          stroke="var(--color-rose)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          fill="var(--color-rose)"
          fillOpacity="0.18"
        />
      </svg>
    );
  }

  if (kind === "swirl") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className={`${common} ${className}`}
        fill="none"
      >
        <path
          d="M6 20c0-7.7 6.3-14 14-14s12 5.4 12 11.5S26.9 29 21.5 29 12 24.9 12 20.5 15.6 13 20 13s7 3 7 6.6"
          stroke="var(--color-teal)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={`${common} ${className}`}
      fill="none"
    >
      <path
        d="M20 3 24.5 15.5 38 16.5 27.5 24.8 31 38 20 30.3 9 38 12.5 24.8 2 16.5 15.5 15.5Z"
        stroke="var(--color-gold)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="var(--color-gold)"
        fillOpacity="0.22"
      />
    </svg>
  );
}

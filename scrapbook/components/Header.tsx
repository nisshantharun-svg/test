import { Sticker } from "./Sticker";

export function Header() {
  return (
    <header className="relative mx-auto max-w-3xl px-6 pb-8 pt-14 text-center sm:pt-20">
      <Sticker
        kind="star"
        className="absolute left-2 top-8 h-8 w-8 -rotate-12 sm:left-10 sm:top-12"
      />
      <Sticker
        kind="heart"
        className="absolute right-4 top-16 h-7 w-7 rotate-12 sm:right-12 sm:top-8"
      />
      <h1 className="font-display text-6xl text-ink sm:text-7xl">Our Scrapbook</h1>
      <p className="mt-2 text-sm text-ink/60">
        a place for our favorite moments, added by everyone
      </p>
      <div
        aria-hidden="true"
        className="mx-auto mt-8 h-px max-w-xs border-t-2 border-dashed border-ink/20"
      />
    </header>
  );
}

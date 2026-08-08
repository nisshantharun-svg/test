import { Sticker } from "./Sticker";

export function EmptyState() {
  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center gap-3 rounded-sm bg-cardstock/60 px-8 py-16 text-center">
      <Sticker kind="swirl" className="h-10 w-10" />
      <h2 className="font-display text-3xl text-ink">This page is empty</h2>
      <p className="max-w-xs text-sm text-ink/70">
        No photos here yet. Tap the + button to paste in the first one.
      </p>
    </div>
  );
}

const HEIGHTS = ["h-56", "h-72", "h-64", "h-80", "h-60", "h-72", "h-52", "h-68"];

export function PhotoSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`mb-6 break-inside-avoid-column animate-pulse rounded-sm bg-[#fffdf8]/70 p-3 pb-4 ${HEIGHTS[index % HEIGHTS.length]}`}
          style={{ transform: `rotate(${(index % 5) - 2}deg)` }}
        >
          <div className="h-full w-full rounded-sm bg-ink/10" />
        </div>
      ))}
    </div>
  );
}

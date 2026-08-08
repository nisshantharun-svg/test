interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-sm border border-rose/40 bg-[#fffdf8] px-6 py-5 text-center shadow-sm">
      <p className="text-sm text-ink">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-display text-lg text-rose underline decoration-2 underline-offset-4 hover:text-ink"
        >
          Try again
        </button>
      )}
    </div>
  );
}

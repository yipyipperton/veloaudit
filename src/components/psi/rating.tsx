import type { Rating } from "@/lib/cwv";

/** Shared PSI-style threshold palette (good / needs improvement / poor / unavailable). */
export const RATING_TEXT: Record<Rating, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  ni: "text-amber-600 dark:text-amber-400",
  poor: "text-rose-600 dark:text-rose-400",
  none: "text-muted-foreground",
};
export const RATING_FILL: Record<Rating, string> = {
  good: "oklch(0.7 0.16 155)", ni: "oklch(0.78 0.15 75)", poor: "oklch(0.65 0.21 25)", none: "var(--muted-foreground)",
};
export const RATING_LABEL: Record<Rating, string> = { good: "Good", ni: "Needs improvement", poor: "Poor", none: "Unavailable" };

/** Lighthouse-style indicator: ● good, ■ needs improvement, ▲ poor (shape AND color, so not color-only). */
export function Indicator({ rating, className = "size-2.5" }: { rating: Rating; className?: string }) {
  const fill = RATING_FILL[rating];
  return (
    <svg viewBox="0 0 10 10" className={`shrink-0 ${className}`} role="img" aria-label={RATING_LABEL[rating]} data-rating={rating}>
      {rating === "good" && <circle cx="5" cy="5" r="5" fill={fill} />}
      {rating === "ni" && <rect x="0.5" y="0.5" width="9" height="9" rx="1" fill={fill} />}
      {rating === "poor" && <path d="M5 0.5 9.8 9.5H0.2z" fill={fill} />}
      {rating === "none" && <circle cx="5" cy="5" r="4" fill="none" stroke={fill} strokeWidth="1.5" />}
    </svg>
  );
}

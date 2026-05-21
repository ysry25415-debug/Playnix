type RatingStarsProps = {
  value: number;
  total?: number;
  showValue?: boolean;
  size?: "sm" | "md";
};

export function RatingStars({
  value,
  total,
  showValue = true,
  size = "md",
}: RatingStarsProps) {
  const normalized = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  const roundedHalf = Math.round(normalized * 2) / 2;

  return (
    <span
      className={size === "sm" ? "rating-stars rating-stars--sm" : "rating-stars"}
      aria-label={`${normalized.toFixed(1)} out of 5 stars`}
    >
      <span className="rating-stars__row" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => {
          const position = index + 1;
          const className =
            roundedHalf >= position
              ? "rating-stars__star rating-stars__star--full"
              : roundedHalf >= position - 0.5
                ? "rating-stars__star rating-stars__star--half"
                : "rating-stars__star";

          return (
            <span key={position} className={className}>
              ★
            </span>
          );
        })}
      </span>
      {showValue ? (
        <span className="rating-stars__meta">
          <strong>{normalized.toFixed(1)}</strong>
          <span>{typeof total === "number" ? `${total} review${total === 1 ? "" : "s"}` : "Seller score"}</span>
        </span>
      ) : null}
    </span>
  );
}

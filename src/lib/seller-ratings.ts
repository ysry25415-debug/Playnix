import { type OrderReviewRow } from "@/lib/marketplace-types";

type LooseRow = Record<string, unknown>;

const DISPLAY_BASELINE_STARS = 5;
const DISPLAY_BASELINE_WEIGHT = 5;

function stringOr(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberOr(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export type SellerRatingSummary = {
  average: number;
  displayedAverage: number;
  totalReviews: number;
  positiveShare: number;
};

export function normalizeOrderReviewRow(row: LooseRow): OrderReviewRow {
  return {
    id: numberOr(row.id),
    order_id: stringOr(row.order_id),
    offer_id: stringOr(row.offer_id),
    seller_id: stringOr(row.seller_id),
    buyer_id: stringOr(row.buyer_id),
    rating: Math.min(5, Math.max(1, numberOr(row.rating, DISPLAY_BASELINE_STARS))),
    comment: stringOr(row.comment),
    created_at: stringOr(row.created_at),
    updated_at: stringOr(row.updated_at),
  };
}

export function getSellerRatingSummary(reviews: OrderReviewRow[]): SellerRatingSummary {
  if (reviews.length === 0) {
    return {
      average: DISPLAY_BASELINE_STARS,
      displayedAverage: DISPLAY_BASELINE_STARS,
      totalReviews: 0,
      positiveShare: 1,
    };
  }

  const totalStars = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = totalStars / reviews.length;
  const displayedAverage =
    (DISPLAY_BASELINE_STARS * DISPLAY_BASELINE_WEIGHT + totalStars) /
    (DISPLAY_BASELINE_WEIGHT + reviews.length);
  const positiveShare =
    reviews.filter((review) => review.rating >= 4).length / reviews.length;

  return {
    average,
    displayedAverage,
    totalReviews: reviews.length,
    positiveShare,
  };
}

export function formatSellerRating(value: number) {
  return value.toFixed(1);
}

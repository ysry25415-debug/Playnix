"use client";

import { FormEvent, useEffect, useState } from "react";

import { RatingStars } from "@/components/shared/rating-stars";
import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
} from "@/lib/marketplace-compat";
import { type OrderReviewRow } from "@/lib/marketplace-types";
import { normalizeOrderReviewRow } from "@/lib/seller-ratings";
import { supabase } from "@/lib/supabase-client";

type OrderReviewPanelProps = {
  orderId: string;
  sellerName: string;
  canReview: boolean;
  onSubmitted?: () => Promise<void> | void;
};

export function OrderReviewPanel({
  orderId,
  sellerName,
  canReview,
  onSubmitted,
}: OrderReviewPanelProps) {
  const [existingReview, setExistingReview] = useState<OrderReviewRow | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadReview() {
      if (!canReview) {
        return;
      }

      const { data, error: reviewError } = await supabase
        .from("order_reviews")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!isMounted) return;

      if (reviewError) {
        if (isLikelySchemaCompatibilityError(reviewError.message)) {
          setError(getSchemaCompatibilityMessage("Seller reviews"));
        }
        return;
      }

      if (data && typeof data === "object") {
        const review = normalizeOrderReviewRow(data as Record<string, unknown>);
        setExistingReview(review);
        setRating(review.rating);
        setComment(review.comment);
      }
    }

    void loadReview();

    return () => {
      isMounted = false;
    };
  }, [canReview, orderId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedComment = comment.trim();
    if (rating < 1 || rating > 5) {
      setError("Please choose a rating between 1 and 5 stars.");
      return;
    }

    if (trimmedComment.length < 6) {
      setError("Please add a short sentence about this seller.");
      return;
    }

    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setIsLoading(false);
      setError("Please log in again.");
      return;
    }

    const response = await fetch("/api/orders/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        orderId,
        rating,
        comment: trimmedComment,
      }),
    });

    const payload = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not save this review.");
      return;
    }

    const nextReview = payload?.review && typeof payload.review === "object"
      ? normalizeOrderReviewRow(payload.review as Record<string, unknown>)
      : {
          id: 0,
          order_id: orderId,
          offer_id: "",
          seller_id: "",
          buyer_id: "",
          rating,
          comment: trimmedComment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

    setExistingReview(nextReview);
    setSuccess("Your seller review is now live on the seller profile.");
    await onSubmitted?.();
  }

  if (!canReview && !existingReview) {
    return null;
  }

  return (
    <section className="order-room__insight order-room__insight--review">
      <span className="section-eyebrow">Seller review</span>
      <strong>Rate {sellerName}</strong>
      <p>
        After a successful handoff, your rating and note appear on the seller&apos;s public
        storefront.
      </p>

      {existingReview ? (
        <div className="order-room__review-result">
          <RatingStars value={existingReview.rating} total={1} />
          <p>{existingReview.comment}</p>
          <span>{new Date(existingReview.created_at).toLocaleString()}</span>
        </div>
      ) : (
        <form className="order-room__review-form" onSubmit={handleSubmit}>
          <div className="order-room__review-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= rating ? "order-room__review-star order-room__review-star--active" : "order-room__review-star"}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Write one clear sentence about the seller, delivery speed, and accuracy."
          />

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Publishing..." : "Publish Review"}
          </button>
        </form>
      )}

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
      {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}
    </section>
  );
}

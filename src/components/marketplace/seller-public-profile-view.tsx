import Link from "next/link";

import { RatingStars } from "@/components/shared/rating-stars";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { getPrimaryOfferImage } from "@/lib/offer-images";
import { type SellerPublicProfileData } from "@/lib/public-marketplace";
import { formatSellerRating } from "@/lib/seller-ratings";

type SellerPublicProfileViewProps = {
  data: SellerPublicProfileData;
};

export function SellerPublicProfileView({ data }: SellerPublicProfileViewProps) {
  const displayName = data.profile.full_name || "Seller";
  const avatarFallback = displayName.slice(0, 1).toUpperCase();
  const featuredReview = data.reviews[0] ?? null;

  return (
    <main className="module-page seller-public-page">
      <div className="shell">
        <section className="module-page__shell seller-public-hero">
          <div className="seller-public-hero__identity">
            <span className="seller-public-hero__avatar" aria-hidden="true">
              {data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" /> : avatarFallback}
            </span>
            <div className="seller-public-hero__copy">
              <span className="section-eyebrow">Seller Storefront</span>
              <div className="seller-public-hero__title-row">
                <h1>{displayName}</h1>
                {data.profile.role === "seller" || data.profile.role === "admin" ? <SellerVerifiedBadge /> : null}
              </div>
              <p>
                Browse this seller&apos;s active offers, recent buyer feedback, and delivery style
                before placing an order.
              </p>
              <RatingStars
                value={data.ratingSummary.displayedAverage}
                total={data.ratingSummary.totalReviews}
              />
            </div>
          </div>

          <div className="seller-public-hero__stats">
            <article className="seller-public-stat">
              <strong>{formatSellerRating(data.ratingSummary.displayedAverage)}</strong>
              <span>Storefront score</span>
            </article>
            <article className="seller-public-stat">
              <strong>{data.offers.length}</strong>
              <span>Active offers</span>
            </article>
            <article className="seller-public-stat">
              <strong>{data.completedOrders}</strong>
              <span>Completed orders</span>
            </article>
            <article className="seller-public-stat">
              <strong>{Math.round(data.ratingSummary.positiveShare * 100)}%</strong>
              <span>Positive feedback</span>
            </article>
          </div>
        </section>

        {featuredReview ? (
          <section className="seller-public-featured-review">
            <span className="section-eyebrow">Featured buyer note</span>
            <RatingStars value={featuredReview.rating} showValue={false} size="sm" />
            <p>&ldquo;{featuredReview.comment}&rdquo;</p>
          </section>
        ) : (
          <section className="seller-public-featured-review">
            <span className="section-eyebrow">Storefront opening state</span>
            <p>
              This seller starts with a protected five-star storefront display. Real completed-order
              reviews now shape the score gradually over time.
            </p>
          </section>
        )}

        <section className="seller-public-section">
          <div className="seller-public-section__head">
            <div>
              <span className="section-eyebrow">Active offers</span>
              <h2>Everything this seller is currently offering</h2>
            </div>
            <Link className="ghost-button" href="/marketplace">
              Back to Marketplace
            </Link>
          </div>

          {data.offers.length === 0 ? (
            <p className="auth-feedback auth-feedback--success">
              No active offers are listed on this storefront right now.
            </p>
          ) : (
            <div className="marketplace-offer-grid">
              {data.offers.map((offer) => {
                const primaryImage = getPrimaryOfferImage(offer.offer_images);

                return (
                  <article key={offer.id} className="marketplace-offer-card marketplace-offer-card--profile">
                    <Link href={`/marketplace/offers/${offer.id}`} className="marketplace-offer-card__media-link">
                      {primaryImage ? (
                        <img
                          className="marketplace-offer-card__media"
                          src={primaryImage.public_url}
                          alt={offer.title}
                        />
                      ) : (
                        <div className="marketplace-offer-card__media marketplace-offer-card__media--placeholder">
                          No image
                        </div>
                      )}
                    </Link>

                    <div className="marketplace-offer-card__head">
                      <span className="section-eyebrow">{offer.category_slug}</span>
                      <strong>${offer.price_usd.toFixed(2)}</strong>
                    </div>

                    <h3>
                      <Link href={`/marketplace/offers/${offer.id}`}>{offer.title}</Link>
                    </h3>
                    <p>{offer.description}</p>

                    <div className="marketplace-offer-card__meta">
                      <span>{getOfferDeliveryModeLabel(offer.delivery_mode)}</span>
                      <span>{offer.delivery_time}</span>
                      <span>Stock: {offer.stock_count}</span>
                    </div>

                    <div className="hero-actions">
                      <Link className="primary-button" href={`/marketplace/offers/${offer.id}`}>
                        View Offer
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="seller-public-section">
          <div className="seller-public-section__head">
            <div>
              <span className="section-eyebrow">Buyer reviews</span>
              <h2>What recent customers said</h2>
            </div>
          </div>

          {data.reviews.length === 0 ? (
            <p className="auth-feedback auth-feedback--success">
              No completed-order reviews yet. The storefront score still shows the protected launch baseline.
            </p>
          ) : (
            <div className="seller-review-grid">
              {data.reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="seller-review-card">
                  <RatingStars value={review.rating} size="sm" />
                  <p>{review.comment}</p>
                  <span>{new Date(review.created_at).toLocaleDateString()}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

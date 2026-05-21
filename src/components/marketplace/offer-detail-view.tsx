"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RatingStars } from "@/components/shared/rating-stars";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { getPrimaryOfferImage } from "@/lib/offer-images";
import { type PublicOfferDetailsData } from "@/lib/public-marketplace";
import { supabase } from "@/lib/supabase-client";

type OfferDetailViewProps = {
  data: PublicOfferDetailsData;
};

export function OfferDetailView({ data }: OfferDetailViewProps) {
  const router = useRouter();
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [buying, setBuying] = useState(false);

  const displayName = data.seller.full_name || "Seller";
  const avatarFallback = displayName.slice(0, 1).toUpperCase();
  const gallery = data.offer.offer_images ?? [];
  const heroImage = getPrimaryOfferImage(gallery) ?? gallery[0] ?? null;
  const isOwner = viewerId === data.offer.seller_id;

  useEffect(() => {
    let isMounted = true;

    async function loadViewer() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;

      if (!isMounted) return;

      setViewerId(user?.id ?? null);

      if (!user) {
        setViewerRole(null);
        return;
      }

      const role = await fetchRoleForCurrentUser(supabase);
      if (!isMounted) return;
      setViewerRole(role);
    }

    void loadViewer();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleBuy() {
    setError("");
    setSuccess("");

    if (!viewerId) {
      setError("Please log in first.");
      return;
    }

    if (viewerRole !== "customer") {
      setError("Only customer accounts can place orders.");
      return;
    }

    if (isOwner) {
      setError("You cannot buy your own offer.");
      return;
    }

    setBuying(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setBuying(false);
      setError("Please log in again.");
      return;
    }

    const response = await fetch("/api/orders/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        offerId: data.offer.id,
      }),
    });

    const payload = await response.json().catch(() => null);
    setBuying(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not place this order.");
      return;
    }

    const nextOrderId = typeof payload?.orderId === "string" ? payload.orderId : null;
    if (nextOrderId) {
      router.push(`/orders/${nextOrderId}`);
      router.refresh();
      return;
    }

    setSuccess("Order placed successfully.");
  }

  const sellerReviewLabel = useMemo(() => {
    if (data.ratingSummary.totalReviews === 0) {
      return "Protected launch score";
    }

    return `${data.ratingSummary.totalReviews} completed-order reviews`;
  }, [data.ratingSummary.totalReviews]);

  return (
    <main className="module-page offer-detail-page">
      <div className="shell">
        <div className="module-page__shell offer-detail-shell">
          <div className="offer-detail-hero">
            <div className="offer-detail-hero__media">
              {heroImage ? (
                <img src={heroImage.public_url} alt={data.offer.title} />
              ) : (
                <div className="offer-detail-hero__placeholder">Offer preview unavailable</div>
              )}

              {gallery.length > 1 ? (
                <div className="offer-detail-gallery">
                  {gallery.slice(0, 5).map((image) => (
                    <span key={image.id} className="offer-detail-gallery__thumb">
                      <img src={image.public_url} alt="" />
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="offer-detail-hero__content">
              <span className="section-eyebrow">
                {data.offer.game_slug} / {data.offer.category_slug}
              </span>
              <h1>{data.offer.title}</h1>
              <p>{data.offer.description}</p>

              <div className="offer-detail-price">
                <strong>${data.offer.price_usd.toFixed(2)}</strong>
                <span>{getOfferDeliveryModeLabel(data.offer.delivery_mode)}</span>
              </div>

              <div className="marketplace-offer-card__meta">
                <span>{data.offer.delivery_time}</span>
                <span>Stock: {data.offer.stock_count}</span>
                <span>{data.offer.delivery_mode === "chat" ? "Seller joins live handoff room" : "Protected instant unlock"}</span>
              </div>

              <Link href={`/sellers/${data.seller.id}`} className="offer-detail-seller">
                <span className="offer-detail-seller__avatar" aria-hidden="true">
                  {data.seller.avatar_url ? <img src={data.seller.avatar_url} alt="" /> : avatarFallback}
                </span>
                <div className="offer-detail-seller__copy">
                  <span className="offer-detail-seller__name-row">
                    <strong>{displayName}</strong>
                    {data.seller.role === "seller" || data.seller.role === "admin" ? <SellerVerifiedBadge /> : null}
                  </span>
                  <RatingStars value={data.ratingSummary.displayedAverage} total={data.ratingSummary.totalReviews} size="sm" />
                  <span>{data.completedOrders} completed orders</span>
                </div>
              </Link>

              {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
              {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

              <div className="hero-actions">
                {isOwner ? (
                  <Link className="ghost-button" href={`/sell/offers/${data.offer.id}/edit`}>
                    Manage Offer
                  </Link>
                ) : viewerRole === "customer" ? (
                  <button className="primary-button" type="button" onClick={handleBuy} disabled={buying}>
                    {buying ? "Placing Order..." : "Buy Now"}
                  </button>
                ) : (
                  <Link className="primary-button" href="/auth/login">
                    Log In To Buy
                  </Link>
                )}
                <Link className="ghost-button" href={`/sellers/${data.seller.id}`}>
                  Open Seller Profile
                </Link>
              </div>
            </div>
          </div>

          <div className="offer-detail-grid">
            <section className="offer-detail-section">
              <div className="seller-public-section__head">
                <div>
                  <span className="section-eyebrow">Why buyers choose this offer</span>
                  <h2>Protected from checkout to delivery</h2>
                </div>
              </div>

              <div className="offer-detail-benefits">
                <article className="offer-detail-benefit">
                  <strong>Protected checkout</strong>
                  <p>The payment stays controlled until the delivery checkpoint is actually reached.</p>
                </article>
                <article className="offer-detail-benefit">
                  <strong>Live delivery room</strong>
                  <p>Chat-based orders move into a guided room with proof, updates, and dispute coverage.</p>
                </article>
                <article className="offer-detail-benefit">
                  <strong>Visible seller identity</strong>
                  <p>You can inspect the seller storefront, offers, and recent buyer feedback before ordering.</p>
                </article>
              </div>
            </section>

            <section className="offer-detail-section">
              <div className="seller-public-section__head">
                <div>
                  <span className="section-eyebrow">Seller reputation</span>
                  <h2>{sellerReviewLabel}</h2>
                </div>
              </div>

              {data.reviews.length === 0 ? (
                <p className="auth-feedback auth-feedback--success">
                  This seller has not collected completed-order feedback yet. The storefront still shows
                  the protected launch score.
                </p>
              ) : (
                <div className="seller-review-grid">
                  {data.reviews.slice(0, 3).map((review) => (
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

          {data.sellerOffers.length > 0 ? (
            <section className="offer-detail-section">
              <div className="seller-public-section__head">
                <div>
                  <span className="section-eyebrow">More from this seller</span>
                  <h2>Explore related offers from the same storefront</h2>
                </div>
              </div>

              <div className="marketplace-offer-grid">
                {data.sellerOffers.map((offer) => {
                  const primaryImage = getPrimaryOfferImage(offer.offer_images);

                  return (
                    <article key={offer.id} className="marketplace-offer-card">
                      <Link href={`/marketplace/offers/${offer.id}`} className="marketplace-offer-card__media-link">
                        {primaryImage ? (
                          <img className="marketplace-offer-card__media" src={primaryImage.public_url} alt={offer.title} />
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
                      <div className="hero-actions">
                        <Link className="ghost-button" href={`/marketplace/offers/${offer.id}`}>
                          View Offer
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

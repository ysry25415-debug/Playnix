"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RatingStars } from "@/components/shared/rating-stars";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";
import {
  attachImagesToOffers,
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOfferImageRow,
  normalizeOfferRow,
} from "@/lib/marketplace-compat";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { getPrimaryOfferImage } from "@/lib/offer-images";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { type MarketplaceGame } from "@/lib/marketplace-data";
import { type OfferWithImagesRow } from "@/lib/marketplace-types";
import { triggerPageLoader } from "@/lib/page-loader-events";
import {
  getSellerRatingSummary,
  normalizeOrderReviewRow,
  type SellerRatingSummary,
} from "@/lib/seller-ratings";
import { supabase } from "@/lib/supabase-client";

const RECENT_LANES_KEY = "playnix-recent-lanes";

type SellerMarketplaceProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type GameMarketplaceViewProps = {
  game: MarketplaceGame;
  activeCategorySlug: string;
  searchQuery?: string;
};

export function GameMarketplaceView({
  game,
  activeCategorySlug,
  searchQuery = "",
}: GameMarketplaceViewProps) {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferWithImagesRow[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerMarketplaceProfile>>({});
  const [sellerRatings, setSellerRatings] = useState<Record<string, SellerRatingSummary>>({});
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const activeCategory =
    game.categories.find((category) => category.slug === activeCategorySlug) ?? game.categories[0];

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

    async function loadOffers() {
      setIsLoading(true);
      setError("");

      const { data, error: offersError } = await supabase
        .from("offers")
        .select("*")
        .eq("game_slug", game.slug)
        .eq("category_slug", activeCategory.slug)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (offersError) {
        setError(
          isLikelySchemaCompatibilityError(offersError.message)
            ? getSchemaCompatibilityMessage("Marketplace offers")
            : offersError.message
        );
        setOffers([]);
        setIsLoading(false);
        return;
      }

      const normalizedOffers = (data ?? [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => normalizeOfferRow(item))
        .filter((offer) => offer.status === "active");

      const offerIds = normalizedOffers.map((offer) => offer.id).filter(Boolean);
      const sellerIds = Array.from(
        new Set(normalizedOffers.map((offer) => offer.seller_id).filter((value): value is string => Boolean(value)))
      );

      if (offerIds.length === 0) {
        setOffers([]);
        setSellerProfiles({});
        setSellerRatings({});
        setIsLoading(false);
        return;
      }

      const [imagesResult, profilesResult, reviewsResult] = await Promise.all([
        supabase
          .from("offer_images")
          .select("*")
          .in("offer_id", offerIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        sellerIds.length
          ? supabase.from("profiles").select("id,full_name,avatar_url,role").in("id", sellerIds)
          : Promise.resolve({ data: [], error: null }),
        sellerIds.length
          ? supabase.from("order_reviews").select("*").in("seller_id", sellerIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!isMounted) return;

      const nextProfiles: Record<string, SellerMarketplaceProfile> = {};
      (profilesResult.data ?? []).forEach((profile) => {
        nextProfiles[profile.id] = {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: typeof profile.role === "string" ? profile.role : null,
        };
      });
      setSellerProfiles(nextProfiles);

      if (imagesResult.error) {
        setOffers(normalizedOffers.map((offer) => ({ ...offer, offer_images: [] } satisfies OfferWithImagesRow)));
        setSellerRatings({});
        setIsLoading(false);
        return;
      }

      const normalizedImages = (imagesResult.data ?? [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => normalizeOfferImageRow(item));

      if (!reviewsResult.error) {
        const reviewsBySellerId = new Map<string, ReturnType<typeof normalizeOrderReviewRow>[]>();

        (reviewsResult.data ?? [])
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => normalizeOrderReviewRow(item))
          .forEach((review) => {
            const current = reviewsBySellerId.get(review.seller_id) ?? [];
            current.push(review);
            reviewsBySellerId.set(review.seller_id, current);
          });

        const nextRatings: Record<string, SellerRatingSummary> = {};
        sellerIds.forEach((sellerId) => {
          nextRatings[sellerId] = getSellerRatingSummary(reviewsBySellerId.get(sellerId) ?? []);
        });
        setSellerRatings(nextRatings);
      } else {
        setSellerRatings({});
      }

      setOffers(attachImagesToOffers(normalizedOffers, normalizedImages));
      setIsLoading(false);
    }

    void loadViewer();
    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, [activeCategory.slug, game.slug]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(RECENT_LANES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const currentLane = {
        slug: game.slug,
        title: game.title,
        categoryTitle: activeCategory.title,
        href: `/marketplace/${game.slug}?category=${activeCategory.slug}`,
        savedAt: Date.now(),
      };

      const nextRecentLanes = [
        currentLane,
        ...(Array.isArray(parsed) ? parsed : []).filter((item) => {
          return !(
            item &&
            typeof item === "object" &&
            item.slug === currentLane.slug &&
            item.categoryTitle === currentLane.categoryTitle
          );
        }),
      ].slice(0, 6);

      window.localStorage.setItem(RECENT_LANES_KEY, JSON.stringify(nextRecentLanes));
    } catch {
      // Ignore storage errors and keep the marketplace browsing experience uninterrupted.
    }
  }, [activeCategory.slug, activeCategory.title, game.slug, game.title]);

  async function handleBuy(offer: OfferWithImagesRow) {
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

    if (viewerId === offer.seller_id) {
      setError("You cannot buy your own offer.");
      return;
    }

    setBuyingId(offer.id);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setBuyingId(null);
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
        offerId: offer.id,
      }),
    });

    const payload = await response.json().catch(() => null);
    setBuyingId(null);

    if (!response.ok) {
      setError(payload?.error ?? "Could not place this order.");
      return;
    }

    const nextOrderId = typeof payload?.orderId === "string" ? payload.orderId : null;

    if (nextOrderId) {
      triggerPageLoader();
      router.push(`/orders/${nextOrderId}`);
      router.refresh();
      return;
    }

    setSuccess("Order placed successfully.");
  }

  const canCreateOffers = viewerRole === "seller" || viewerRole === "admin";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const categoryLinks = useMemo(() => {
    const querySuffix = normalizedSearchQuery ? `&q=${encodeURIComponent(searchQuery.trim())}` : "";

    return game.categories.map((category) => ({
      ...category,
      href: `/marketplace/${game.slug}?category=${category.slug}${querySuffix}`,
      isActive: category.slug === activeCategory.slug,
    }));
  }, [activeCategory.slug, game.categories, game.slug, normalizedSearchQuery, searchQuery]);

  const filteredOffers = useMemo(() => {
    if (!normalizedSearchQuery) {
      return offers;
    }

    return offers.filter((offer) => {
      const searchableText = [
        offer.title,
        offer.description,
        offer.delivery_time,
        offer.delivery_mode,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, offers]);

  return (
    <div className="marketplace-game-page">
      <div className="marketplace-game-hero">
        <div className="marketplace-game-hero__copy">
          <span className="eyebrow-chip">{game.eyebrow}</span>
          <h1>{game.title} Marketplace</h1>
          <p>{game.description}</p>
          <div className="marketplace-game-hero__chips">
            {game.categories.map((category) => (
              <span key={category.slug}>{category.title}</span>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="primary-button" href="/marketplace">
              Shop Now
            </Link>
            <Link className="ghost-button" href="/support">
              Buyer Protection
            </Link>
          </div>
        </div>

        <aside className="marketplace-game-hero__panel" aria-label="Marketplace context">
          <strong>{activeCategory.title} lane</strong>
          <p>{activeCategory.description}</p>
          {canCreateOffers ? (
            <Link
              className="ghost-button"
              href={`/sell/offers/new?game=${game.slug}&category=${activeCategory.slug}`}
            >
              Add Offer
            </Link>
          ) : (
            <span className="marketplace-game-hero__hint">
              Sellers can publish offers directly into this category.
            </span>
          )}
        </aside>
      </div>

      <div className="marketplace-tabs">
        {categoryLinks.map((category) => (
          <Link
            key={category.slug}
            href={category.href}
            className={category.isActive ? "marketplace-tab marketplace-tab--active" : "marketplace-tab"}
          >
            <strong>{category.title}</strong>
            <span>{category.description}</span>
          </Link>
        ))}
      </div>

      <div className="marketplace-trust-grid">
        <article className="marketplace-trust-card">
          <strong>Offer detail browsing</strong>
          <p>Each listing now opens into its own page so buyers can inspect content before ordering.</p>
        </article>
        <article className="marketplace-trust-card">
          <strong>Seller identity</strong>
          <p>Every card now points to the seller storefront, rating layer, and public offer lineup.</p>
        </article>
        <article className="marketplace-trust-card">
          <strong>Protected follow-up</strong>
          <p>Chat handoff, proof steps, and post-order reviews all stay connected to the same seller history.</p>
        </article>
      </div>

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
      {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

      {isLoading ? (
        <p>Loading offers...</p>
      ) : filteredOffers.length === 0 ? (
        <div className="marketplace-empty">
          <strong>
            {normalizedSearchQuery
              ? `No offers match "${searchQuery}" in ${activeCategory.title}.`
              : `No live offers in ${activeCategory.title} yet.`}
          </strong>
          <span>
            {canCreateOffers
              ? "You can be the first seller to publish in this section."
              : "Check back soon or switch to another category."}
          </span>
        </div>
      ) : (
        <div className="marketplace-offer-grid">
          {filteredOffers.map((offer) => {
            const primaryImage = getPrimaryOfferImage(offer.offer_images);
            const sellerProfile = sellerProfiles[offer.seller_id];
            const sellerRating = sellerRatings[offer.seller_id] ?? getSellerRatingSummary([]);
            const sellerName = sellerProfile?.full_name || "Seller";
            const sellerAvatar = sellerProfile?.avatar_url || "";
            const sellerAvatarFallback = sellerName.slice(0, 1).toUpperCase();
            const sellerVerified = sellerProfile?.role === "seller" || sellerProfile?.role === "admin";

            return (
              <article key={offer.id} className="marketplace-offer-card">
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
                  <span className="section-eyebrow">{activeCategory.title}</span>
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

                <div className="marketplace-offer-card__seller">
                  <Link className="marketplace-offer-card__seller-link" href={`/sellers/${offer.seller_id}`}>
                    <span className="marketplace-offer-card__seller-avatar" aria-hidden="true">
                      {sellerAvatar ? <img src={sellerAvatar} alt="" /> : sellerAvatarFallback}
                    </span>
                    <span className="marketplace-offer-card__seller-copy">
                      <span className="marketplace-offer-card__seller-name-row">
                        <strong>{sellerName}</strong>
                        {sellerVerified ? <SellerVerifiedBadge /> : null}
                      </span>
                      <RatingStars
                        value={sellerRating.displayedAverage}
                        showValue={false}
                        size="sm"
                      />
                    </span>
                  </Link>
                </div>

                <div className="hero-actions marketplace-offer-card__actions">
                  <Link className="ghost-button" href={`/marketplace/offers/${offer.id}`}>
                    View Offer
                  </Link>
                  {viewerId === offer.seller_id ? (
                    <Link className="primary-button" href={`/sell/offers/${offer.id}/edit`}>
                      Manage Offer
                    </Link>
                  ) : viewerRole === "customer" ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => handleBuy(offer)}
                      disabled={buyingId === offer.id}
                    >
                      {buyingId === offer.id ? "Placing Order..." : "Buy Now"}
                    </button>
                  ) : (
                    <span className="marketplace-offer-card__hint">
                      Browse only. Buying is available for customer accounts.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getPrimaryOfferImage } from "@/lib/offer-images";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { type MarketplaceGame } from "@/lib/marketplace-data";
import { type OfferWithImagesRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

type GameMarketplaceViewProps = {
  game: MarketplaceGame;
  activeCategorySlug: string;
};

export function GameMarketplaceView({
  game,
  activeCategorySlug,
}: GameMarketplaceViewProps) {
  const [offers, setOffers] = useState<OfferWithImagesRow[]>([]);
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
        .select(
          "id,seller_id,game_slug,category_slug,title,description,price_usd,delivery_time,stock_count,status,created_at,updated_at,offer_images(id,offer_id,seller_id,storage_path,public_url,is_primary,sort_order,created_at)"
        )
        .eq("game_slug", game.slug)
        .eq("category_slug", activeCategory.slug)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (offersError) {
        setError(offersError.message);
        setOffers([]);
        setIsLoading(false);
        return;
      }

      setOffers((data ?? []) as OfferWithImagesRow[]);
      setIsLoading(false);
    }

    void loadViewer();
    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, [activeCategory.slug, game.slug]);

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

    const nextStock =
      typeof payload?.nextStock === "number" ? payload.nextStock : Math.max(offer.stock_count - 1, 0);
    const nextStatus =
      payload?.nextStatus === "active" || payload?.nextStatus === "sold_out"
        ? payload.nextStatus
        : nextStock === 0
          ? "sold_out"
          : offer.status;

    setOffers((current) =>
      current
        .map((item) =>
          item.id === offer.id
            ? {
                ...item,
                stock_count: nextStock,
                status: nextStatus,
              }
            : item
        )
        .filter((item) => item.stock_count > 0)
    );
    setSuccess("Order placed successfully. The seller will now see it in Orders.");
  }

  const canCreateOffers = viewerRole === "seller" || viewerRole === "admin";

  const categoryLinks = useMemo(() => {
    return game.categories.map((category) => ({
      ...category,
      href: `/marketplace/${game.slug}?category=${category.slug}`,
      isActive: category.slug === activeCategory.slug,
    }));
  }, [activeCategory.slug, game.categories, game.slug]);

  return (
    <div className="marketplace-game-page">
      <div className="marketplace-game-hero">
        <div>
          <span className="eyebrow-chip">{game.eyebrow}</span>
          <h1>{game.title} Marketplace</h1>
          <p>{game.description}</p>
        </div>

        {canCreateOffers ? (
          <Link
            className="primary-button"
            href={`/sell/offers/new?game=${game.slug}&category=${activeCategory.slug}`}
          >
            Add Offer
          </Link>
        ) : null}
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

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
      {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

      {isLoading ? (
        <p>Loading offers...</p>
      ) : offers.length === 0 ? (
        <div className="marketplace-empty">
          <strong>No live offers in {activeCategory.title} yet.</strong>
          <span>
            {canCreateOffers
              ? "You can be the first seller to publish in this section."
              : "Check back soon or switch to another category."}
          </span>
        </div>
      ) : (
        <div className="marketplace-offer-grid">
          {offers.map((offer) => {
            const primaryImage = getPrimaryOfferImage(offer.offer_images);

            return (
              <article key={offer.id} className="marketplace-offer-card">
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

                <div className="marketplace-offer-card__head">
                  <span className="section-eyebrow">{activeCategory.title}</span>
                  <strong>${offer.price_usd.toFixed(2)}</strong>
                </div>

                <h3>{offer.title}</h3>
                <p>{offer.description}</p>

                <div className="marketplace-offer-card__meta">
                  <span>{offer.delivery_time}</span>
                  <span>Stock: {offer.stock_count}</span>
                </div>

                <div className="hero-actions">
                  {viewerId === offer.seller_id ? (
                    <Link className="ghost-button" href={`/sell/offers/${offer.id}/edit`}>
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

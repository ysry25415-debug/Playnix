"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { getPrimaryOfferImage, OFFER_IMAGES_BUCKET } from "@/lib/offer-images";
import { getMarketplaceGame } from "@/lib/marketplace-data";
import { type OfferWithImagesRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

export function SellerOffersPanel() {
  const [offers, setOffers] = useState<OfferWithImagesRow[]>([]);
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOffers() {
      setIsLoading(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (isMounted) {
          setOffers([]);
          setViewerRole(null);
          setIsLoading(false);
        }
        return;
      }

      const role = await fetchRoleForCurrentUser(supabase);
      if (!isMounted) return;

      setViewerRole(role);

      const offersQuery = supabase
        .from("offers")
        .select(
          "id,seller_id,game_slug,category_slug,title,description,price_usd,delivery_mode,delivery_time,stock_count,status,created_at,updated_at,offer_images(id,offer_id,seller_id,storage_path,public_url,is_primary,sort_order,created_at)"
        )
        .order("created_at", { ascending: false });

      const { data, error: offersError } =
        role === "admin" ? await offersQuery : await offersQuery.eq("seller_id", user.id);

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

    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDelete(offerId: string) {
    const confirmed = window.confirm("Delete this offer?");
    if (!confirmed) {
      return;
    }

    setDeletingId(offerId);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setDeletingId(null);
      setError("Please log in again.");
      return;
    }

    const offer = offers.find((item) => item.id === offerId);
    const imagePaths = offer?.offer_images?.map((image) => image.storage_path) ?? [];

    const role = viewerRole ?? (await fetchRoleForCurrentUser(supabase));
    const deleteQuery = supabase.from("offers").delete().eq("id", offerId);
    const { error: deleteError } =
      role === "admin" ? await deleteQuery : await deleteQuery.eq("seller_id", user.id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (imagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(OFFER_IMAGES_BUCKET)
        .remove(imagePaths);

      if (storageError) {
        console.error("Offer image files could not be fully removed.", storageError);
      }
    }

    setOffers((current) => current.filter((offer) => offer.id !== offerId));
  }

  const stats = useMemo(() => {
    return {
      total: offers.length,
      active: offers.filter((offer) => offer.status === "active").length,
      paused: offers.filter((offer) => offer.status === "paused").length,
      draft: offers.filter((offer) => offer.status === "draft").length,
    };
  }, [offers]);

  return (
    <div className="seller-module">
      <span className="section-eyebrow">Offers</span>
      <h2>Publish, organize, and tune what buyers see.</h2>
      <p>
        Offers is your live catalog. Each listing chooses a game, a sub-category, a price, and the
        exact lane where customers will discover it.
      </p>

      {viewerRole === "admin" ? (
        <p className="auth-feedback auth-feedback--success">
          Admin view is enabled. You are currently seeing all seller offers.
        </p>
      ) : null}

      <div className="hero-actions">
        <Link className="primary-button" href="/sell/offers/new">
          Add Offer
        </Link>
      </div>

      <div className="seller-module__stats">
        <article className="seller-module__card">
          <strong>{stats.total}</strong>
          <span>Total offers</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.active}</strong>
          <span>Active offers</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.paused}</strong>
          <span>Paused</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.draft}</strong>
          <span>Draft</span>
        </article>
      </div>

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

      {isLoading ? (
        <p>Loading offers...</p>
      ) : offers.length === 0 ? (
        <p className="auth-feedback auth-feedback--success">
          You have no offers yet. Create your first one and choose exactly which game section it
          should appear in.
        </p>
      ) : (
        <div className="seller-list">
          {offers.map((offer) => {
            const game = getMarketplaceGame(offer.game_slug);
            const primaryImage = getPrimaryOfferImage(offer.offer_images);

            return (
              <article key={offer.id} className="seller-list__item seller-list__item--stacked">
                <div className="seller-list__main">
                  <div className="seller-list__headline">
                    {primaryImage ? (
                      <img className="seller-list__thumb" src={primaryImage.public_url} alt={offer.title} />
                    ) : (
                      <div className="seller-list__thumb seller-list__thumb--placeholder">No image</div>
                    )}

                    <div className="seller-list__headline-copy">
                      <strong>{offer.title}</strong>
                      <span>
                        {game?.title ?? offer.game_slug} / {offer.category_slug}
                      </span>
                      <p>{offer.description}</p>
                    </div>
                  </div>
                </div>

                <div className="seller-list__meta">
                  <strong>${offer.price_usd.toFixed(2)}</strong>
                  <span>{offer.status}</span>
                  <span>Stock: {offer.stock_count}</span>
                  <span>{getOfferDeliveryModeLabel(offer.delivery_mode)}</span>
                  <span>{offer.delivery_time}</span>
                </div>

                <div className="seller-list__actions">
                  <Link className="ghost-button" href={`/marketplace/${offer.game_slug}?category=${offer.category_slug}`}>
                    View Placement
                  </Link>
                  <Link className="ghost-button" href={`/sell/offers/${offer.id}/edit`}>
                    Edit
                  </Link>
                  <button
                    className="ghost-button seller-list__delete"
                    type="button"
                    onClick={() => handleDelete(offer.id)}
                    disabled={deletingId === offer.id}
                  >
                    {deletingId === offer.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import {
  attachImagesToOffers,
  normalizeOfferImageRow,
  normalizeOfferRow,
} from "@/lib/marketplace-compat";
import { type OfferWithImagesRow, type OrderReviewRow } from "@/lib/marketplace-types";
import { type SellerPublicProfileData } from "@/lib/public-marketplace";
import { getSellerRatingSummary, normalizeOrderReviewRow } from "@/lib/seller-ratings";
import { supabase } from "@/lib/supabase-client";

import { SellerPublicProfileView } from "./seller-public-profile-view";

type SellerPublicProfileClientPageProps = {
  sellerId: string;
};

type SellerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export function SellerPublicProfileClientPage({ sellerId }: SellerPublicProfileClientPageProps) {
  const [data, setData] = useState<SellerPublicProfileData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStorefront() {
      setError("");

      const [profileResult, offersResult, reviewsResult] = await Promise.all([
        supabase
          .from("marketplace_seller_profiles")
          .select("id,full_name,avatar_url,role")
          .eq("id", sellerId)
          .maybeSingle(),
        supabase
          .from("offers")
          .select("*")
          .eq("seller_id", sellerId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase.from("order_reviews").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;

      if (profileResult.error || offersResult.error || reviewsResult.error) {
        setError("This seller storefront could not be loaded. Please try again.");
        return;
      }

      const offers = (offersResult.data ?? [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => normalizeOfferRow(item));
      const reviews = (reviewsResult.data ?? [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => normalizeOrderReviewRow(item));
      const profile = profileResult.data as SellerProfile | null;

      if (!profile && offers.length === 0) {
        setError("This seller storefront is no longer available.");
        return;
      }

      const { data: imagesData } = offers.length
        ? await supabase
            .from("offer_images")
            .select("*")
            .in(
              "offer_id",
              offers.map((offer) => offer.id)
            )
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        : { data: [] };

      if (!isMounted) return;

      const images = (imagesData ?? [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => normalizeOfferImageRow(item));
      const offersWithImages: OfferWithImagesRow[] = attachImagesToOffers(offers, images);

      setData({
        profile: profile ?? { id: sellerId, full_name: "Seller", avatar_url: null, role: null },
        offers: offersWithImages,
        reviews,
        ratingSummary: getSellerRatingSummary(reviews),
        // This fallback is used only when the server key is unavailable. Reviews are public;
        // total completed orders remain available when the server-side loader is configured.
        completedOrders: reviews.length,
      });
    }

    void loadStorefront();

    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  if (error) {
    return (
      <main className="module-page seller-public-page">
        <div className="shell">
          <p className="auth-feedback auth-feedback--error">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="module-page seller-public-page">
        <div className="shell">
          <p className="auth-feedback auth-feedback--success">Loading seller storefront...</p>
        </div>
      </main>
    );
  }

  return <SellerPublicProfileView data={data} />;
}

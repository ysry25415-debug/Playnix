import {
  attachImagesToOffers,
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOfferImageRow,
  normalizeOfferRow,
} from "@/lib/marketplace-compat";
import { type OfferWithImagesRow, type OrderReviewRow } from "@/lib/marketplace-types";
import { getSellerRatingSummary, normalizeOrderReviewRow, type SellerRatingSummary } from "@/lib/seller-ratings";
import { getServiceRoleClient } from "@/lib/server-auth";

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type SellerPublicProfileData = {
  profile: PublicProfile;
  offers: OfferWithImagesRow[];
  reviews: OrderReviewRow[];
  ratingSummary: SellerRatingSummary;
  completedOrders: number;
};

export type PublicOfferDetailsData = {
  offer: OfferWithImagesRow;
  seller: PublicProfile;
  reviews: OrderReviewRow[];
  ratingSummary: SellerRatingSummary;
  completedOrders: number;
  sellerOffers: OfferWithImagesRow[];
};

async function loadOffersWithImages(offerIds: string[]) {
  const adminClient = getServiceRoleClient();
  if (!adminClient || offerIds.length === 0) {
    return [];
  }

  const { data: offersData, error: offersError } = await adminClient
    .from("offers")
    .select("*")
    .in("id", offerIds);

  if (offersError || !offersData) {
    return [];
  }

  const normalizedOffers = offersData
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeOfferRow(item));

  const { data: imagesData } = await adminClient
    .from("offer_images")
    .select("*")
    .in("offer_id", offerIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const normalizedImages = (imagesData ?? [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeOfferImageRow(item));

  return attachImagesToOffers(normalizedOffers, normalizedImages);
}

async function loadSellerReviews(sellerId: string) {
  const adminClient = getServiceRoleClient();
  if (!adminClient) {
    return { reviews: [] as OrderReviewRow[], error: "" };
  }

  const { data, error } = await adminClient
    .from("order_reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isLikelySchemaCompatibilityError(error.message)) {
      return { reviews: [] as OrderReviewRow[], error: getSchemaCompatibilityMessage("Seller reviews") };
    }

    return { reviews: [] as OrderReviewRow[], error: error.message };
  }

  return {
    reviews: (data ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => normalizeOrderReviewRow(item)),
    error: "",
  };
}

async function loadCompletedOrdersCount(sellerId: string) {
  const adminClient = getServiceRoleClient();
  if (!adminClient) {
    return 0;
  }

  const { count } = await adminClient
    .from("orders")
    .select("id", { head: true, count: "exact" })
    .eq("seller_id", sellerId)
    .eq("status", "delivered");

  return count ?? 0;
}

export async function loadPublicSellerProfile(sellerId: string): Promise<SellerPublicProfileData | null> {
  const adminClient = getServiceRoleClient();
  if (!adminClient || !sellerId) {
    return null;
  }

  const [{ data: profileData }, { data: offersData }, { reviews }] = await Promise.all([
    adminClient.from("profiles").select("id,full_name,avatar_url,role").eq("id", sellerId).maybeSingle(),
    adminClient
      .from("offers")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    loadSellerReviews(sellerId),
  ]);

  const normalizedOffers = (offersData ?? [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeOfferRow(item));
  const offersWithImages = await loadOffersWithImages(normalizedOffers.map((offer) => offer.id));
  const completedOrders = await loadCompletedOrdersCount(sellerId);

  if (!profileData && offersWithImages.length === 0) {
    return null;
  }

  return {
    profile: {
      id: sellerId,
      full_name: profileData?.full_name ?? "Seller",
      avatar_url: profileData?.avatar_url ?? null,
      role: profileData?.role ?? null,
    },
    offers: offersWithImages,
    reviews,
    ratingSummary: getSellerRatingSummary(reviews),
    completedOrders,
  };
}

export async function loadPublicOfferDetails(offerId: string): Promise<PublicOfferDetailsData | null> {
  const adminClient = getServiceRoleClient();
  if (!adminClient || !offerId) {
    return null;
  }

  const { data: offerData } = await adminClient
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .eq("status", "active")
    .maybeSingle();

  if (!offerData) {
    return null;
  }

  const offer = normalizeOfferRow(offerData as Record<string, unknown>);

  const [{ data: profileData }, { data: sellerOffersData }, { reviews }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id,full_name,avatar_url,role")
      .eq("id", offer.seller_id)
      .maybeSingle(),
    adminClient
      .from("offers")
      .select("*")
      .eq("seller_id", offer.seller_id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    loadSellerReviews(offer.seller_id),
  ]);

  const sellerOffers = (sellerOffersData ?? [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeOfferRow(item));
  const sellerOffersWithImages = await loadOffersWithImages(sellerOffers.map((item) => item.id));
  const completedOrders = await loadCompletedOrdersCount(offer.seller_id);
  const mainOffer = sellerOffersWithImages.find((item) => item.id === offer.id) ?? { ...offer, offer_images: [] };

  return {
    offer: mainOffer,
    seller: {
      id: offer.seller_id,
      full_name: profileData?.full_name ?? "Seller",
      avatar_url: profileData?.avatar_url ?? null,
      role: profileData?.role ?? null,
    },
    reviews,
    ratingSummary: getSellerRatingSummary(reviews),
    completedOrders,
    sellerOffers: sellerOffersWithImages.filter((item) => item.id !== offer.id).slice(0, 4),
  };
}

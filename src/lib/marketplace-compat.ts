import {
  type OfferDeliveryMode,
  type OfferImageRow,
  type OfferRow,
  type OfferStatus,
  type OfferWithImagesRow,
  type OrderRow,
  type OrderStatus,
} from "@/lib/marketplace-types";

type LooseRow = Record<string, unknown>;

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

function offerDeliveryModeOr(value: unknown): OfferDeliveryMode {
  return value === "instant" ? "instant" : "chat";
}

function offerStatusOr(value: unknown): OfferStatus {
  if (value === "draft" || value === "active" || value === "paused" || value === "sold_out") {
    return value;
  }

  return "active";
}

function orderStatusOr(value: unknown): OrderStatus {
  if (value === "pending" || value === "paid" || value === "delivered" || value === "cancelled") {
    return value;
  }

  return "pending";
}

export function normalizeOfferImageRow(row: LooseRow): OfferImageRow {
  return {
    id: stringOr(row.id),
    offer_id: stringOr(row.offer_id),
    seller_id: stringOr(row.seller_id),
    storage_path: stringOr(row.storage_path),
    public_url: stringOr(row.public_url),
    is_primary: Boolean(row.is_primary),
    sort_order: numberOr(row.sort_order, 0),
    created_at: stringOr(row.created_at),
  };
}

export function normalizeOfferRow(row: LooseRow): OfferRow {
  return {
    id: stringOr(row.id),
    seller_id: stringOr(row.seller_id),
    game_slug: stringOr(row.game_slug),
    category_slug: stringOr(row.category_slug),
    title: stringOr(row.title, "Untitled offer"),
    description: stringOr(row.description),
    price_usd: numberOr(row.price_usd, 0),
    delivery_mode: offerDeliveryModeOr(row.delivery_mode),
    delivery_time: stringOr(row.delivery_time, "Contact seller"),
    stock_count: numberOr(row.stock_count, 1),
    status: offerStatusOr(row.status),
    created_at: stringOr(row.created_at),
    updated_at: stringOr(row.updated_at),
  };
}

export function normalizeOfferWithImagesRow(row: LooseRow): OfferWithImagesRow {
  const offer = normalizeOfferRow(row);
  const rawImages = Array.isArray(row.offer_images) ? row.offer_images : [];

  return {
    ...offer,
    offer_images: rawImages
      .filter((image): image is LooseRow => Boolean(image) && typeof image === "object")
      .map((image) => normalizeOfferImageRow(image)),
  };
}

export function normalizeOrderRow(row: LooseRow): OrderRow {
  return {
    id: stringOr(row.id),
    offer_id: stringOr(row.offer_id),
    buyer_id: stringOr(row.buyer_id),
    seller_id: stringOr(row.seller_id),
    game_slug: stringOr(row.game_slug),
    category_slug: stringOr(row.category_slug),
    offer_title: stringOr(row.offer_title, "Untitled order"),
    price_usd: numberOr(row.price_usd, 0),
    delivery_mode: offerDeliveryModeOr(row.delivery_mode),
    status: orderStatusOr(row.status),
    created_at: stringOr(row.created_at),
  };
}

export function attachImagesToOffers(
  offers: OfferRow[],
  images: OfferImageRow[]
): OfferWithImagesRow[] {
  const imagesByOfferId = new Map<string, OfferImageRow[]>();

  images.forEach((image) => {
    const current = imagesByOfferId.get(image.offer_id) ?? [];
    current.push(image);
    imagesByOfferId.set(image.offer_id, current);
  });

  return offers.map((offer) => ({
    ...offer,
    offer_images: imagesByOfferId.get(offer.id) ?? [],
  }));
}

export function isLikelySchemaCompatibilityError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("relationship") ||
    normalized.includes("could not find the") ||
    normalized.includes("not found in the schema")
  );
}

export function getSchemaCompatibilityMessage(subject: string) {
  return `${subject} needs the latest Supabase SQL update. Run docs/supabase-marketplace.sql once, then retry.`;
}

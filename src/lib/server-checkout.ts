import { type SupabaseClient } from "@supabase/supabase-js";

import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOfferRow,
} from "@/lib/marketplace-compat";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout";

type CheckoutResult =
  | { ok: true; orderId: string; url: string }
  | { ok: false; error: string; status: number };

function toApiError(message: string, subject: string) {
  return isLikelySchemaCompatibilityError(message)
    ? getSchemaCompatibilityMessage(subject)
    : message;
}

export async function startOfferCheckout(input: {
  adminClient: SupabaseClient;
  buyerId: string;
  offerId: string;
  origin: string;
}): Promise<CheckoutResult> {
  const { adminClient, buyerId, offerId, origin } = input;

  const { data: offer, error: offerError } = await adminClient
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return {
      ok: false,
      error: offerError ? toApiError(offerError.message, "Checkout") : "Offer not found.",
      status: 404,
    };
  }

  const normalizedOffer = normalizeOfferRow(offer as Record<string, unknown>);

  if (normalizedOffer.seller_id === buyerId) {
    return { ok: false, error: "You cannot buy your own offer.", status: 409 };
  }

  if (normalizedOffer.status !== "active" || normalizedOffer.stock_count < 1) {
    return { ok: false, error: "This offer is no longer available.", status: 409 };
  }

  let instantDeliveryContent: string | null = null;
  if (normalizedOffer.delivery_mode === "instant") {
    const { data: privateDelivery, error: privateDeliveryError } = await adminClient
      .from("offer_private_deliveries")
      .select("delivery_content")
      .eq("offer_id", normalizedOffer.id)
      .eq("seller_id", normalizedOffer.seller_id)
      .maybeSingle();

    if (privateDeliveryError) {
      return {
        ok: false,
        error: toApiError(privateDeliveryError.message, "Instant delivery setup"),
        status: 400,
      };
    }

    instantDeliveryContent = privateDelivery?.delivery_content?.trim() ?? null;
    if (!instantDeliveryContent) {
      return {
        ok: false,
        error: "This instant-delivery offer is missing its delivery details.",
        status: 409,
      };
    }
  }

  const orderId = crypto.randomUUID();
  const { error: orderError } = await adminClient.from("orders").insert({
    id: orderId,
    offer_id: normalizedOffer.id,
    buyer_id: buyerId,
    seller_id: normalizedOffer.seller_id,
    game_slug: normalizedOffer.game_slug,
    category_slug: normalizedOffer.category_slug,
    offer_title: normalizedOffer.title,
    price_usd: normalizedOffer.price_usd,
    delivery_mode: normalizedOffer.delivery_mode,
    // A pending order is a private checkout draft. It is not exposed to the seller.
    status: "pending",
  });

  if (orderError) {
    return { ok: false, error: toApiError(orderError.message, "Checkout"), status: 400 };
  }

  const { error: deliveryDetailsError } = await adminClient.from("order_delivery_details").insert({
    order_id: orderId,
    offer_id: normalizedOffer.id,
    seller_id: normalizedOffer.seller_id,
    buyer_id: buyerId,
    delivery_mode: normalizedOffer.delivery_mode,
    delivery_content: instantDeliveryContent,
    unlocked_at: null,
  });

  if (deliveryDetailsError) {
    await adminClient.from("orders").delete().eq("id", orderId);
    return {
      ok: false,
      error: toApiError(deliveryDetailsError.message, "Checkout"),
      status: 400,
    };
  }

  const checkoutUrl = `${origin}/checkout/${normalizedOffer.id}`;
  const { data: stripeSession, error: stripeError } = await createStripeCheckoutSession({
    orderId,
    offerTitle: normalizedOffer.title,
    amountUsd: normalizedOffer.price_usd,
    buyerId,
    sellerId: normalizedOffer.seller_id,
    successUrl: `${checkoutUrl}?order_id=${orderId}&stripe_session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${checkoutUrl}?cancelled=1`,
  });

  if (stripeError || !stripeSession?.url) {
    await adminClient.from("order_delivery_details").delete().eq("order_id", orderId);
    await adminClient.from("orders").delete().eq("id", orderId);
    return {
      ok: false,
      error: stripeError ?? "Could not create Stripe checkout session.",
      status: 400,
    };
  }

  return { ok: true, orderId, url: stripeSession.url };
}

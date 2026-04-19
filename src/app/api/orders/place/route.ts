import { NextRequest, NextResponse } from "next/server";

import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOfferRow,
} from "@/lib/marketplace-compat";
import { createUserNotification, requireApiUser } from "@/lib/server-auth";

function toApiError(message: string, subject: string) {
  return isLikelySchemaCompatibilityError(message)
    ? getSchemaCompatibilityMessage(subject)
    : message;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const offerId = typeof body?.offerId === "string" ? body.offerId : "";

  if (!offerId) {
    return NextResponse.json({ error: "Offer id is required." }, { status: 400 });
  }

  const { data: offer, error: offerError } = await adminClient
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return NextResponse.json(
      { error: offerError ? toApiError(offerError.message, "Order placement") : "Offer not found." },
      { status: 404 }
    );
  }

  const normalizedOffer = normalizeOfferRow(offer as Record<string, unknown>);

  if (normalizedOffer.seller_id === user.id) {
    return NextResponse.json({ error: "You cannot buy your own offer." }, { status: 409 });
  }

  if (normalizedOffer.status !== "active" || normalizedOffer.stock_count < 1) {
    return NextResponse.json({ error: "This offer is no longer available." }, { status: 409 });
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
      return NextResponse.json(
        { error: toApiError(privateDeliveryError.message, "Instant delivery setup") },
        { status: 400 }
      );
    }

    instantDeliveryContent = privateDelivery?.delivery_content?.trim() ?? null;

    if (!instantDeliveryContent) {
      return NextResponse.json(
        { error: "This instant-delivery offer is missing its delivery details." },
        { status: 409 }
      );
    }
  }

  const nextOrderId = crypto.randomUUID();

  const { error: orderError } = await adminClient.from("orders").insert({
    id: nextOrderId,
    offer_id: normalizedOffer.id,
    buyer_id: user.id,
    seller_id: normalizedOffer.seller_id,
    game_slug: normalizedOffer.game_slug,
    category_slug: normalizedOffer.category_slug,
    offer_title: normalizedOffer.title,
    price_usd: normalizedOffer.price_usd,
    delivery_mode: normalizedOffer.delivery_mode,
    status: "pending",
  });

  if (orderError) {
    return NextResponse.json(
      { error: toApiError(orderError.message, "Order placement") },
      { status: 400 }
    );
  }

  const { error: deliveryDetailsError } = await adminClient.from("order_delivery_details").insert({
    order_id: nextOrderId,
    offer_id: normalizedOffer.id,
    seller_id: normalizedOffer.seller_id,
    buyer_id: user.id,
    delivery_mode: normalizedOffer.delivery_mode,
    delivery_content: instantDeliveryContent,
    unlocked_at: null,
  });

  if (deliveryDetailsError) {
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json(
      { error: toApiError(deliveryDetailsError.message, "Order delivery details") },
      { status: 400 }
    );
  }

  const { error: roomError } = await adminClient.from("order_trade_rooms").insert({
    order_id: nextOrderId,
    offer_id: normalizedOffer.id,
    seller_id: normalizedOffer.seller_id,
    buyer_id: user.id,
    delivery_window_minutes: 60,
    room_status: "awaiting_seller",
    payment_status: "unpaid",
    resolution_status: "none",
  });

  if (roomError) {
    await adminClient.from("order_delivery_details").delete().eq("order_id", nextOrderId);
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json(
      { error: toApiError(roomError.message, "Order room setup") },
      { status: 400 }
    );
  }

  const { error: messageError } = await adminClient.from("order_messages").insert({
    order_id: nextOrderId,
    sender_id: null,
    message: "Order created. Waiting for the seller to open the delivery room.",
    is_system: true,
  });

  if (messageError) {
    await adminClient.from("order_trade_rooms").delete().eq("order_id", nextOrderId);
    await adminClient.from("order_delivery_details").delete().eq("order_id", nextOrderId);
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json(
      { error: toApiError(messageError.message, "Order messages") },
      { status: 400 }
    );
  }

  await createUserNotification(adminClient, {
    recipientId: normalizedOffer.seller_id,
    actorId: user.id,
    orderId: nextOrderId,
    title: "New order waiting",
    body: "A buyer created a new order. Open it and start the delivery room when you are ready.",
    actionHref: `/orders/${nextOrderId}`,
  });

  return NextResponse.json({
    ok: true,
    orderId: nextOrderId,
    deliveryMode: normalizedOffer.delivery_mode,
  });
}

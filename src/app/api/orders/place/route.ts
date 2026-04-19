import { NextRequest, NextResponse } from "next/server";

import { createUserNotification, requireApiUser } from "@/lib/server-auth";

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
    .select("id,seller_id,game_slug,category_slug,title,price_usd,delivery_mode,stock_count,status")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  if (offer.seller_id === user.id) {
    return NextResponse.json({ error: "You cannot buy your own offer." }, { status: 409 });
  }

  if (offer.status !== "active" || offer.stock_count < 1) {
    return NextResponse.json({ error: "This offer is no longer available." }, { status: 409 });
  }

  let instantDeliveryContent: string | null = null;

  if (offer.delivery_mode === "instant") {
    const { data: privateDelivery, error: privateDeliveryError } = await adminClient
      .from("offer_private_deliveries")
      .select("delivery_content")
      .eq("offer_id", offer.id)
      .eq("seller_id", offer.seller_id)
      .maybeSingle();

    if (privateDeliveryError) {
      return NextResponse.json({ error: privateDeliveryError.message }, { status: 400 });
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
    offer_id: offer.id,
    buyer_id: user.id,
    seller_id: offer.seller_id,
    game_slug: offer.game_slug,
    category_slug: offer.category_slug,
    offer_title: offer.title,
    price_usd: offer.price_usd,
    delivery_mode: offer.delivery_mode,
    status: "pending",
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const { error: deliveryDetailsError } = await adminClient.from("order_delivery_details").insert({
    order_id: nextOrderId,
    offer_id: offer.id,
    seller_id: offer.seller_id,
    buyer_id: user.id,
    delivery_mode: offer.delivery_mode,
    delivery_content: instantDeliveryContent,
    unlocked_at: null,
  });

  if (deliveryDetailsError) {
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json({ error: deliveryDetailsError.message }, { status: 400 });
  }

  const { error: roomError } = await adminClient.from("order_trade_rooms").insert({
    order_id: nextOrderId,
    offer_id: offer.id,
    seller_id: offer.seller_id,
    buyer_id: user.id,
    delivery_window_minutes: 60,
    room_status: "awaiting_seller",
    payment_status: "unpaid",
    resolution_status: "none",
  });

  if (roomError) {
    await adminClient.from("order_delivery_details").delete().eq("order_id", nextOrderId);
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json({ error: roomError.message }, { status: 400 });
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
    return NextResponse.json({ error: messageError.message }, { status: 400 });
  }

  await createUserNotification(adminClient, {
    recipientId: offer.seller_id,
    actorId: user.id,
    orderId: nextOrderId,
    title: "New order waiting",
    body: "A buyer created a new order. Open it and start the delivery room when you are ready.",
    actionHref: `/orders/${nextOrderId}`,
  });

  return NextResponse.json({
    ok: true,
    orderId: nextOrderId,
    deliveryMode: offer.delivery_mode,
  });
}

import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user, role } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select(
      "id,offer_id,buyer_id,seller_id,game_slug,category_slug,offer_title,price_usd,delivery_mode,status,created_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? "Order not found." }, { status: 404 });
  }

  const canAccess = role === "admin" || order.buyer_id === user.id || order.seller_id === user.id;
  if (!canAccess) {
    return NextResponse.json({ error: "You cannot access this order room." }, { status: 403 });
  }

  const { data: existingRoom, error: existingRoomError } = await adminClient
    .from("order_trade_rooms")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingRoomError) {
    return NextResponse.json({ error: existingRoomError.message }, { status: 400 });
  }

  if (!existingRoom) {
    const { error: insertRoomError } = await adminClient.from("order_trade_rooms").insert({
      order_id: order.id,
      offer_id: order.offer_id,
      seller_id: order.seller_id,
      buyer_id: order.buyer_id,
      delivery_window_minutes: 60,
      room_status: "awaiting_seller",
      payment_status: "unpaid",
      resolution_status: "none",
    });

    if (insertRoomError) {
      return NextResponse.json({ error: insertRoomError.message }, { status: 400 });
    }
  } else {
    const roomNeedsSync =
      existingRoom.offer_id !== order.offer_id ||
      existingRoom.seller_id !== order.seller_id ||
      existingRoom.buyer_id !== order.buyer_id;

    if (roomNeedsSync) {
      const { error: syncRoomError } = await adminClient
        .from("order_trade_rooms")
        .update({
          offer_id: order.offer_id,
          seller_id: order.seller_id,
          buyer_id: order.buyer_id,
        })
        .eq("order_id", order.id);

      if (syncRoomError) {
        return NextResponse.json({ error: syncRoomError.message }, { status: 400 });
      }
    }
  }

  const { data: existingDelivery, error: existingDeliveryError } = await adminClient
    .from("order_delivery_details")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingDeliveryError) {
    return NextResponse.json({ error: existingDeliveryError.message }, { status: 400 });
  }

  if (!existingDelivery) {
    let deliveryContent: string | null = null;

    if (order.delivery_mode === "instant") {
      const { data: privateDelivery } = await adminClient
        .from("offer_private_deliveries")
        .select("delivery_content")
        .eq("offer_id", order.offer_id)
        .eq("seller_id", order.seller_id)
        .maybeSingle();

      deliveryContent = privateDelivery?.delivery_content?.trim() ?? null;
    }

    const { error: insertDeliveryError } = await adminClient.from("order_delivery_details").insert({
      order_id: order.id,
      offer_id: order.offer_id,
      seller_id: order.seller_id,
      buyer_id: order.buyer_id,
      delivery_mode: order.delivery_mode,
      delivery_content: deliveryContent,
      unlocked_at: null,
    });

    if (insertDeliveryError) {
      return NextResponse.json({ error: insertDeliveryError.message }, { status: 400 });
    }
  } else {
    const deliveryNeedsSync =
      existingDelivery.offer_id !== order.offer_id ||
      existingDelivery.seller_id !== order.seller_id ||
      existingDelivery.buyer_id !== order.buyer_id ||
      existingDelivery.delivery_mode !== order.delivery_mode;

    if (deliveryNeedsSync) {
      const { error: syncDeliveryError } = await adminClient
        .from("order_delivery_details")
        .update({
          offer_id: order.offer_id,
          seller_id: order.seller_id,
          buyer_id: order.buyer_id,
          delivery_mode: order.delivery_mode,
        })
        .eq("order_id", order.id);

      if (syncDeliveryError) {
        return NextResponse.json({ error: syncDeliveryError.message }, { status: 400 });
      }
    }
  }

  const { data: existingMessage, error: existingMessageError } = await adminClient
    .from("order_messages")
    .select("id")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();

  if (existingMessageError) {
    return NextResponse.json({ error: existingMessageError.message }, { status: 400 });
  }

  if (!existingMessage) {
    const { error: insertMessageError } = await adminClient.from("order_messages").insert({
      order_id: order.id,
      sender_id: null,
      message: "Order room initialized. Waiting for seller to start delivery.",
      is_system: true,
    });

    if (insertMessageError) {
      return NextResponse.json({ error: insertMessageError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

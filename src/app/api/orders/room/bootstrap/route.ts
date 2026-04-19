import { NextRequest, NextResponse } from "next/server";

import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOrderRow,
} from "@/lib/marketplace-compat";
import { requireApiUser } from "@/lib/server-auth";

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

  const { adminClient, user, role } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError ? toApiError(orderError.message, "Order room") : "Order not found." },
      { status: 404 }
    );
  }

  const normalizedOrder = normalizeOrderRow(order as Record<string, unknown>);

  const canAccess =
    role === "admin" ||
    normalizedOrder.buyer_id === user.id ||
    normalizedOrder.seller_id === user.id;
  if (!canAccess) {
    return NextResponse.json({ error: "You cannot access this order room." }, { status: 403 });
  }

  const { data: existingRoom, error: existingRoomError } = await adminClient
    .from("order_trade_rooms")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingRoomError) {
    return NextResponse.json(
      { error: toApiError(existingRoomError.message, "Order room") },
      { status: 400 }
    );
  }

  if (!existingRoom) {
    const { error: insertRoomError } = await adminClient.from("order_trade_rooms").insert({
      order_id: normalizedOrder.id,
      offer_id: normalizedOrder.offer_id,
      seller_id: normalizedOrder.seller_id,
      buyer_id: normalizedOrder.buyer_id,
      delivery_window_minutes: 60,
      room_status: "awaiting_seller",
      payment_status: "unpaid",
      resolution_status: "none",
    });

    if (insertRoomError) {
      return NextResponse.json(
        { error: toApiError(insertRoomError.message, "Order room setup") },
        { status: 400 }
      );
    }
  } else {
    const roomNeedsSync =
      existingRoom.offer_id !== normalizedOrder.offer_id ||
      existingRoom.seller_id !== normalizedOrder.seller_id ||
      existingRoom.buyer_id !== normalizedOrder.buyer_id;

    if (roomNeedsSync) {
      const { error: syncRoomError } = await adminClient
        .from("order_trade_rooms")
        .update({
          offer_id: normalizedOrder.offer_id,
          seller_id: normalizedOrder.seller_id,
          buyer_id: normalizedOrder.buyer_id,
        })
        .eq("order_id", normalizedOrder.id);

      if (syncRoomError) {
        return NextResponse.json(
          { error: toApiError(syncRoomError.message, "Order room setup") },
          { status: 400 }
        );
      }
    }
  }

  const { data: existingDelivery, error: existingDeliveryError } = await adminClient
    .from("order_delivery_details")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingDeliveryError) {
    return NextResponse.json(
      { error: toApiError(existingDeliveryError.message, "Order delivery details") },
      { status: 400 }
    );
  }

  if (!existingDelivery) {
    let deliveryContent: string | null = null;

    if (normalizedOrder.delivery_mode === "instant") {
      const { data: privateDelivery } = await adminClient
        .from("offer_private_deliveries")
        .select("delivery_content")
        .eq("offer_id", normalizedOrder.offer_id)
        .eq("seller_id", normalizedOrder.seller_id)
        .maybeSingle();

      deliveryContent = privateDelivery?.delivery_content?.trim() ?? null;
    }

    const { error: insertDeliveryError } = await adminClient.from("order_delivery_details").insert({
      order_id: normalizedOrder.id,
      offer_id: normalizedOrder.offer_id,
      seller_id: normalizedOrder.seller_id,
      buyer_id: normalizedOrder.buyer_id,
      delivery_mode: normalizedOrder.delivery_mode,
      delivery_content: deliveryContent,
      unlocked_at: null,
    });

    if (insertDeliveryError) {
      return NextResponse.json(
        { error: toApiError(insertDeliveryError.message, "Order delivery details") },
        { status: 400 }
      );
    }
  } else {
    const deliveryNeedsSync =
      existingDelivery.offer_id !== normalizedOrder.offer_id ||
      existingDelivery.seller_id !== normalizedOrder.seller_id ||
      existingDelivery.buyer_id !== normalizedOrder.buyer_id ||
      existingDelivery.delivery_mode !== normalizedOrder.delivery_mode;

    if (deliveryNeedsSync) {
      const { error: syncDeliveryError } = await adminClient
        .from("order_delivery_details")
        .update({
          offer_id: normalizedOrder.offer_id,
          seller_id: normalizedOrder.seller_id,
          buyer_id: normalizedOrder.buyer_id,
          delivery_mode: normalizedOrder.delivery_mode,
        })
        .eq("order_id", normalizedOrder.id);

      if (syncDeliveryError) {
        return NextResponse.json(
          { error: toApiError(syncDeliveryError.message, "Order delivery details") },
          { status: 400 }
        );
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
    return NextResponse.json(
      { error: toApiError(existingMessageError.message, "Order messages") },
      { status: 400 }
    );
  }

  if (!existingMessage) {
    const { error: insertMessageError } = await adminClient.from("order_messages").insert({
      order_id: normalizedOrder.id,
      sender_id: null,
      message: "Order room initialized. Waiting for seller to start delivery.",
      is_system: true,
    });

    if (insertMessageError) {
      return NextResponse.json(
        { error: toApiError(insertMessageError.message, "Order messages") },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

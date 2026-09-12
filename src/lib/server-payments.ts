import { type SupabaseClient } from "@supabase/supabase-js";

import { createUserNotification } from "@/lib/server-auth";
import { appendSystemOrderMessage } from "@/lib/server-order-room";
import { normalizeOrderRow } from "@/lib/marketplace-compat";

export async function markOrderPaymentHeldFromStripe(
  adminClient: SupabaseClient,
  orderId: string,
  stripeSessionId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: orderData, error: orderError } = await adminClient
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return { ok: false, error: orderError?.message ?? "Order not found.", status: 404 };
  }

  const order = normalizeOrderRow(orderData as Record<string, unknown>);
  if (order.status !== "pending" && order.status !== "paid") {
    return { ok: false, error: "This order cannot be paid.", status: 409 };
  }

  let paymentWasJustConfirmed = false;
  if (order.status === "pending") {
    const { data: updatedOrders, error: updateOrderError } = await adminClient
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("id");

    if (updateOrderError) {
      return { ok: false, error: updateOrderError.message, status: 400 };
    }

    paymentWasJustConfirmed = (updatedOrders ?? []).length > 0;
  }

  const now = new Date().toISOString();
  const { data: existingRoom, error: roomLookupError } = await adminClient
    .from("order_trade_rooms")
    .select("order_id,payment_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (roomLookupError) {
    return { ok: false, error: roomLookupError.message, status: 400 };
  }

  if (existingRoom) {
    if (existingRoom.payment_status === "unpaid") {
      const { error: roomUpdateError } = await adminClient
        .from("order_trade_rooms")
        .update({
          payment_status: "held",
          buyer_paid_at: now,
          buyer_card_last4: "stripe",
          buyer_card_holder: "Stripe Checkout",
          resolution_status: "none",
        })
        .eq("order_id", orderId);

      if (roomUpdateError) {
        return { ok: false, error: roomUpdateError.message, status: 400 };
      }
    }
  } else {
    const { error: roomInsertError } = await adminClient.from("order_trade_rooms").insert({
      order_id: orderId,
      offer_id: order.offer_id,
      seller_id: order.seller_id,
      buyer_id: order.buyer_id,
      delivery_window_minutes: 60,
      // The paid order is now visible to the seller, who starts delivery when ready.
      room_status: "awaiting_seller",
      payment_status: "held",
      resolution_status: "none",
      buyer_paid_at: now,
      buyer_card_last4: "stripe",
      buyer_card_holder: "Stripe Checkout",
    });

    if (roomInsertError) {
      return { ok: false, error: roomInsertError.message, status: 400 };
    }
  }

  if (order.delivery_mode === "instant") {
    await adminClient
      .from("order_delivery_details")
      .update({ unlocked_at: now })
      .eq("order_id", orderId);
  }

  if (paymentWasJustConfirmed) {
    await appendSystemOrderMessage(
      adminClient,
      orderId,
      `Stripe payment confirmed. Funds are held on the platform until delivery is confirmed. Session: ${stripeSessionId}`
    );

    await createUserNotification(adminClient, {
      recipientId: order.seller_id,
      actorId: order.buyer_id,
      orderId,
      title: "Buyer payment confirmed",
      body: "Stripe confirmed the buyer payment. You can start delivery inside the order room.",
      actionHref: `/orders/${orderId}`,
    });

    await createUserNotification(adminClient, {
      recipientId: order.buyer_id,
      actorId: order.seller_id,
      orderId,
      title: "Payment hold is active",
      body: "Your payment was confirmed and is now held safely on the platform until delivery is completed.",
      actionHref: `/orders/${orderId}`,
    });
  }

  return { ok: true };
}

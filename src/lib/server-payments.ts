import { type SupabaseClient } from "@supabase/supabase-js";

import { createUserNotification } from "@/lib/server-auth";
import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";

export async function markOrderPaymentHeldFromStripe(
  adminClient: SupabaseClient,
  orderId: string,
  stripeSessionId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const context = await loadOrderRoomContext(adminClient, orderId);

  if (context.error || !context.order || !context.room) {
    return { ok: false, error: context.error ?? "Order room not found.", status: 404 };
  }

  if (context.room.payment_status !== "unpaid") {
    return { ok: true };
  }

  if (context.room.room_status !== "open") {
    return { ok: false, error: "The seller has not opened the delivery room yet.", status: 409 };
  }

  const now = new Date().toISOString();

  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update({
      payment_status: "held",
      buyer_paid_at: now,
      buyer_card_last4: "stripe",
      buyer_card_holder: "Stripe Checkout",
      resolution_status: "none",
    })
    .eq("order_id", orderId);

  if (roomError) {
    return { ok: false, error: roomError.message, status: 400 };
  }

  const { error: orderError } = await adminClient
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId);

  if (orderError) {
    return { ok: false, error: orderError.message, status: 400 };
  }

  if (context.order.delivery_mode === "instant") {
    await adminClient
      .from("order_delivery_details")
      .update({ unlocked_at: now })
      .eq("order_id", orderId);
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    `Stripe payment confirmed. Funds are held on the platform until delivery is confirmed. Session: ${stripeSessionId}`
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.seller_id,
    actorId: context.order.buyer_id,
    orderId,
    title: "Buyer payment confirmed",
    body: "Stripe confirmed the buyer payment. You can continue the delivery inside the order room.",
    actionHref: `/orders/${orderId}`,
  });

  return { ok: true };
}

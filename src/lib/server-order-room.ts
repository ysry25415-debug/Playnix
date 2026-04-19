import { type SupabaseClient } from "@supabase/supabase-js";

import { type OrderRow, type OrderTradeRoomRow } from "@/lib/marketplace-types";

export async function loadOrderRoomContext(
  adminClient: SupabaseClient,
  orderId: string
): Promise<{
  order: OrderRow | null;
  room: OrderTradeRoomRow | null;
  error: string | null;
}> {
  const [{ data: orderData, error: orderError }, { data: roomData, error: roomError }] =
    await Promise.all([
      adminClient
        .from("orders")
        .select(
          "id,offer_id,buyer_id,seller_id,game_slug,category_slug,offer_title,price_usd,delivery_mode,status,created_at"
        )
        .eq("id", orderId)
        .maybeSingle(),
      adminClient
        .from("order_trade_rooms")
        .select(
          "order_id,offer_id,seller_id,buyer_id,delivery_window_minutes,room_status,payment_status,resolution_status,seller_started_at,delivery_deadline,buyer_paid_at,buyer_card_last4,buyer_card_holder,seller_marked_delivered_at,buyer_confirmed_received_at,buyer_disputed_at,resolved_at,resolved_by,resolution_note,created_at,updated_at"
        )
        .eq("order_id", orderId)
        .maybeSingle(),
    ]);

  if (orderError || !orderData) {
    return {
      order: null,
      room: null,
      error: orderError?.message ?? "Order not found.",
    };
  }

  if (roomError || !roomData) {
    return {
      order: orderData as OrderRow,
      room: null,
      error: roomError?.message ?? "Order room not found.",
    };
  }

  return {
    order: orderData as OrderRow,
    room: roomData as OrderTradeRoomRow,
    error: null,
  };
}

export async function appendSystemOrderMessage(
  adminClient: SupabaseClient,
  orderId: string,
  message: string
) {
  return adminClient.from("order_messages").insert({
    order_id: orderId,
    sender_id: null,
    message,
    is_system: true,
  });
}

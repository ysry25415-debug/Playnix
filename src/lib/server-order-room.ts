import { type SupabaseClient } from "@supabase/supabase-js";

import { normalizeOrderRow } from "@/lib/marketplace-compat";
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
        .select("*")
        .eq("id", orderId)
        .maybeSingle(),
      adminClient
        .from("order_trade_rooms")
        .select("*")
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
      order: normalizeOrderRow(orderData as Record<string, unknown>),
      room: null,
      error: roomError?.message ?? "Order room not found.",
    };
  }

  return {
    order: normalizeOrderRow(orderData as Record<string, unknown>),
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

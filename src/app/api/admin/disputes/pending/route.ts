import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiUser } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient } = auth;
  const { data: rooms, error: roomsError } = await adminClient
    .from("order_trade_rooms")
    .select(
      "order_id,offer_id,seller_id,buyer_id,delivery_window_minutes,room_status,payment_status,resolution_status,seller_started_at,delivery_deadline,buyer_paid_at,buyer_card_last4,buyer_card_holder,seller_marked_delivered_at,buyer_confirmed_received_at,buyer_disputed_at,resolved_at,resolved_by,resolution_note,created_at,updated_at"
    )
    .eq("room_status", "disputed")
    .order("buyer_disputed_at", { ascending: false });

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 400 });
  }

  const orderIds = (rooms ?? []).map((room) => room.order_id);
  const partyIds = Array.from(
    new Set(
      (rooms ?? []).flatMap((room) => [room.seller_id, room.buyer_id]).filter((value): value is string => Boolean(value))
    )
  );

  const [{ data: orders }, { data: profiles }] = await Promise.all([
    orderIds.length
      ? adminClient
          .from("orders")
          .select("id,offer_id,buyer_id,seller_id,game_slug,category_slug,offer_title,price_usd,delivery_mode,status,created_at")
          .in("id", orderIds)
      : Promise.resolve({ data: [] }),
    partyIds.length
      ? adminClient.from("profiles").select("id,full_name,avatar_url").in("id", partyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orderMap = new Map((orders ?? []).map((item) => [item.id, item]));
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));

  return NextResponse.json({
    items: (rooms ?? []).map((room) => ({
      room,
      order: orderMap.get(room.order_id) ?? null,
      buyerProfile: profileMap.get(room.buyer_id) ?? null,
      sellerProfile: profileMap.get(room.seller_id) ?? null,
    })),
  });
}

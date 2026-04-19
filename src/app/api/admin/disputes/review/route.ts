import { NextRequest, NextResponse } from "next/server";

import { createUserNotification, requireAdminApiUser } from "@/lib/server-auth";
import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";

type DisputeDecision = "seller" | "buyer";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const decision = body?.decision as DisputeDecision | undefined;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!orderId || (decision !== "seller" && decision !== "buyer")) {
    return NextResponse.json({ error: "Invalid dispute review payload." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.room.room_status !== "disputed") {
    return NextResponse.json({ error: "This order is not currently disputed." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const roomPayload =
    decision === "seller"
      ? {
          payment_status: "released",
          room_status: "closed",
          resolution_status: "resolved_for_seller",
          resolved_at: now,
          resolved_by: user.id,
          resolution_note: note || null,
        }
      : {
          payment_status: "refunded",
          room_status: "closed",
          resolution_status: "resolved_for_buyer",
          resolved_at: now,
          resolved_by: user.id,
          resolution_note: note || null,
        };

  const orderStatus = decision === "seller" ? "delivered" : "cancelled";

  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update(roomPayload)
    .eq("order_id", orderId);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  const { error: orderError } = await adminClient
    .from("orders")
    .update({
      status: orderStatus,
    })
    .eq("id", orderId);

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    decision === "seller"
      ? "Admin resolved the dispute for the seller. Funds were released to the seller."
      : "Admin resolved the dispute for the buyer. The held payment was refunded."
  );

  const commonNote = note ? ` Admin note: ${note}` : "";

  await Promise.all([
    createUserNotification(adminClient, {
      recipientId: context.order.seller_id,
      actorId: user.id,
      orderId,
      title: "Dispute resolved",
      body:
        decision === "seller"
          ? `Admin resolved this dispute in your favor.${commonNote}`
          : `Admin resolved this dispute for the buyer.${commonNote}`,
      actionHref: `/orders/${orderId}`,
    }),
    createUserNotification(adminClient, {
      recipientId: context.order.buyer_id,
      actorId: user.id,
      orderId,
      title: "Dispute resolved",
      body:
        decision === "buyer"
          ? `Admin resolved this dispute in your favor.${commonNote}`
          : `Admin resolved this dispute for the seller.${commonNote}`,
      actionHref: `/orders/${orderId}`,
    }),
  ]);

  return NextResponse.json({ ok: true });
}

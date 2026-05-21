import { NextRequest, NextResponse } from "next/server";

import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";
import { createUserNotification, requireApiUser } from "@/lib/server-auth";

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

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.seller_id !== user.id && role !== "admin") {
    return NextResponse.json({ error: "Only the seller can cancel this pending order." }, { status: 403 });
  }

  if (
    context.order.status !== "pending" ||
    context.room.room_status !== "awaiting_seller" ||
    context.room.payment_status !== "unpaid"
  ) {
    return NextResponse.json(
      { error: "Only unpaid waiting orders can be cancelled from the seller queue." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  const { error: orderError } = await adminClient
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update({
      room_status: "closed",
      resolution_status: "resolved_for_buyer",
      resolved_at: now,
      resolution_note: "Seller cancelled the order before opening the delivery room.",
    })
    .eq("order_id", orderId);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    "Seller cancelled this order before the live room started. No buyer payment hold was created."
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.buyer_id,
    actorId: context.order.seller_id,
    orderId,
    title: "Order cancelled by seller",
    body: "The seller cancelled this pending order before opening the delivery room.",
    actionHref: `/orders/${orderId}`,
  });

  await createUserNotification(adminClient, {
    recipientId: context.order.seller_id,
    actorId: user.id,
    orderId,
    title: "Pending order cancelled",
    body: "This waiting order was removed from your queue before payment hold started.",
    actionHref: `/sell/orders`,
  });

  return NextResponse.json({ ok: true });
}

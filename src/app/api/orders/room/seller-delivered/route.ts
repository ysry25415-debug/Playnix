import { NextRequest, NextResponse } from "next/server";

import { createUserNotification, requireApiUser } from "@/lib/server-auth";
import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";

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
    return NextResponse.json({ error: "Only the seller can mark delivery on this order." }, { status: 403 });
  }

  if (context.room.room_status !== "open") {
    return NextResponse.json({ error: "This room is not open." }, { status: 409 });
  }

  if (context.room.payment_status !== "held" && context.room.payment_status !== "released") {
    return NextResponse.json({ error: "Buyer must complete the payment hold step first." }, { status: 409 });
  }

  if (context.room.seller_marked_delivered_at) {
    return NextResponse.json({ error: "Seller already marked this order as delivered." }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update({
      seller_marked_delivered_at: now,
      resolution_status: "seller_marked_delivered",
    })
    .eq("order_id", orderId);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    "Seller marked the order as delivered. Buyer can now confirm receipt or report a problem."
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.buyer_id,
    actorId: user.id,
    orderId,
    title: "Seller marked your order as delivered",
    body: "Review the delivery inside the order room and confirm receipt if everything is correct.",
    actionHref: `/orders/${orderId}`,
  });

  return NextResponse.json({ ok: true });
}

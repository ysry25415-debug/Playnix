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
  const deliveryWindowMinutes = Number(body?.deliveryWindowMinutes);

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  if (!Number.isInteger(deliveryWindowMinutes) || deliveryWindowMinutes < 5 || deliveryWindowMinutes > 10080) {
    return NextResponse.json({ error: "Delivery window must be between 5 minutes and 7 days." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.seller_id !== user.id && role !== "admin") {
    return NextResponse.json({ error: "Only the seller can start this room." }, { status: 403 });
  }

  if (context.room.room_status !== "awaiting_seller") {
    return NextResponse.json({ error: "This room is already started." }, { status: 409 });
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + deliveryWindowMinutes * 60 * 1000);

  const { error: updateError } = await adminClient
    .from("order_trade_rooms")
    .update({
      delivery_window_minutes: deliveryWindowMinutes,
      room_status: "open",
      seller_started_at: now.toISOString(),
      delivery_deadline: deadline.toISOString(),
    })
    .eq("order_id", orderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    `Seller opened the delivery room. Delivery window: ${deliveryWindowMinutes} minutes.`
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.buyer_id,
    actorId: user.id,
    orderId,
    title: "Delivery room is now open",
    body: "The seller opened your order room. Open chat to complete the payment hold and continue the delivery.",
    actionHref: `/orders/${orderId}`,
  });

  return NextResponse.json({ ok: true, deadline: deadline.toISOString() });
}

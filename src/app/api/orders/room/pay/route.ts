import { NextRequest, NextResponse } from "next/server";

import { createUserNotification, requireApiUser } from "@/lib/server-auth";
import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";

function maskLast4(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  return digits.slice(-4);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const cardNumber = typeof body?.cardNumber === "string" ? body.cardNumber.trim() : "";
  const cardHolder = typeof body?.cardHolder === "string" ? body.cardHolder.trim() : "";
  const expiry = typeof body?.expiry === "string" ? body.expiry.trim() : "";
  const cvc = typeof body?.cvc === "string" ? body.cvc.trim() : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  if (cardNumber.replace(/\D/g, "").length < 12 || !cardHolder || expiry.length < 4 || cvc.length < 3) {
    return NextResponse.json({ error: "Please enter complete card details." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can complete this payment step." }, { status: 403 });
  }

  if (context.room.room_status !== "open") {
    return NextResponse.json({ error: "The seller has not opened the delivery room yet." }, { status: 409 });
  }

  if (context.room.payment_status !== "unpaid") {
    return NextResponse.json({ error: "The payment step is already completed for this order." }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update({
      payment_status: "held",
      buyer_paid_at: now,
      buyer_card_last4: maskLast4(cardNumber),
      buyer_card_holder: cardHolder,
    })
    .eq("order_id", orderId);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  const { error: orderError } = await adminClient
    .from("orders")
    .update({
      status: "paid",
    })
    .eq("id", orderId);

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  if (context.order.delivery_mode === "instant") {
    await adminClient
      .from("order_delivery_details")
      .update({
        unlocked_at: now,
      })
      .eq("order_id", orderId);
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    "Buyer completed the payment hold step. Funds are now secured on the platform until delivery is confirmed."
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.seller_id,
    actorId: user.id,
    orderId,
    title: "Buyer entered the room",
    body: "The buyer completed the payment-hold step and can now continue inside the delivery chat.",
    actionHref: `/orders/${orderId}`,
  });

  return NextResponse.json({ ok: true });
}

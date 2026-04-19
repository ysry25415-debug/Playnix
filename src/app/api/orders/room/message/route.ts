import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/server-auth";
import { loadOrderRoomContext } from "@/lib/server-order-room";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user, role } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!orderId || !message) {
    return NextResponse.json({ error: "Order id and message are required." }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  const isParty = context.order.buyer_id === user.id || context.order.seller_id === user.id || role === "admin";
  if (!isParty) {
    return NextResponse.json({ error: "You cannot send messages in this room." }, { status: 403 });
  }

  if (context.room.room_status !== "open") {
    return NextResponse.json({ error: "This room is not open for chat right now." }, { status: 409 });
  }

  if (context.room.payment_status !== "held" && context.room.payment_status !== "released") {
    return NextResponse.json({ error: "Chat opens after the payment hold step is completed." }, { status: 409 });
  }

  const { error: messageError } = await adminClient.from("order_messages").insert({
    order_id: orderId,
    sender_id: user.id,
    message,
    is_system: false,
  });

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

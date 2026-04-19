import { NextRequest, NextResponse } from "next/server";

import { createUserNotification, getServiceRoleClient, requireApiUser } from "@/lib/server-auth";
import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";

type BuyerDecision = "received" | "not_received";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const decision = body?.decision as BuyerDecision | undefined;

  if (!orderId || (decision !== "received" && decision !== "not_received")) {
    return NextResponse.json({ error: "Invalid buyer decision." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can complete this step." }, { status: 403 });
  }

  if (!context.room.seller_marked_delivered_at) {
    return NextResponse.json({ error: "Wait for the seller to mark the order as delivered first." }, { status: 409 });
  }

  if (decision === "received") {
    const now = new Date().toISOString();

    const { error: roomError } = await adminClient
      .from("order_trade_rooms")
      .update({
        buyer_confirmed_received_at: now,
        payment_status: "released",
        room_status: "completed",
        resolution_status: "buyer_confirmed",
        resolved_at: now,
      })
      .eq("order_id", orderId);

    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 400 });
    }

    const { error: orderError } = await adminClient
      .from("orders")
      .update({
        status: "delivered",
      })
      .eq("id", orderId);

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    await appendSystemOrderMessage(
      adminClient,
      orderId,
      "Buyer confirmed receipt. Purchase complete and seller payout released from platform hold."
    );

    await createUserNotification(adminClient, {
      recipientId: context.order.seller_id,
      actorId: user.id,
      orderId,
      title: "Order completed successfully",
      body: "The buyer confirmed receipt. This sale is now marked as successful.",
      actionHref: `/orders/${orderId}`,
    });

    return NextResponse.json({ ok: true, outcome: "completed" });
  }

  const now = new Date().toISOString();
  const { error: roomError } = await adminClient
    .from("order_trade_rooms")
    .update({
      buyer_disputed_at: now,
      room_status: "disputed",
      resolution_status: "buyer_disputed",
    })
    .eq("order_id", orderId);

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    "Buyer reported that the delivery was not received correctly. Funds remain held while admin reviews the dispute."
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.seller_id,
    actorId: user.id,
    orderId,
    title: "Buyer opened a dispute",
    body: "This order is now disputed. Funds stay held until admin reviews the case.",
    actionHref: `/orders/${orderId}`,
  });

  const serviceClient = getServiceRoleClient();
  if (serviceClient) {
    const { data: admins } = await serviceClient.from("profiles").select("id").eq("role", "admin");
    if (admins?.length) {
      await Promise.all(
        admins.map((admin) =>
          createUserNotification(serviceClient, {
            recipientId: admin.id,
            actorId: user.id,
            orderId,
            title: "New order dispute",
            body: "A buyer reported that an order was not received correctly. Review the dispute.",
            actionHref: `/admin/disputes`,
          })
        )
      );
    }
  }

  return NextResponse.json({ ok: true, outcome: "disputed" });
}

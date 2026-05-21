import { NextRequest, NextResponse } from "next/server";

import { appendSystemOrderMessage, loadOrderRoomContext } from "@/lib/server-order-room";
import { createUserNotification, requireApiUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const rating = typeof body?.rating === "number" ? body.rating : Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!orderId || !Number.isFinite(rating) || rating < 1 || rating > 5 || comment.length < 6) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can review this order." }, { status: 403 });
  }

  if (
    context.room.room_status !== "completed" &&
    context.room.resolution_status !== "buyer_confirmed" &&
    context.room.resolution_status !== "resolved_for_seller"
  ) {
    return NextResponse.json({ error: "Reviews open only after a successful completed order." }, { status: 409 });
  }

  const { data: existingReview } = await adminClient
    .from("order_reviews")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json({ error: "A review was already submitted for this order." }, { status: 409 });
  }

  const { data: review, error: reviewError } = await adminClient
    .from("order_reviews")
    .insert({
      order_id: orderId,
      offer_id: context.order.offer_id,
      seller_id: context.order.seller_id,
      buyer_id: context.order.buyer_id,
      rating,
      comment,
    })
    .select("*")
    .maybeSingle();

  if (reviewError || !review) {
    return NextResponse.json({ error: reviewError?.message ?? "Could not save this review." }, { status: 400 });
  }

  await appendSystemOrderMessage(
    adminClient,
    orderId,
    `Buyer published a ${rating}-star seller review after successful delivery.`
  );

  await createUserNotification(adminClient, {
    recipientId: context.order.seller_id,
    actorId: user.id,
    orderId,
    title: "New seller review",
    body: "A completed order now has a fresh buyer review on your public storefront.",
    actionHref: `/sellers/${context.order.seller_id}`,
  });

  return NextResponse.json({ ok: true, review });
}

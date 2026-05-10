import { NextRequest, NextResponse } from "next/server";

import { createStripeCheckoutSession } from "@/lib/stripe-checkout";
import { requireApiUser } from "@/lib/server-auth";
import { loadOrderRoomContext } from "@/lib/server-order-room";

function getAppOrigin(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) return auth.error;

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  }

  const context = await loadOrderRoomContext(adminClient, orderId);
  if (context.error || !context.order || !context.room) {
    return NextResponse.json({ error: context.error ?? "Order room not found." }, { status: 404 });
  }

  if (context.order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can pay for this order." }, { status: 403 });
  }

  if (context.room.room_status !== "open") {
    return NextResponse.json({ error: "The seller has not opened the delivery room yet." }, { status: 409 });
  }

  if (context.room.payment_status !== "unpaid") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }

  const origin = getAppOrigin(request);
  const orderUrl = `${origin}/orders/${orderId}`;
  const { data, error } = await createStripeCheckoutSession({
    orderId,
    offerTitle: context.order.offer_title,
    amountUsd: context.order.price_usd,
    buyerId: context.order.buyer_id,
    sellerId: context.order.seller_id,
    successUrl: `${orderUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: orderUrl,
  });

  if (error || !data?.url) {
    return NextResponse.json({ error: error ?? "Could not create Stripe checkout session." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, url: data.url, sessionId: data.id });
}

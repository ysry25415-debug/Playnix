import { NextRequest, NextResponse } from "next/server";

import { markOrderPaymentHeldFromStripe } from "@/lib/server-payments";
import { requireApiUser } from "@/lib/server-auth";
import { retrieveStripeCheckoutSession } from "@/lib/stripe-checkout";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) return auth.error;

  const { adminClient, user } = auth;
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

  if (!orderId || !sessionId) {
    return NextResponse.json({ error: "Order id and Stripe session id are required." }, { status: 400 });
  }

  const { data: session, error } = await retrieveStripeCheckoutSession(sessionId);
  if (error || !session) {
    return NextResponse.json({ error: error ?? "Could not verify Stripe session." }, { status: 400 });
  }

  if (session.metadata?.orderId !== orderId || session.metadata?.buyerId !== user.id) {
    return NextResponse.json({ error: "Stripe session does not match this order." }, { status: 403 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Stripe payment is not completed yet." }, { status: 409 });
  }

  const result = await markOrderPaymentHeldFromStripe(adminClient, orderId, session.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/server-auth";
import { markOrderPaymentHeldFromStripe } from "@/lib/server-payments";
import { type StripeCheckoutSession, verifyStripeWebhookPayload } from "@/lib/stripe-checkout";

type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
};

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verification = verifyStripeWebhookPayload(payload, signature);

  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const session = event.data.object;
  const orderId = session.metadata?.orderId ?? "";

  if (!orderId || session.payment_status !== "paid") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const adminClient = getServiceRoleClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Missing server env keys." }, { status: 500 });
  }

  const result = await markOrderPaymentHeldFromStripe(adminClient, orderId, session.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

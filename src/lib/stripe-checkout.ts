import { createHmac, timingSafeEqual } from "node:crypto";

export type StripeCheckoutSession = {
  id: string;
  object: "checkout.session";
  amount_total: number | null;
  currency: string | null;
  metadata?: Record<string, string> | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired" | null;
  url?: string | null;
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || process.env.PAYMENT_PROVIDER_SECRET_KEY || "";
}

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET || "";
}

async function stripeRequest<T>(path: string, init: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    return { data: null, error: "Stripe secret key is missing." };
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: payload?.error?.message ?? "Stripe request failed.",
    };
  }

  return { data: payload as T, error: null };
}

export async function createStripeCheckoutSession(input: {
  orderId: string;
  offerTitle: string;
  amountUsd: number;
  buyerId: string;
  sellerId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const amountInCents = Math.round(input.amountUsd * 100);

  if (!Number.isFinite(amountInCents) || amountInCents < 50) {
    return { data: null, error: "Stripe amount must be at least $0.50." };
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("payment_method_types[0]", "card");
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(amountInCents));
  body.set("line_items[0][price_data][product_data][name]", input.offerTitle);
  body.set("metadata[orderId]", input.orderId);
  body.set("metadata[buyerId]", input.buyerId);
  body.set("metadata[sellerId]", input.sellerId);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export function verifyStripeWebhookPayload(payload: string, signatureHeader: string | null) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    return { ok: false, error: "Stripe webhook secret is missing." };
  }

  if (!signatureHeader) {
    return { ok: false, error: "Stripe signature header is missing." };
  }

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value] as const;
    })
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");

  if (!timestamp || !signature) {
    return { ok: false, error: "Stripe signature is malformed." };
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { ok: false, error: "Stripe signature verification failed." };
  }

  return { ok: true, error: null };
}

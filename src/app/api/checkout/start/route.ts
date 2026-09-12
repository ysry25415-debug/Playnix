import { NextRequest, NextResponse } from "next/server";

import { startOfferCheckout } from "@/lib/server-checkout";
import { requireApiUser } from "@/lib/server-auth";

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

  if (auth.role !== "customer") {
    return NextResponse.json({ error: "Only customer accounts can place orders." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const offerId = typeof body?.offerId === "string" ? body.offerId : "";
  if (!offerId) {
    return NextResponse.json({ error: "Offer id is required." }, { status: 400 });
  }

  const result = await startOfferCheckout({
    adminClient: auth.adminClient,
    buyerId: auth.user.id,
    offerId,
    origin: getAppOrigin(request),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

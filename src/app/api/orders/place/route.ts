import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: "Missing server env keys." }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const offerId = typeof body?.offerId === "string" ? body.offerId : "";

  if (!offerId) {
    return NextResponse.json({ error: "Offer id is required." }, { status: 400 });
  }

  const { data: offer, error: offerError } = await adminClient
    .from("offers")
    .select(
      "id,seller_id,game_slug,category_slug,title,price_usd,delivery_mode,stock_count,status"
    )
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  if (offer.seller_id === userData.user.id) {
    return NextResponse.json({ error: "You cannot buy your own offer." }, { status: 409 });
  }

  if (offer.status !== "active" || offer.stock_count < 1) {
    return NextResponse.json({ error: "This offer is no longer available." }, { status: 409 });
  }

  let instantDeliveryContent: string | null = null;

  if (offer.delivery_mode === "instant") {
    const { data: privateDelivery, error: privateDeliveryError } = await adminClient
      .from("offer_private_deliveries")
      .select("delivery_content")
      .eq("offer_id", offer.id)
      .eq("seller_id", offer.seller_id)
      .maybeSingle();

    if (privateDeliveryError) {
      return NextResponse.json({ error: privateDeliveryError.message }, { status: 400 });
    }

    instantDeliveryContent = privateDelivery?.delivery_content?.trim() ?? null;

    if (!instantDeliveryContent) {
      return NextResponse.json(
        { error: "This instant-delivery offer is missing its delivery details." },
        { status: 409 }
      );
    }
  }

  const nextOrderId = crypto.randomUUID();

  const { error: orderError } = await adminClient.from("orders").insert({
    id: nextOrderId,
    offer_id: offer.id,
    buyer_id: userData.user.id,
    seller_id: offer.seller_id,
    game_slug: offer.game_slug,
    category_slug: offer.category_slug,
    offer_title: offer.title,
    price_usd: offer.price_usd,
    delivery_mode: offer.delivery_mode,
    status: "pending",
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const { error: deliveryDetailsError } = await adminClient.from("order_delivery_details").insert({
    order_id: nextOrderId,
    offer_id: offer.id,
    seller_id: offer.seller_id,
    buyer_id: userData.user.id,
    delivery_mode: offer.delivery_mode,
    delivery_content: instantDeliveryContent,
    unlocked_at: offer.delivery_mode === "instant" ? new Date().toISOString() : null,
  });

  if (deliveryDetailsError) {
    await adminClient.from("orders").delete().eq("id", nextOrderId);
    return NextResponse.json({ error: deliveryDetailsError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    orderId: nextOrderId,
    deliveryMode: offer.delivery_mode,
  });
}

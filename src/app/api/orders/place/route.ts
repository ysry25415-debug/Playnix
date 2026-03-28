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
      "id,seller_id,game_slug,category_slug,title,price_usd,stock_count,status"
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

  const nextStock = Math.max(offer.stock_count - 1, 0);
  const nextStatus = nextStock === 0 ? "sold_out" : offer.status;

  const { error: orderError } = await adminClient.from("orders").insert({
    offer_id: offer.id,
    buyer_id: userData.user.id,
    seller_id: offer.seller_id,
    game_slug: offer.game_slug,
    category_slug: offer.category_slug,
    offer_title: offer.title,
    price_usd: offer.price_usd,
    status: "pending",
  });

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const { error: stockError } = await adminClient
    .from("offers")
    .update({
      stock_count: nextStock,
      status: nextStatus,
    })
    .eq("id", offer.id);

  if (stockError) {
    return NextResponse.json({ error: stockError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    nextStock,
    nextStatus,
  });
}

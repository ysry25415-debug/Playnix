import { NextRequest, NextResponse } from "next/server";

import { requireApiUser } from "@/lib/server-auth";

type OrderPartyProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  const orderIds = Array.isArray(body?.orderIds)
    ? Array.from(
        new Set(body.orderIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))
      ).slice(0, 50)
    : [];

  if (orderIds.length === 0) {
    return NextResponse.json({ error: "At least one order id is required." }, { status: 400 });
  }

  const { adminClient, role, user } = auth;
  const { data: orders, error: ordersError } = await adminClient
    .from("orders")
    .select("id,buyer_id,seller_id")
    .in("id", orderIds);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 400 });
  }

  const canAccessEveryOrder =
    (orders ?? []).length === orderIds.length &&
    (role === "admin" ||
      (orders ?? []).every((order) => order.buyer_id === user.id || order.seller_id === user.id));

  if (!canAccessEveryOrder) {
    return NextResponse.json({ error: "You cannot access one or more requested orders." }, { status: 403 });
  }

  const profileIds = Array.from(
    new Set((orders ?? []).flatMap((order) => [order.buyer_id, order.seller_id]).filter(Boolean))
  );
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id,full_name,avatar_url")
    .in("id", profileIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  const parties: OrderPartyProfile[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  }));

  return NextResponse.json({ parties });
}

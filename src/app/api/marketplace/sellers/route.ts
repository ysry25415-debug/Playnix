import { NextRequest, NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const adminClient = getServiceRoleClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Missing server env keys." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const sellerIds = Array.isArray(body?.sellerIds)
    ? Array.from(
        new Set(body.sellerIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))
      ).slice(0, 100)
    : [];

  if (sellerIds.length === 0) {
    return NextResponse.json({ sellers: [] });
  }

  const { data, error } = await adminClient
    .from("profiles")
    .select("id,full_name,avatar_url,role")
    .in("id", sellerIds)
    .in("role", ["seller", "admin"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sellers: data ?? [] });
}

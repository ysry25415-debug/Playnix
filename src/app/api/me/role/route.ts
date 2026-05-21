import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AppRole = "customer" | "seller" | "admin";

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

function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "seller" || value === "admin";
}

export async function GET(request: NextRequest) {
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

  const user = userData.user;
  let { data: profile } = await adminClient
    .from("profiles")
    .select("role,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const roleValue = profile?.role ?? user.user_metadata?.role;
  const role: AppRole = isAppRole(roleValue) ? roleValue : "customer";
  const metadataName =
    typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name.trim()
      : "";
  const metadataAvatar =
    typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim()
      ? user.user_metadata.avatar_url.trim()
      : "";
  const nextDisplayName = metadataName || profile?.full_name || user.email?.split("@")[0] || "Player";
  const nextAvatarUrl = metadataAvatar || profile?.avatar_url || null;

  if (!profile || profile.full_name !== nextDisplayName || profile.avatar_url !== nextAvatarUrl) {
    await adminClient.from("profiles").upsert(
      {
        id: user.id,
        full_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
        role,
      },
      { onConflict: "id" }
    );

    const { data: reloaded } = await adminClient
      .from("profiles")
      .select("role,full_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = reloaded;
  }

  const currentMetadataRole = user.user_metadata?.role;
  if (currentMetadataRole !== role) {
    const existingMetadata =
      user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};

    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...existingMetadata,
        role,
      },
    });
  }

  return NextResponse.json({ role });
}

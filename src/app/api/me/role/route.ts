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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackName =
      typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
        ? user.user_metadata.display_name.trim()
        : (user.email?.split("@")[0] ?? "Player");
    const fallbackAvatar =
      typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

    await adminClient.from("profiles").upsert(
      {
        id: user.id,
        full_name: fallbackName,
        avatar_url: fallbackAvatar,
        role: "customer",
      },
      { onConflict: "id" }
    );

    const { data: reloaded } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profile = reloaded;
  }

  const roleValue = profile?.role;
  const role: AppRole = isAppRole(roleValue) ? roleValue : "customer";

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

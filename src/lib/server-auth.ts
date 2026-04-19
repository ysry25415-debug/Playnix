import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type ServerAppRole = "customer" | "seller" | "admin";

export function getServiceRoleClient() {
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

export async function requireApiUser(request: NextRequest): Promise<
  | {
      adminClient: SupabaseClient;
      user: User;
      role: ServerAppRole;
    }
  | {
      error: NextResponse;
    }
> {
  const adminClient = getServiceRoleClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!adminClient) {
    return { error: NextResponse.json({ error: "Missing server env keys." }, { status: 500 }) };
  }

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: "Invalid session." }, { status: 401 }) };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role =
    profile?.role === "seller" || profile?.role === "admin" || profile?.role === "customer"
      ? profile.role
      : "customer";

  return {
    adminClient,
    user: userData.user,
    role,
  };
}

export async function requireAdminApiUser(request: NextRequest): Promise<
  | {
      adminClient: SupabaseClient;
      user: User;
    }
  | {
      error: NextResponse;
    }
> {
  const auth = await requireApiUser(request);
  if ("error" in auth) {
    return auth;
  }

  if (auth.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access only." }, { status: 403 }) };
  }

  return {
    adminClient: auth.adminClient,
    user: auth.user,
  };
}

export async function createUserNotification(
  adminClient: SupabaseClient,
  payload: {
    recipientId: string;
    actorId?: string | null;
    orderId?: string | null;
    title: string;
    body: string;
    actionHref?: string | null;
  }
) {
  return adminClient.from("user_notifications").insert({
    recipient_id: payload.recipientId,
    actor_id: payload.actorId ?? null,
    order_id: payload.orderId ?? null,
    title: payload.title,
    body: payload.body,
    action_href: payload.actionHref ?? null,
    is_read: false,
  });
}

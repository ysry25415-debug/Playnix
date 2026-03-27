import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RawRequestRow = {
  id: number;
  user_id: string;
  selfie_path: string;
  passport_path: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
};

type RequestStatus = "pending" | "approved" | "rejected";

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

async function assertAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const adminClient = getAdminClient();

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

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access only." }, { status: 403 }) };
  }

  return { adminClient, adminId: userData.user.id };
}

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request);
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const requestedStatus = request.nextUrl.searchParams.get("status");
  const status: RequestStatus =
    requestedStatus === "approved" || requestedStatus === "rejected" ? requestedStatus : "pending";

  const { data, error } = await adminClient
    .from("seller_verification_requests")
    .select("id,user_id,selfie_path,passport_path,status,submitted_at,admin_note")
    .eq("status", status)
    .order("submitted_at", { ascending: status !== "pending" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const requests = ((data ?? []) as RawRequestRow[]).filter((item) => item.status === status);
  const userIds = requests.map((item) => item.user_id);

  let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id,full_name,avatar_url")
      .in("id", userIds);

    if (profiles) {
      profileMap = profiles.reduce<Record<string, { full_name: string | null; avatar_url: string | null }>>(
        (acc, profile) => {
          acc[profile.id] = {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
          return acc;
        },
        {}
      );
    }
  }

  const withSignedUrls = await Promise.all(
    requests.map(async (item) => {
      const [selfieResult, passportResult] = await Promise.all([
        adminClient.storage.from("kyc-docs").createSignedUrl(item.selfie_path, 60 * 15),
        adminClient.storage.from("kyc-docs").createSignedUrl(item.passport_path, 60 * 15),
      ]);

      return {
        ...item,
        selfie_url: selfieResult.data?.signedUrl ?? null,
        passport_url: passportResult.data?.signedUrl ?? null,
        profile: profileMap[item.user_id] ?? null,
      };
    })
  );

  return NextResponse.json({ items: withSignedUrls });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReviewDecision = "approved" | "rejected";

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

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request);
  if ("error" in auth) return auth.error;

  const { adminClient, adminId } = auth;

  const body = await request.json().catch(() => null);
  const requestId = Number(body?.requestId);
  const decision = body?.decision as ReviewDecision | undefined;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!Number.isFinite(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }

  const { data: verificationRow, error: rowError } = await adminClient
    .from("seller_verification_requests")
    .select("id,user_id,status")
    .eq("id", requestId)
    .maybeSingle();

  if (rowError || !verificationRow) {
    return NextResponse.json({ error: "Verification request not found." }, { status: 404 });
  }

  if (verificationRow.status !== "pending") {
    return NextResponse.json({ error: "Request is already reviewed." }, { status: 409 });
  }

  if (decision === "approved") {
    const { error: roleError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: verificationRow.user_id,
          role: "seller",
        },
        { onConflict: "id" }
      );

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 400 });
    }
  }

  const { error: requestUpdateError } = await adminClient
    .from("seller_verification_requests")
    .update({
      status: decision,
      admin_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", requestId);

  if (requestUpdateError) {
    return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

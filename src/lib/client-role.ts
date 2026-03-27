import { type SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "customer" | "seller" | "admin";

function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "seller" || value === "admin";
}

export async function fetchRoleForCurrentUser(
  supabase: SupabaseClient
): Promise<AppRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return null;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isAppRole(profileData?.role)) {
    return profileData.role;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return null;
  }

  const response = await fetch("/api/me/role", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return isAppRole(payload?.role) ? payload.role : null;
}

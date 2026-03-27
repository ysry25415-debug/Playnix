import { type SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "customer" | "seller" | "admin";
type RoleLookupMode = "session-first" | "profile-first";

const ROLE_CACHE_PREFIX = "playnix-role-cache:";
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "seller" || value === "admin";
}

function getCachedRole(userId: string): AppRole | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(`${ROLE_CACHE_PREFIX}${userId}`);
  if (!raw) return null;

  let parsed: { role?: string; ts?: number } | null = null;
  try {
    parsed = JSON.parse(raw) as { role?: string; ts?: number } | null;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed.ts !== "number" || typeof parsed.role !== "string") {
    return null;
  }

  if (Date.now() - parsed.ts > ROLE_CACHE_TTL_MS) {
    return null;
  }

  return isAppRole(parsed.role) ? parsed.role : null;
}

function setCachedRole(userId: string, role: AppRole) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    `${ROLE_CACHE_PREFIX}${userId}`,
    JSON.stringify({
      role,
      ts: Date.now(),
    })
  );
}

export async function fetchRoleForCurrentUser(
  supabase: SupabaseClient,
  mode: RoleLookupMode = "session-first"
): Promise<AppRole | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const user = session?.user;

  if (!user) {
    return null;
  }

  const sessionRole = isAppRole(user.user_metadata?.role) ? user.user_metadata.role : null;
  const cachedRole = getCachedRole(user.id);

  const readProfileRole = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return isAppRole(profileData?.role) ? profileData.role : null;
  };

  if (mode === "session-first") {
    if (sessionRole) {
      setCachedRole(user.id, sessionRole);
      return sessionRole;
    }

    if (cachedRole) {
      return cachedRole;
    }

    const profileRole = await readProfileRole();
    if (profileRole) {
      setCachedRole(user.id, profileRole);
      return profileRole;
    }
  } else {
    const profileRole = await readProfileRole();
    if (profileRole) {
      setCachedRole(user.id, profileRole);
      return profileRole;
    }

    if (sessionRole) {
      setCachedRole(user.id, sessionRole);
      return sessionRole;
    }

    if (cachedRole) {
      return cachedRole;
    }
  }

  const accessToken = session?.access_token;
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
  const fallbackRole = isAppRole(payload?.role) ? payload.role : null;
  if (fallbackRole) {
    setCachedRole(user.id, fallbackRole);
  }
  return fallbackRole;
}

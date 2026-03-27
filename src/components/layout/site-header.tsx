"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { siteNavigation } from "@/lib/homepage-data";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { supabase } from "@/lib/supabase-client";
import { PlaynixLogo } from "@/components/shared/playnix-logo";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = useMemo(() => {
    if (!user) return "";
    const metadataName = user.user_metadata?.display_name;
    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }
    return user.email?.split("@")[0] ?? "Player";
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (!user) return "";
    const metadataAvatar = user.user_metadata?.avatar_url;
    if (typeof metadataAvatar === "string" && metadataAvatar.trim()) {
      return metadataAvatar.trim();
    }
    return "";
  }, [user]);

  const avatarFallback = useMemo(() => {
    if (!displayName) return "P";
    return displayName.slice(0, 1).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const role = await fetchRoleForCurrentUser(supabase);

      if (!isMounted) return;

      if (!role) {
        return;
      }

      setUserRole(role);
    }

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (isMounted) {
        const currentUser = data.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadRole();
        } else {
          setUserRole(null);
        }
      }
    }

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          await loadRole();
        } else {
          setUserRole(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } finally {
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.startsWith("playnix-role-cache:")) {
            window.localStorage.removeItem(key);
          }
        });
      }
      setUser(null);
      setUserRole(null);
      router.replace("/auth/login");
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.assign("/auth/login");
      }
    }
  }

  const roleLabel =
    userRole === "admin" ? "Admin" : userRole === "seller" ? "Seller" : userRole === "customer" ? "Customer" : "Loading role...";

  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <Link className="brand-mark" href="/">
          <span className="brand-mark__visual">
            <PlaynixLogo />
          </span>
          <span className="brand-mark__copy">
            <strong>BEN10</strong>
            <span>Omnitrix Marketplace</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {siteNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="site-actions site-actions--user">
            <Link className="user-chip" href="/account">
              <span className="user-chip__avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarFallback}
              </span>
              <span className="user-chip__copy">
                <span className="user-chip__name-row">
                  <strong>{displayName}</strong>
                  {userRole === "seller" ? <SellerVerifiedBadge /> : null}
                </span>
                <span>{roleLabel}</span>
              </span>
            </Link>
            {userRole === "customer" ? (
              <Link className="ghost-button" href="/seller/apply">
                Join Sellers
              </Link>
            ) : null}
            {userRole === "seller" ? (
              <Link className="ghost-button" href="/sell">
                Seller Center
              </Link>
            ) : null}
            {userRole === "admin" ? (
              <Link className="ghost-button" href="/admin/verification">
                Admin Review
              </Link>
            ) : null}
            <button className="ghost-button" type="button" onClick={handleLogout}>
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </button>
          </div>
        ) : (
          <div className="site-actions">
            <Link className="ghost-button" href="/auth/login">
              Log In
            </Link>
            <Link className="primary-button" href="/auth/sign-up">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

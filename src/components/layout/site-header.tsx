"use client";

import Link from "next/link";
import { type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { siteNavigation } from "@/lib/homepage-data";
import { fetchRoleForCurrentUser, getOptimisticRole, type AppRole } from "@/lib/client-role";
import { supabase } from "@/lib/supabase-client";
import { PlaynixLogo } from "@/components/shared/playnix-logo";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

    async function loadUnreadNotificationsCount(userId: string) {
      const { count } = await supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

      if (!isMounted) return;
      setUnreadNotifications(count ?? 0);
    }

    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setUserRole(getOptimisticRole(currentUser));
          void loadRole();
          void loadUnreadNotificationsCount(currentUser.id);
        } else {
          setUserRole(null);
          setUnreadNotifications(0);
        }
      }
    }

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          setUserRole(getOptimisticRole(sessionUser));
          void loadRole();
          void loadUnreadNotificationsCount(sessionUser.id);
        } else {
          setUserRole(null);
          setUnreadNotifications(0);
        }
      }
    });

    const interval = window.setInterval(() => {
      if (user?.id) {
        void loadUnreadNotificationsCount(user.id);
      }
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      authListener.subscription.unsubscribe();
    };
  }, [user?.id]);

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
            <Link className="ghost-button notification-button" href="/notifications">
              Notifications
              {unreadNotifications > 0 ? (
                <span className="notification-badge">{unreadNotifications}</span>
              ) : null}
            </Link>
            {userRole === "seller" ? (
              <Link className="ghost-button" href="/sell">
                Seller Center
              </Link>
            ) : null}
            {userRole === "admin" ? (
              <>
                <Link className="ghost-button" href="/admin/verification">
                  Admin Review
                </Link>
                <Link className="ghost-button" href="/admin/disputes">
                  Disputes
                </Link>
              </>
            ) : null}
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

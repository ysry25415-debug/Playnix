"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { siteNavigation } from "@/lib/homepage-data";
import { supabase } from "@/lib/supabase-client";
import { PlaynixLogo } from "@/components/shared/playnix-logo";

export function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

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

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(data.user ?? null);
      }
    }

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

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
                <strong>{displayName}</strong>
                <span>Manage account</span>
              </span>
            </Link>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Log Out
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

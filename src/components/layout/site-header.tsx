"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { siteNavigation } from "@/lib/homepage-data";
import { fetchRoleForCurrentUser, getOptimisticRole, type AppRole } from "@/lib/client-role";
import { triggerPageLoader } from "@/lib/page-loader-events";
import { supabase } from "@/lib/supabase-client";
import { PlaynixLogo } from "@/components/shared/playnix-logo";
import { SellerVerifiedBadge } from "@/components/shared/seller-verified-badge";

const RECENT_SEARCHES_KEY = "playnix-recent-searches";

const marketplaceMobileTabs = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sell", label: "Sell" },
  { href: "/support", label: "Support" },
];

const headerTrustSignals = [
  {
    title: "Protected checkout",
    hint: "Buyer funds stay controlled until the correct handoff checkpoint.",
  },
  {
    title: "Held funds until confirmation",
    hint: "The seller payout does not move until the buyer confirms the delivery result.",
  },
  {
    title: "Live delivery room",
    hint: "Chat-based orders move into a guided room with proof, updates, and review flow.",
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isSearchCompact, setIsSearchCompact] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

  useEffect(() => {
    function handleScroll() {
      setIsSearchCompact(window.scrollY > 42);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setSearchText(searchParams?.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      setRecentSearches(
        parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
      );
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const roleLabel =
    userRole === "admin" ? "Admin" : userRole === "seller" ? "Seller" : userRole === "customer" ? "Customer" : "Loading role...";
  function isActivePath(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderBrand() {
    return (
      <Link className="brand-mark" href="/">
        <span className="brand-mark__visual">
          <PlaynixLogo />
        </span>
        <span className="brand-mark__copy">
          <strong>BEN10</strong>
          <span>Omnitrix Marketplace</span>
        </span>
      </Link>
    );
  }

  function renderPrimaryNavigation() {
    return (
      <nav className="eld-header__nav" aria-label="Primary">
        {siteNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActivePath(item.href)
                ? "eld-header__nav-link eld-header__nav-link--active"
                : "eld-header__nav-link"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  function renderSessionActions() {
    if (user) {
      return (
        <div className="eld-header__actions eld-header__actions--user">
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
      );
    }

    return (
      <div className="eld-header__actions">
        <Link className="ghost-button" href="/auth/login">
          Log In
        </Link>
        <Link className="primary-button" href="/auth/sign-up">
          Sign Up
        </Link>
      </div>
    );
  }

  function saveRecentSearch(query: string) {
    if (typeof window === "undefined" || !query) {
      return;
    }

    try {
      const nextRecentSearches = [query, ...recentSearches.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
      setRecentSearches(nextRecentSearches);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecentSearches));
    } catch {
      // Ignore storage errors to keep search usable.
    }
  }

  function navigateToSearch(rawQuery: string) {
    const query = rawQuery.trim();
    const nextParams = new URLSearchParams();

    if (query) {
      nextParams.set("q", query);
      saveRecentSearch(query);
    }

    const isGameMarketplacePath =
      typeof pathname === "string" &&
      pathname.startsWith("/marketplace/") &&
      pathname !== "/marketplace";

    if (isGameMarketplacePath) {
      const activeCategory = searchParams?.get("category");
      if (activeCategory) {
        nextParams.set("category", activeCategory);
      }
    }

    const targetPath = isGameMarketplacePath ? pathname : "/marketplace";
    const targetHref = nextParams.toString()
      ? `${targetPath}?${nextParams.toString()}`
      : targetPath;

    triggerPageLoader();
    router.push(targetHref);
  }

  function handleHeaderSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToSearch(searchText);
  }

  function handleRecentSearchClick(query: string) {
    setSearchText(query);
    navigateToSearch(query);
  }

  function clearRecentSearches() {
    setRecentSearches([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }

  return (
    <header className={isSearchCompact ? "eld-header eld-header--compact" : "eld-header"}>
      <div className="shell eld-header__main">
        {renderBrand()}
        {renderPrimaryNavigation()}
        {renderSessionActions()}
      </div>

      <div className={isSearchCompact ? "eld-header__tools eld-header__tools--compact" : "eld-header__tools"}>
        <div className="shell eld-header__tools-shell">
          <form className="eld-header__search" onSubmit={handleHeaderSearchSubmit}>
            <label htmlFor="market-search-ui-only">Search BEN10 platform</label>
            <input
              id="market-search-ui-only"
              type="search"
              placeholder="Search offers, games, and sellers"
              aria-label="Search BEN10 platform"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </form>

          <div className="eld-header__search-meta" aria-label="Helpful search context">
            {recentSearches.length > 0 ? (
              <div className="eld-header__search-history">
                <div className="eld-header__search-history-head">
                  <span>Recent searches</span>
                  <button type="button" onClick={clearRecentSearches}>
                    Clear
                  </button>
                </div>
                <div className="eld-header__search-history-chips">
                  {recentSearches.map((query) => (
                    <button key={query} type="button" onClick={() => handleRecentSearchClick(query)}>
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <span className="eld-header__search-helper">
                Search active offers, public seller profiles, and game lanes from one field.
              </span>
            )}
          </div>

          <div className="eld-header__trust-strip" aria-label="Marketplace trust signals">
            {headerTrustSignals.map((signal) => (
              <article key={signal.title} className="eld-header__trust-card">
                <strong>{signal.title}</strong>
                <span>{signal.hint}</span>
              </article>
            ))}
          </div>
        </div>
      </div>

      <nav className="eld-header__mobile-tabs" aria-label="Platform quick tabs">
        <div className="shell eld-header__mobile-tabs-shell">
          {marketplaceMobileTabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActivePath(item.href)
                  ? "eld-header__mobile-tab eld-header__mobile-tab--active"
                  : "eld-header__mobile-tab"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

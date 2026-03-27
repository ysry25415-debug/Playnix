import Link from "next/link";

import { siteNavigation } from "@/lib/homepage-data";
import { PlaynixLogo } from "@/components/shared/playnix-logo";

export function SiteHeader() {
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

        <div className="site-actions">
          <Link className="ghost-button" href="/auth/login">
            Log In
          </Link>
          <Link className="primary-button" href="/auth/sign-up">
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}

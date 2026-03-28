"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { sellerCenterNavigation } from "@/lib/marketplace-data";

type SellerCenterShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SellerCenterShell({
  title,
  description,
  children,
}: SellerCenterShellProps) {
  const pathname = usePathname();

  return (
    <main className="seller-center-page">
      <div className="shell seller-center-shell">
        <aside className="seller-center-sidebar">
          <div className="seller-center-sidebar__head">
            <span className="eyebrow-chip">Seller Center</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <nav className="seller-center-nav" aria-label="Seller Center">
            {sellerCenterNavigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "seller-center-nav__item seller-center-nav__item--active" : "seller-center-nav__item"}
                >
                  <span>{item.label}</span>
                  {item.isBeta ? <small>BETA</small> : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="seller-center-content">{children}</section>
      </div>
    </main>
  );
}

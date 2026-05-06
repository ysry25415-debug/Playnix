"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { sellerCenterNavigation } from "@/lib/marketplace-data";
import { supabase } from "@/lib/supabase-client";

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
  const [balanceUsd, setBalanceUsd] = useState(0);
  const [pendingUsd, setPendingUsd] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSellerBalance() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) return;

      const { data } = await supabase
        .from("orders")
        .select("price_usd,status")
        .eq("seller_id", user.id);

      if (!isMounted) return;

      const orders = data ?? [];
      const released = orders
        .filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + Number(order.price_usd || 0), 0);
      const pending = orders
        .filter((order) => order.status === "paid" || order.status === "pending")
        .reduce((sum, order) => sum + Number(order.price_usd || 0), 0);

      setBalanceUsd(released);
      setPendingUsd(pending);
    }

    void loadSellerBalance();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="seller-center-page">
      <div className="shell seller-center-shell">
        <aside className="seller-center-sidebar">
          <div className="seller-center-sidebar__head">
            <span className="eyebrow-chip">Seller Center</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="seller-balance-card">
            <span>Account balance</span>
            <strong>${balanceUsd.toFixed(2)}</strong>
            <small>Pending: ${pendingUsd.toFixed(2)}</small>
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


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
  const [availableBalanceUsd, setAvailableBalanceUsd] = useState(0);
  const [heldBalanceUsd, setHeldBalanceUsd] = useState(0);
  const [pendingBuyerPaymentUsd, setPendingBuyerPaymentUsd] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSellerBalance() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) return;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id,price_usd")
        .eq("seller_id", user.id);

      if (ordersError || !orders) return;

      const orderIds = orders.map((item) => item.id);
      let roomByOrderId = new Map<string, "unpaid" | "held" | "released" | "refunded">();

      if (orderIds.length > 0) {
        const { data: rooms } = await supabase
          .from("order_trade_rooms")
          .select("order_id,payment_status")
          .eq("seller_id", user.id)
          .in("order_id", orderIds);

        roomByOrderId = new Map(
          (rooms ?? []).map((room) => [room.order_id, room.payment_status as "unpaid" | "held" | "released" | "refunded"])
        );
      }

      if (!isMounted) return;

      const released = orders
        .filter((order) => roomByOrderId.get(order.id) === "released")
        .reduce((sum, order) => sum + Number(order.price_usd || 0), 0);
      const held = orders
        .filter((order) => roomByOrderId.get(order.id) === "held")
        .reduce((sum, order) => sum + Number(order.price_usd || 0), 0);
      const pendingBuyerPayment = orders
        .filter((order) => roomByOrderId.get(order.id) === "unpaid")
        .reduce((sum, order) => sum + Number(order.price_usd || 0), 0);

      setAvailableBalanceUsd(released);
      setHeldBalanceUsd(held);
      setPendingBuyerPaymentUsd(pendingBuyerPayment);
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
            <span>Available balance</span>
            <strong>${availableBalanceUsd.toFixed(2)}</strong>
            <small className="seller-balance-card__held">
              Held from buyer-paid orders: ${heldBalanceUsd.toFixed(2)}
            </small>
            <small className="seller-balance-card__pending">
              Pending buyer payment: ${pendingBuyerPaymentUsd.toFixed(2)}
            </small>
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


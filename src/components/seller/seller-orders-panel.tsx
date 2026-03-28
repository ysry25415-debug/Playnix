"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase-client";
import { type OrderRow } from "@/lib/marketplace-types";

export function SellerOrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (isMounted) {
          setOrders([]);
          setIsLoading(false);
        }
        return;
      }

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select("id,offer_id,buyer_id,seller_id,game_slug,category_slug,offer_title,price_usd,status,created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (ordersError) {
        setError(ordersError.message);
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setOrders((data ?? []) as OrderRow[]);
      setIsLoading(false);
    }

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
    };
  }, [orders]);

  return (
    <div className="seller-module">
      <span className="section-eyebrow">Orders</span>
      <h2>Keep delivery moving across every game lane.</h2>
      <p>
        Orders centralizes all purchases placed against your storefront so you can see what was
        bought, when it was created, and what still needs delivery.
      </p>

      <div className="seller-module__stats">
        <article className="seller-module__card">
          <strong>{stats.total}</strong>
          <span>Total orders</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.pending}</strong>
          <span>Pending delivery</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.delivered}</strong>
          <span>Delivered</span>
        </article>
      </div>

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

      {isLoading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="auth-feedback auth-feedback--success">
          No orders yet. Once customers buy your offers, they will appear here.
        </p>
      ) : (
        <div className="seller-list">
          {orders.map((order) => (
            <article key={order.id} className="seller-list__item">
              <div>
                <strong>{order.offer_title}</strong>
                <span>
                  {order.game_slug} / {order.category_slug}
                </span>
              </div>
              <div>
                <strong>${order.price_usd.toFixed(2)}</strong>
                <span>{order.status}</span>
              </div>
              <div>
                <span>{new Date(order.created_at).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOrderRow,
} from "@/lib/marketplace-compat";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { supabase } from "@/lib/supabase-client";
import { type OrderRow } from "@/lib/marketplace-types";

export function SellerOrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
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
          setViewerRole(null);
          setIsLoading(false);
        }
        return;
      }

      const role = await fetchRoleForCurrentUser(supabase);
      if (!isMounted) return;

      setViewerRole(role);

      const ordersQuery = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error: ordersError } =
        role === "admin" ? await ordersQuery : await ordersQuery.eq("seller_id", user.id);

      if (!isMounted) return;

      if (ordersError) {
        setError(
          isLikelySchemaCompatibilityError(ordersError.message)
            ? getSchemaCompatibilityMessage("Marketplace orders")
            : ordersError.message
        );
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setOrders(
        (data ?? [])
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => normalizeOrderRow(item))
      );
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

      {viewerRole === "admin" ? (
        <p className="auth-feedback auth-feedback--success">
          Admin view is enabled. You are currently seeing all marketplace orders.
        </p>
      ) : null}

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
                <span>{getOfferDeliveryModeLabel(order.delivery_mode)}</span>
              </div>
              <div>
                <strong>${order.price_usd.toFixed(2)}</strong>
                <span>{order.status}</span>
              </div>
              <div>
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <Link className="ghost-button" href={`/orders/${order.id}`}>
                  Open Order
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

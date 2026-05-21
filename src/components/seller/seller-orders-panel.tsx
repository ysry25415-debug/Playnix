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
import { type OrderRow, type OrderTradeRoomRow } from "@/lib/marketplace-types";

type BuyerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export function SellerOrdersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [roomsByOrderId, setRoomsByOrderId] = useState<Record<string, OrderTradeRoomRow>>({});
  const [buyersById, setBuyersById] = useState<Record<string, BuyerProfile>>({});
  const [viewerRole, setViewerRole] = useState<AppRole | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setOrders([]);
      setRoomsByOrderId({});
      setBuyersById({});
      setViewerRole(null);
      setIsLoading(false);
      return;
    }

    const role = await fetchRoleForCurrentUser(supabase);
    setViewerRole(role);

    const ordersQuery = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error: ordersError } =
      role === "admin" ? await ordersQuery : await ordersQuery.eq("seller_id", user.id);

    if (ordersError) {
      setError(
        isLikelySchemaCompatibilityError(ordersError.message)
          ? getSchemaCompatibilityMessage("Marketplace orders")
          : ordersError.message
      );
      setOrders([]);
      setRoomsByOrderId({});
      setBuyersById({});
      setIsLoading(false);
      return;
    }

    const normalizedOrders = (data ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => normalizeOrderRow(item));

    setOrders(normalizedOrders);

    const orderIds = normalizedOrders.map((item) => item.id).filter(Boolean);
    const buyerIds = Array.from(
      new Set(normalizedOrders.map((item) => item.buyer_id).filter((value): value is string => Boolean(value)))
    );

    if (orderIds.length === 0) {
      setRoomsByOrderId({});
      setBuyersById({});
      setIsLoading(false);
      return;
    }

    const [roomsResult, buyersResult] = await Promise.all([
      supabase.from("order_trade_rooms").select("*").in("order_id", orderIds),
      buyerIds.length
        ? supabase.from("profiles").select("id,full_name,avatar_url").in("id", buyerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const nextRooms: Record<string, OrderTradeRoomRow> = {};
    (roomsResult.data ?? []).forEach((room) => {
      nextRooms[room.order_id] = room as OrderTradeRoomRow;
    });
    setRoomsByOrderId(nextRooms);

    const nextBuyers: Record<string, BuyerProfile> = {};
    (buyersResult.data ?? []).forEach((profile) => {
      nextBuyers[profile.id] = {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      };
    });
    setBuyersById(nextBuyers);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function handleCancel(orderId: string) {
    setCancellingId(orderId);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setCancellingId(null);
      setError("Please log in again.");
      return;
    }

    const response = await fetch("/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const payload = await response.json().catch(() => null);
    setCancellingId(null);

    if (!response.ok) {
      setError(payload?.error ?? "Could not cancel this pending order.");
      return;
    }

    await loadOrders();
  }

  const stats = useMemo(() => {
    const waitingForSeller = orders.filter((order) => {
      const room = roomsByOrderId[order.id];
      return room?.room_status === "awaiting_seller" && room.payment_status === "unpaid";
    }).length;

    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      waitingForSeller,
    };
  }, [orders, roomsByOrderId]);

  const waitingOrders = useMemo(() => {
    return orders.filter((order) => {
      const room = roomsByOrderId[order.id];
      return room?.room_status === "awaiting_seller" && room.payment_status === "unpaid";
    });
  }, [orders, roomsByOrderId]);

  return (
    <div className="seller-module">
      <span className="section-eyebrow">Orders</span>
      <h2>Keep delivery moving across every game lane.</h2>
      <p>
        Orders centralizes all purchases placed against your storefront so you can see what was
        bought, who is waiting on you, and which orders still need delivery.
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
          <strong>{stats.waitingForSeller}</strong>
          <span>Waiting on you</span>
        </article>
        <article className="seller-module__card">
          <strong>{stats.delivered}</strong>
          <span>Delivered</span>
        </article>
      </div>

      {waitingOrders.length > 0 ? (
        <section className="seller-pending-queue">
          <div className="seller-public-section__head">
            <div>
              <span className="section-eyebrow">Priority queue</span>
              <h3>Customers currently waiting for you</h3>
            </div>
          </div>

          <div className="seller-pending-queue__list">
            {waitingOrders.map((order) => {
              const buyer = buyersById[order.buyer_id];
              const buyerName = buyer?.full_name || "Customer";
              const room = roomsByOrderId[order.id];

              return (
                <article key={order.id} className="seller-pending-card">
                  <div className="seller-pending-card__copy">
                    <strong>{order.offer_title}</strong>
                    <span>
                      Buyer: {buyerName} • {getOfferDeliveryModeLabel(order.delivery_mode)}
                    </span>
                    <p>
                      {order.delivery_mode === "chat"
                        ? "The customer is waiting for you to open the live room. If you are not available yet, the room stays pending and the buyer is informed."
                        : "This instant-delivery order is created, but the buyer is still waiting for the room to start."}
                    </p>
                    {room ? <small>Room state: {room.room_status} / Payment: {room.payment_status}</small> : null}
                  </div>

                  <div className="seller-pending-card__actions">
                    <Link className="primary-button" href={`/orders/${order.id}`}>
                      Open Order
                    </Link>
                    <button
                      className="ghost-button admin-reject-button"
                      type="button"
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingId === order.id}
                    >
                      {cancellingId === order.id ? "Cancelling..." : "Cancel Pending Order"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

      {isLoading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="auth-feedback auth-feedback--success">
          No orders yet. Once customers buy your offers, they will appear here.
        </p>
      ) : (
        <div className="seller-list">
          {orders.map((order) => {
            const room = roomsByOrderId[order.id];
            const buyer = buyersById[order.buyer_id];

            return (
              <article key={order.id} className="seller-list__item">
                <div>
                  <strong>{order.offer_title}</strong>
                  <span>
                    {order.game_slug} / {order.category_slug}
                  </span>
                  <span>{getOfferDeliveryModeLabel(order.delivery_mode)}</span>
                  <span>Buyer: {buyer?.full_name || "Customer"}</span>
                </div>
                <div>
                  <strong>${order.price_usd.toFixed(2)}</strong>
                  <span>{order.status}</span>
                  {room ? <span>{room.room_status} / {room.payment_status}</span> : null}
                </div>
                <div>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                  <Link className="ghost-button" href={`/orders/${order.id}`}>
                    Open Order
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

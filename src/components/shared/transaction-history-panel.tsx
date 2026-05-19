"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { type OrderRow, type OrderTradeRoomRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

type TransactionViewMode = "all" | "seller";

type TransactionHistoryPanelProps = {
  mode?: TransactionViewMode;
  title?: string;
  description?: string;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
};

type TransactionRecord = {
  order: OrderRow;
  room: Pick<OrderTradeRoomRow, "payment_status" | "resolution_status" | "room_status" | "updated_at"> | null;
  counterpartyName: string;
  kind: "purchase" | "sale";
  activityAt: string;
};

function formatPaymentStatus(status: OrderTradeRoomRow["payment_status"] | null | undefined) {
  if (status === "held") return "Held";
  if (status === "released") return "Released";
  if (status === "refunded") return "Refunded";
  return "Unpaid";
}

function formatResolutionStatus(status: OrderTradeRoomRow["resolution_status"] | null | undefined) {
  if (status === "buyer_confirmed") return "Buyer confirmed";
  if (status === "seller_marked_delivered") return "Seller marked delivered";
  if (status === "buyer_disputed") return "Disputed by buyer";
  if (status === "resolved_for_seller") return "Resolved for seller";
  if (status === "resolved_for_buyer") return "Resolved for buyer";
  return "In progress";
}

export function TransactionHistoryPanel({
  mode = "all",
  title = "Transaction history",
  description = "Track held, released, and refunded order payments.",
}: TransactionHistoryPanelProps) {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      setIsLoading(true);
      setError("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (isMounted) {
          setRecords([]);
          setIsLoading(false);
        }
        return;
      }

      const [buyerOrdersResult, sellerOrdersResult] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("orders")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      if (!isMounted) return;

      const nextError = buyerOrdersResult.error?.message || sellerOrdersResult.error?.message || "";
      if (nextError) {
        setError(nextError);
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const buyerOrders = (buyerOrdersResult.data ?? []) as OrderRow[];
      const sellerOrders = (sellerOrdersResult.data ?? []) as OrderRow[];
      const scopedOrders = mode === "seller" ? sellerOrders : [...buyerOrders, ...sellerOrders];

      const uniqueOrders = Array.from(new Map(scopedOrders.map((item) => [item.id, item])).values());
      const orderIds = uniqueOrders.map((item) => item.id);

      if (orderIds.length === 0) {
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const counterpartyIds = Array.from(
        new Set(
          uniqueOrders.flatMap((order) => [order.buyer_id, order.seller_id]).filter((value): value is string => Boolean(value))
        )
      );

      const [roomsResult, profilesResult] = await Promise.all([
        supabase
          .from("order_trade_rooms")
          .select("order_id,payment_status,resolution_status,room_status,updated_at")
          .in("order_id", orderIds),
        supabase.from("profiles").select("id,full_name").in("id", counterpartyIds),
      ]);

      if (!isMounted) return;

      const roomsError = roomsResult.error?.message || profilesResult.error?.message || "";
      if (roomsError) {
        setError(roomsError);
        setRecords([]);
        setIsLoading(false);
        return;
      }

      const roomByOrderId = new Map(
        ((roomsResult.data ?? []) as Array<{
          order_id: string;
          payment_status: OrderTradeRoomRow["payment_status"];
          resolution_status: OrderTradeRoomRow["resolution_status"];
          room_status: OrderTradeRoomRow["room_status"];
          updated_at: string;
        }>).map((room) => [room.order_id, room])
      );
      const profileById = new Map(
        ((profilesResult.data ?? []) as ProfileLite[]).map((profile) => [profile.id, profile])
      );

      const nextRecords = uniqueOrders
        .map((order) => {
          const isSale = order.seller_id === user.id;
          const counterpartyId = isSale ? order.buyer_id : order.seller_id;
          const counterpartyName =
            profileById.get(counterpartyId)?.full_name || (isSale ? "Customer" : "Seller");

          return {
            order,
            room: roomByOrderId.get(order.id) ?? null,
            counterpartyName,
            kind: isSale ? "sale" : "purchase",
            activityAt: roomByOrderId.get(order.id)?.updated_at ?? order.created_at,
          } satisfies TransactionRecord;
        })
        .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime());

      setRecords(nextRecords);
      setIsLoading(false);
    }

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [mode]);

  const filteredRecords = useMemo(() => {
    if (mode === "seller") {
      return records.filter((item) => item.kind === "sale");
    }

    return records;
  }, [mode, records]);

  return (
    <section className="transaction-panel">
      <div className="transaction-panel__head">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      {isLoading ? (
        <div className="transaction-panel__empty">
          <strong>Loading transactions...</strong>
          <span>Fetching orders and payment states.</span>
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="auth-feedback auth-feedback--error">{error}</p>
      ) : null}

      {!isLoading && !error && filteredRecords.length === 0 ? (
        <div className="transaction-panel__empty">
          <strong>No transactions yet.</strong>
          <span>Completed purchases and sales will appear here.</span>
        </div>
      ) : null}

      {!isLoading && !error && filteredRecords.length > 0 ? (
        <div className="transaction-panel__list">
          {filteredRecords.map((item) => (
            <article key={item.order.id} className="transaction-card">
              <div className="transaction-card__head">
                <strong>{item.order.offer_title}</strong>
                <span className={item.kind === "sale" ? "transaction-badge transaction-badge--sale" : "transaction-badge"}>
                  {item.kind === "sale" ? "Sale" : "Purchase"}
                </span>
              </div>

              <div className="transaction-card__meta">
                <span>${Number(item.order.price_usd || 0).toFixed(2)}</span>
                <span>Last activity: {new Date(item.activityAt).toLocaleString()}</span>
              </div>

              <div className="transaction-card__grid">
                <p>
                  <strong>Counterparty</strong>
                  <span>{item.counterpartyName}</span>
                </p>
                <p>
                  <strong>Payment</strong>
                  <span>{formatPaymentStatus(item.room?.payment_status)}</span>
                </p>
                <p>
                  <strong>Resolution</strong>
                  <span>{formatResolutionStatus(item.room?.resolution_status)}</span>
                </p>
                <p>
                  <strong>Order status</strong>
                  <span>{item.order.status}</span>
                </p>
              </div>

              <div className="hero-actions">
                <Link className="ghost-button" href={`/orders/${item.order.id}`}>
                  Open Order Room
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

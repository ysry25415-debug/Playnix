"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { type OrderDeliveryDetailsRow, type OrderRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

type OrderRoomProps = {
  orderId: string;
};

export function OrderRoom({ orderId }: OrderRoomProps) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState<OrderDeliveryDetailsRow | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrderRoom() {
      setError("");
      setIsLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;

      if (!user) {
        if (isMounted) {
          setViewerId(null);
          setOrder(null);
          setDeliveryDetails(null);
          setIsLoading(false);
        }
        return;
      }

      if (!isMounted) return;
      setViewerId(user.id);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id,offer_id,buyer_id,seller_id,game_slug,category_slug,offer_title,price_usd,delivery_mode,status,created_at"
        )
        .eq("id", orderId)
        .maybeSingle();

      if (!isMounted) return;

      if (orderError || !orderData) {
        setError(orderError?.message ?? "Order not found or access denied.");
        setOrder(null);
        setDeliveryDetails(null);
        setIsLoading(false);
        return;
      }

      const typedOrder = orderData as OrderRow;
      setOrder(typedOrder);

      const { data: deliveryData, error: deliveryError } = await supabase
        .from("order_delivery_details")
        .select(
          "order_id,offer_id,seller_id,buyer_id,delivery_mode,delivery_content,created_at,unlocked_at"
        )
        .eq("order_id", orderId)
        .maybeSingle();

      if (!isMounted) return;

      if (deliveryError) {
        setError(deliveryError.message);
        setDeliveryDetails(null);
        setIsLoading(false);
        return;
      }

      setDeliveryDetails((deliveryData ?? null) as OrderDeliveryDetailsRow | null);
      setIsLoading(false);
    }

    void loadOrderRoom();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <PageLoader
        label="Opening order room..."
        hint="BEN10 is loading the delivery state and protected order details."
      />
    );
  }

  if (error || !order) {
    return (
      <div className="module-page order-room-page">
        <div className="shell">
          <div className="module-page__shell">
            <span className="section-eyebrow">Order Room</span>
            <h1>We could not open this order.</h1>
            <p>{error || "This order is not available right now."}</p>
          </div>
        </div>
      </div>
    );
  }

  const isBuyer = viewerId === order.buyer_id;
  const isSeller = viewerId === order.seller_id;
  const deliveryCopy =
    order.delivery_mode === "instant"
      ? isBuyer
        ? "These delivery details were unlocked for you as soon as the purchase was created."
        : "This is the exact instant-delivery payload released to the buyer on this order."
      : isBuyer
        ? "This order is marked for manual handoff. The seller should continue the delivery with you in chat."
        : "This order is marked for manual handoff. Continue the delivery with the buyer through chat.";

  return (
    <div className="module-page order-room-page">
      <div className="shell">
        <div className="module-page__shell order-room-shell">
          <span className="section-eyebrow">Order Room</span>
          <h1>{order.offer_title}</h1>
          <p>
            This order belongs to {isBuyer ? "your buyer account" : isSeller ? "your seller account" : "this account"}.
            Delivery details stay protected inside the order room instead of the public marketplace.
          </p>

          <div className="order-room__stats">
            <article className="seller-module__card">
              <strong>Order status</strong>
              <span>{order.status}</span>
            </article>
            <article className="seller-module__card">
              <strong>Delivery mode</strong>
              <span>{getOfferDeliveryModeLabel(order.delivery_mode)}</span>
            </article>
            <article className="seller-module__card">
              <strong>Game lane</strong>
              <span>
                {order.game_slug} / {order.category_slug}
              </span>
            </article>
            <article className="seller-module__card">
              <strong>Created</strong>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </article>
          </div>

          <div className="order-room__delivery">
            <span className="section-eyebrow">
              {order.delivery_mode === "instant" ? "Unlocked delivery" : "Manual delivery"}
            </span>
            <strong>{getOfferDeliveryModeLabel(order.delivery_mode)}</strong>
            <p>{deliveryCopy}</p>

            {order.delivery_mode === "instant" ? (
              deliveryDetails?.delivery_content?.trim() ? (
                <pre className="order-room__secret">{deliveryDetails.delivery_content}</pre>
              ) : (
                <p className="auth-feedback auth-feedback--error">
                  This order is marked as instant delivery, but no delivery content was attached.
                </p>
              )
            ) : (
              <div className="order-room__chat-note">
                <strong>Chat delivery required</strong>
                <span>
                  The live chat layer is the next step. For now, this order is clearly marked as a
                  manual handoff order inside the room.
                </span>
              </div>
            )}
          </div>

          <div className="hero-actions">
            {isSeller ? (
              <Link className="primary-button" href="/sell/orders">
                Back to Seller Orders
              </Link>
            ) : (
              <Link
                className="primary-button"
                href={`/marketplace/${order.game_slug}?category=${order.category_slug}`}
              >
                Back to Marketplace
              </Link>
            )}

            <Link className="ghost-button" href="/account">
              Account Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

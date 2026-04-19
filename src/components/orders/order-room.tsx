"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  getSchemaCompatibilityMessage,
  isLikelySchemaCompatibilityError,
  normalizeOrderRow,
} from "@/lib/marketplace-compat";
import { PageLoader } from "@/components/shared/page-loader";
import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import {
  type OrderDeliveryDetailsRow,
  type OrderMessageRow,
  type OrderRow,
  type OrderTradeRoomRow,
} from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

type OrderRoomProps = {
  orderId: string;
};

type PartyProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export function OrderRoom({ orderId }: OrderRoomProps) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [room, setRoom] = useState<OrderTradeRoomRow | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState<OrderDeliveryDetailsRow | null>(null);
  const [messages, setMessages] = useState<OrderMessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PartyProfile>>({});
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [sellerWindowMinutes, setSellerWindowMinutes] = useState("60");
  const [messageInput, setMessageInput] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const bootstrapTriedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapRoomIfMissing() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { ok: false, error: "Please log in again and retry." };
      }

      const response = await fetch("/api/orders/room/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          error: payload?.error ?? "Could not initialize this order room.",
        };
      }

      return { ok: true, error: "" };
    }

    async function loadOrderRoom(silent = false) {
      if (!silent) {
        setIsLoading(true);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;

      if (!user) {
        if (isMounted) {
          setViewerId(null);
          setOrder(null);
          setRoom(null);
          setDeliveryDetails(null);
          setMessages([]);
          setProfiles({});
          setIsLoading(false);
        }
        return;
      }

      if (!isMounted) return;
      setViewerId(user.id);

      const [orderResult, roomResult, deliveryResult, messagesResult] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle(),
        supabase
          .from("order_trade_rooms")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle(),
        supabase
          .from("order_delivery_details")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle(),
        supabase
          .from("order_messages")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;

      const nextError =
        orderResult.error?.message ||
        roomResult.error?.message ||
        deliveryResult.error?.message ||
        messagesResult.error?.message ||
        (!orderResult.data ? "Order not found or access denied." : "");

      if (nextError) {
        setError(
          isLikelySchemaCompatibilityError(nextError)
            ? getSchemaCompatibilityMessage("Order room")
            : nextError
        );
        setOrder(null);
        setRoom(null);
        setDeliveryDetails(null);
        setMessages([]);
        setProfiles({});
        setIsLoading(false);
        return;
      }

      const typedOrder = normalizeOrderRow(orderResult.data as Record<string, unknown>);
      const typedRoom = roomResult.data as OrderTradeRoomRow | null;
      const typedDelivery = (deliveryResult.data ?? null) as OrderDeliveryDetailsRow | null;
      const typedMessages = (messagesResult.data ?? []) as OrderMessageRow[];

      if (!typedRoom && !bootstrapTriedRef.current) {
        bootstrapTriedRef.current = true;
        const bootstrapResult = await bootstrapRoomIfMissing();

        if (!isMounted) return;

        if (bootstrapResult.ok) {
          await loadOrderRoom(silent);
          return;
        }

        setError(bootstrapResult.error);
      }

      setOrder(typedOrder);
      setRoom(typedRoom);
      setDeliveryDetails(typedDelivery);
      setMessages(typedMessages);
      setSellerWindowMinutes(String(typedRoom?.delivery_window_minutes ?? 60));

      const profileIds = Array.from(
        new Set(
          [typedOrder.buyer_id, typedOrder.seller_id, ...typedMessages.map((item) => item.sender_id)].filter(
            (value): value is string => Boolean(value)
          )
        )
      );

      if (profileIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id,full_name,avatar_url")
          .in("id", profileIds);

        if (!isMounted) return;

        const nextProfiles: Record<string, PartyProfile> = {};
        (profileData ?? []).forEach((profile) => {
          nextProfiles[profile.id] = {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
        });
        setProfiles(nextProfiles);
      } else {
        setProfiles({});
      }

      void supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("order_id", orderId)
        .eq("is_read", false);

      setIsLoading(false);
    }

    void loadOrderRoom();

    const interval = window.setInterval(() => {
      void loadOrderRoom(true);
    }, 6000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  async function callOrderApi(
    endpoint: string,
    payload: Record<string, unknown>,
    successMessage?: string
  ) {
    setError("");
    setSuccess("");
    setIsActionLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setIsActionLoading(false);
      setError("Please log in again.");
      return null;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responsePayload = await response.json().catch(() => null);
    setIsActionLoading(false);

    if (!response.ok) {
      setError(responsePayload?.error ?? "Could not update this order room.");
      return null;
    }

    if (successMessage) {
      setSuccess(successMessage);
    }

    const { data: refreshSession } = await supabase.auth.getSession();
    const user = refreshSession.session?.user ?? null;
    if (user) {
      void supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("order_id", orderId)
        .eq("is_read", false);
    }

    return responsePayload;
  }

  async function refreshRoomState() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;
    if (!user) return;

    const [orderResult, roomResult, deliveryResult, messagesResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("order_trade_rooms")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle(),
      supabase
        .from("order_delivery_details")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle(),
      supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

    if (orderResult.data) {
      setOrder(normalizeOrderRow(orderResult.data as Record<string, unknown>));
    }
    if (roomResult.data) setRoom(roomResult.data as OrderTradeRoomRow);
    setDeliveryDetails((deliveryResult.data ?? null) as OrderDeliveryDetailsRow | null);
    setMessages((messagesResult.data ?? []) as OrderMessageRow[]);
  }

  async function handleStartRoom() {
    const payload = await callOrderApi(
      "/api/orders/room/start",
      {
        orderId,
        deliveryWindowMinutes: Number(sellerWindowMinutes),
      },
      "Delivery room started. The buyer has been notified."
    );

    if (payload) {
      await refreshRoomState();
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = await callOrderApi(
      "/api/orders/room/pay",
      {
        orderId,
        cardHolder,
        cardNumber,
        expiry,
        cvc,
      },
      "Funds are now held safely on the platform. You can continue in chat."
    );

    if (payload) {
      setCardHolder("");
      setCardNumber("");
      setExpiry("");
      setCvc("");
      await refreshRoomState();
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = await callOrderApi(
      "/api/orders/room/message",
      {
        orderId,
        message: messageInput,
      }
    );

    if (payload) {
      setMessageInput("");
      await refreshRoomState();
    }
  }

  async function handleSellerDelivered() {
    const payload = await callOrderApi(
      "/api/orders/room/seller-delivered",
      {
        orderId,
      },
      "Delivery marked. The buyer can now confirm receipt or report an issue."
    );

    if (payload) {
      await refreshRoomState();
    }
  }

  async function handleBuyerDecision(decision: "received" | "not_received") {
    const payload = await callOrderApi(
      "/api/orders/room/buyer-receipt",
      {
        orderId,
        decision,
      },
      decision === "received"
        ? "Purchase complete. The seller can now see this as a successful sale."
        : "Dispute opened. Funds remain held until admin reviews the order."
    );

    if (payload) {
      await refreshRoomState();
    }
  }

  if (isLoading) {
    return (
      <PageLoader
        label="Opening delivery room..."
        hint="BEN10 is loading the live trade room, payment hold, and chat state."
      />
    );
  }

  if (error && !order) {
    return (
      <div className="module-page order-room-page">
        <div className="shell">
          <div className="module-page__shell">
            <span className="section-eyebrow">Order Room</span>
            <h1>We could not open this order.</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order || !room) {
    return (
      <div className="module-page order-room-page">
        <div className="shell">
          <div className="module-page__shell order-room-shell">
            <span className="section-eyebrow">Delivery Room</span>
            <h1>Room setup is not ready yet.</h1>
            <p>
              The order exists, but the delivery-room record was not found yet. This usually
              happens when old orders were created before the new room workflow.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
              <Link className="ghost-button" href="/notifications">
                Back to Notifications
              </Link>
            </div>
            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  const isBuyer = viewerId === order.buyer_id;
  const isSeller = viewerId === order.seller_id;
  const canSendMessages = room.room_status === "open" && room.payment_status !== "unpaid";
  const buyerNeedsPayment = isBuyer && room.room_status === "open" && room.payment_status === "unpaid";
  const sellerWaitingForBuyer = isSeller && room.room_status === "open" && room.payment_status === "unpaid";
  const sellerCanStartRoom = isSeller && room.room_status === "awaiting_seller";
  const buyerCanConfirm =
    isBuyer &&
    room.room_status === "open" &&
    !room.buyer_confirmed_received_at &&
    !room.buyer_disputed_at &&
    (Boolean(room.seller_marked_delivered_at) || order.delivery_mode === "instant") &&
    (room.payment_status === "held" || room.payment_status === "released");
  const sellerCanMarkDelivered =
    isSeller &&
    room.room_status === "open" &&
    !room.seller_marked_delivered_at &&
    (room.payment_status === "held" || room.payment_status === "released");

  const roomStatusLabel =
    room.room_status === "awaiting_seller"
      ? "Waiting for seller"
      : room.room_status === "open"
        ? "Open"
        : room.room_status === "completed"
          ? "Completed"
          : room.room_status === "disputed"
            ? "Disputed"
            : "Closed";
  const paymentStatusLabel =
    room.payment_status === "unpaid"
      ? "Not held yet"
      : room.payment_status === "held"
        ? "Held by platform"
        : room.payment_status === "released"
          ? "Released to seller"
          : "Refunded to buyer";

  return (
    <div className="module-page order-room-page">
      <div className="shell">
        <div className="module-page__shell order-room-shell">
          <span className="section-eyebrow">Delivery Room</span>
          <h1>{order.offer_title}</h1>
          <p>
            This room manages the payment hold, live delivery conversation, buyer confirmation, and
            any dispute that needs admin review.
          </p>

          <div className="order-room__stats">
            <article className="seller-module__card">
              <strong>Order</strong>
              <span>{order.status}</span>
            </article>
            <article className="seller-module__card">
              <strong>Room</strong>
              <span>{roomStatusLabel}</span>
            </article>
            <article className="seller-module__card">
              <strong>Payment</strong>
              <span>{paymentStatusLabel}</span>
            </article>
            <article className="seller-module__card">
              <strong>Delivery mode</strong>
              <span>{getOfferDeliveryModeLabel(order.delivery_mode)}</span>
            </article>
          </div>

          {room.delivery_deadline ? (
            <div className="order-room__banner">
              <strong>Delivery deadline</strong>
              <span>{new Date(room.delivery_deadline).toLocaleString()}</span>
            </div>
          ) : null}

          {room.room_status === "completed" || room.resolution_status === "buyer_confirmed" ? (
            <div className="order-room__celebration">
              <strong>Successful trade</strong>
              <span>
                Sale successful for the seller and purchase successful for the buyer. Funds have
                been released.
              </span>
            </div>
          ) : null}

          {room.room_status === "disputed" ? (
            <div className="order-room__warning">
              <strong>Dispute in progress</strong>
              <span>
                The buyer reported a problem. Funds remain held on the platform until admin reviews
                the case.
              </span>
            </div>
          ) : null}

          {room.resolution_status === "resolved_for_seller" ? (
            <div className="order-room__celebration">
              <strong>Admin resolved the dispute for the seller</strong>
              <span>{room.resolution_note || "Held funds were released to the seller."}</span>
            </div>
          ) : null}

          {room.resolution_status === "resolved_for_buyer" ? (
            <div className="order-room__warning">
              <strong>Admin resolved the dispute for the buyer</strong>
              <span>{room.resolution_note || "Held funds were refunded to the buyer."}</span>
            </div>
          ) : null}

          {sellerCanStartRoom ? (
            <div className="order-room__setup">
              <strong>Start the delivery room</strong>
              <p>
                Choose how long the room should stay active, then notify the buyer that the chat is
                ready.
              </p>
              <div className="seller-form-grid">
                <div>
                  <label htmlFor="room-window">Delivery window in minutes</label>
                  <input
                    id="room-window"
                    type="number"
                    min="5"
                    max="10080"
                    step="5"
                    value={sellerWindowMinutes}
                    onChange={(event) => setSellerWindowMinutes(event.target.value)}
                  />
                </div>
              </div>
              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleStartRoom}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? "Starting..." : "Start Room"}
                </button>
              </div>
            </div>
          ) : null}

          {room.room_status === "awaiting_seller" && isBuyer ? (
            <div className="order-room__setup">
              <strong>Waiting for the seller</strong>
              <p>
                The order exists, but the seller still needs to open the delivery room before you
                can continue.
              </p>
            </div>
          ) : null}

          {buyerNeedsPayment ? (
            <form className="auth-form order-room__payment-form" onSubmit={handlePaymentSubmit}>
              <strong>Open chat with payment hold</strong>
              <p>
                Your payment is currently fake for testing, but the interface treats it like an
                escrow hold. The money stays on the platform until you confirm receipt of the
                product.
              </p>

              <label htmlFor="card-holder">Card holder</label>
              <input
                id="card-holder"
                type="text"
                value={cardHolder}
                onChange={(event) => setCardHolder(event.target.value)}
                placeholder="Player Name"
              />

              <label htmlFor="card-number">Card number</label>
              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder="4242 4242 4242 4242"
              />

              <div className="seller-form-grid">
                <div>
                  <label htmlFor="card-expiry">Expiry</label>
                  <input
                    id="card-expiry"
                    type="text"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                    placeholder="12/30"
                  />
                </div>
                <div>
                  <label htmlFor="card-cvc">CVC</label>
                  <input
                    id="card-cvc"
                    type="text"
                    inputMode="numeric"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="hero-actions">
                <button className="primary-button" type="submit" disabled={isActionLoading}>
                  {isActionLoading ? "Holding funds..." : "Open Chat"}
                </button>
              </div>
            </form>
          ) : null}

          {sellerWaitingForBuyer ? (
            <div className="order-room__setup">
              <strong>Waiting for buyer payment hold</strong>
              <p>
                The room is open. Once the buyer enters their card details, the funds will be held
                and the live chat will unlock.
              </p>
            </div>
          ) : null}

          {order.delivery_mode === "instant" && deliveryDetails?.delivery_content?.trim() && deliveryDetails.unlocked_at ? (
            <div className="order-room__delivery">
              <span className="section-eyebrow">Protected delivery details</span>
              <strong>Instant delivery payload</strong>
              <p>
                This content is protected inside the room because the buyer completed the payment
                hold step.
              </p>
              <pre className="order-room__secret">{deliveryDetails.delivery_content}</pre>
            </div>
          ) : null}

          <div className="order-room__chat">
            <div className="order-room__chat-head">
              <strong>Order Chat</strong>
              <span>
                {canSendMessages
                  ? "Live now"
                  : room.room_status === "awaiting_seller"
                    ? "Locked until the seller starts the room"
                    : "Locked until the buyer completes the payment hold"}
              </span>
            </div>

            <div className="order-room__messages">
              {messages.length === 0 ? (
                <div className="order-room__empty">
                  <strong>No messages yet.</strong>
                  <span>System updates and chat replies will appear here.</span>
                </div>
              ) : (
                messages.map((message) => {
                  const profile = message.sender_id ? profiles[message.sender_id] : null;
                  const senderLabel = message.is_system
                    ? "System"
                    : message.sender_id === viewerId
                      ? "You"
                      : message.sender_id === order.buyer_id
                        ? "Buyer"
                        : message.sender_id === order.seller_id
                          ? "Seller"
                          : profile?.full_name || "Participant";

                  return (
                    <article
                      key={message.id}
                      className={
                        message.is_system
                          ? "order-room__message order-room__message--system"
                          : message.sender_id === viewerId
                            ? "order-room__message order-room__message--self"
                            : "order-room__message"
                      }
                    >
                      <div className="order-room__message-head">
                        <strong>{senderLabel}</strong>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
                      </div>
                      <p>{message.message}</p>
                    </article>
                  );
                })
              )}
            </div>

            <form className="order-room__composer" onSubmit={handleSendMessage}>
              <textarea
                rows={3}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Write your message here..."
                disabled={!canSendMessages || isActionLoading}
              />
              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={!canSendMessages || isActionLoading || !messageInput.trim()}
                >
                  {isActionLoading ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>

          <div className="order-room__actions">
            <strong>Delivery Actions</strong>

            {sellerCanMarkDelivered ? (
              <button
                className="primary-button"
                type="button"
                onClick={handleSellerDelivered}
                disabled={isActionLoading}
              >
                {isActionLoading ? "Working..." : "Seller: I Delivered The Info"}
              </button>
            ) : null}

            {buyerCanConfirm ? (
              <>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleBuyerDecision("received")}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? "Working..." : "Buyer: I Received It"}
                </button>
                <button
                  className="ghost-button admin-reject-button"
                  type="button"
                  onClick={() => handleBuyerDecision("not_received")}
                  disabled={isActionLoading}
                >
                  Buyer: I Did Not Receive It
                </button>
              </>
            ) : null}
          </div>

          {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
          {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

          <div className="hero-actions">
            {isSeller ? (
              <Link className="primary-button" href="/sell/orders">
                Back to Seller Orders
              </Link>
            ) : (
              <Link className="primary-button" href="/notifications">
                Back to Notifications
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

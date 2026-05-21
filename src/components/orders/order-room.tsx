"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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

type TimelineStep = {
  label: string;
  detail: string;
  isDone: boolean;
  at: string | null;
};

function formatRoomDate(value: string | null | undefined) {
  if (!value) {
    return "Not reached yet";
  }

  return new Date(value).toLocaleString();
}

export function OrderRoom({ orderId }: OrderRoomProps) {
  const searchParams = useSearchParams();
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const bootstrapTriedRef = useRef(false);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stripeConfirmTriedRef = useRef(false);
  const copyFeedbackTimerRef = useRef<number | null>(null);

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

      setLastSyncedAt(new Date().toISOString());
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const textarea = composerInputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [messageInput]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get("stripe_session_id");

    if (!sessionId || stripeConfirmTriedRef.current) {
      return;
    }

    stripeConfirmTriedRef.current = true;

    async function confirmStripePayment() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setError("Please log in again to confirm this payment.");
        return;
      }

      setIsActionLoading(true);
      const response = await fetch("/api/orders/room/confirm-stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId, sessionId }),
      });
      const payload = await response.json().catch(() => null);
      setIsActionLoading(false);

      if (!response.ok) {
        setError(payload?.error ?? "Could not confirm Stripe payment.");
        return;
      }

      setSuccess("Stripe payment confirmed. Chat is now open.");
      await refreshRoomState();
      window.history.replaceState(null, "", `/orders/${orderId}`);
    }

    void confirmStripePayment();
  }, [orderId, searchParams]);

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
    setLastSyncedAt(new Date().toISOString());
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

  async function handleStripeCheckout() {
    const payload = await callOrderApi("/api/orders/room/create-stripe-session", { orderId });
    const checkoutUrl = typeof payload?.url === "string" ? payload.url : "";

    if (!checkoutUrl) {
      setError("Stripe did not return a checkout link.");
      return;
    }

    window.location.assign(checkoutUrl);
  }

  async function submitMessage() {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) {
      return;
    }

    const payload = await callOrderApi(
      "/api/orders/room/message",
      {
        orderId,
        message: trimmedMessage,
      }
    );

    if (payload) {
      setMessageInput("");
      await refreshRoomState();
      composerInputRef.current?.focus();
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  async function handleCopyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied.`);

      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }

      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setCopyFeedback("");
      }, 2400);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
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
  const buyerName = profiles[order.buyer_id]?.full_name || "Buyer";
  const sellerName = profiles[order.seller_id]?.full_name || "Seller";
  const buyerAvatar = profiles[order.buyer_id]?.avatar_url || "";
  const sellerAvatar = profiles[order.seller_id]?.avatar_url || "";
  const nextStepTitle = sellerCanStartRoom
    ? "Seller should open the room now."
    : buyerNeedsPayment
      ? "Buyer should complete secure payment hold."
      : sellerWaitingForBuyer
        ? "Wait for buyer payment confirmation."
        : sellerCanMarkDelivered
          ? "Seller should send the delivery and mark it complete."
          : buyerCanConfirm
            ? "Buyer should confirm receipt or report a problem."
            : room.room_status === "completed"
              ? "This order is complete."
              : room.room_status === "disputed"
                ? "Admin review is now the active path."
                : "Keep the room updated until the next checkpoint.";
  const nextStepDescription = sellerCanStartRoom
    ? "Set the delivery window, open the room, and let the buyer know where the conversation will happen."
    : buyerNeedsPayment
      ? "Once Stripe confirms the payment, the funds stay protected on-platform and the live chat unlocks automatically."
      : sellerWaitingForBuyer
        ? "No seller payout is counted yet. The room becomes active after the buyer finishes the payment hold step."
        : sellerCanMarkDelivered
          ? "Use the room chat to explain what you sent, then mark delivery so the buyer can verify it with confidence."
          : buyerCanConfirm
            ? "If everything matches the offer, confirm receipt to release the payout. If not, report the issue here so funds stay protected."
            : room.room_status === "completed"
              ? "The buyer confirmed receipt and the room now serves as the final delivery record."
              : room.room_status === "disputed"
                ? "The order is paused under dispute review. Funds stay controlled until the admin resolves the case."
                : "Keep both sides aligned in chat so the order keeps moving without confusion.";
  const protectionItems = [
    room.payment_status === "unpaid"
      ? "No seller payout is counted yet because the buyer has not completed payment."
      : room.payment_status === "held"
        ? "Funds are currently held on-platform until the buyer confirms receipt or admin resolves a dispute."
        : room.payment_status === "released"
          ? "The payout has been released to the seller because the order reached a successful completion checkpoint."
          : "The buyer was refunded, so this order does not contribute to seller payout.",
    "Every important step stays inside one room: payment hold, delivery chat, buyer confirmation, and dispute evidence.",
    "If something feels wrong, the buyer can open a dispute and keep the funds protected during review.",
  ];
  const roomTimeline: TimelineStep[] = [
    {
      label: "Order created",
      detail: "The order exists and the room record is available for both sides.",
      isDone: true,
      at: order.created_at,
    },
    {
      label: "Seller opened room",
      detail: "The seller activates the room and sets the delivery window.",
      isDone: Boolean(room.seller_started_at),
      at: room.seller_started_at,
    },
    {
      label: "Buyer payment held",
      detail: "Buyer funds are protected on-platform before the delivery flow continues.",
      isDone: room.payment_status === "held" || room.payment_status === "released" || room.payment_status === "refunded",
      at: room.buyer_paid_at,
    },
    {
      label: "Seller marked delivery",
      detail: "The seller confirms the information or goods were sent in the room.",
      isDone: Boolean(room.seller_marked_delivered_at),
      at: room.seller_marked_delivered_at,
    },
    {
      label: room.room_status === "disputed" ? "Dispute or admin outcome" : "Buyer confirmation",
      detail:
        room.room_status === "disputed"
          ? "The order moved into a protected dispute path."
          : "The buyer verifies the delivery and completes the trade.",
      isDone: Boolean(room.buyer_confirmed_received_at || room.buyer_disputed_at || room.resolved_at),
      at: room.buyer_confirmed_received_at ?? room.buyer_disputed_at ?? room.resolved_at,
    },
  ];
  const quickReplies =
    canSendMessages
      ? isSeller
        ? room.seller_marked_delivered_at
          ? [
              "I have already delivered the info. Please review it and confirm when you are ready.",
              "If anything looks unclear, tell me here and I will help immediately.",
              "Everything for this order was sent in the room. I am staying available for follow-up.",
            ]
          : [
              "I am preparing your delivery now and will update you here shortly.",
              "Please stay in this room so I can confirm the delivery details with you safely.",
              "I will mark the order as delivered as soon as the information is sent.",
            ]
        : room.seller_marked_delivered_at
          ? [
              "I received the details and I am checking everything now.",
              "Please give me a moment to verify the delivery before I confirm receipt.",
              "There is an issue with the delivery. I need clarification before I can confirm.",
            ]
          : [
              "Hello, I am here and ready for the delivery process.",
              "Please let me know the delivery ETA when you are ready.",
              "I will confirm receipt here after I review the delivery.",
            ]
      : [];
  const orderFacts = [
    { label: "Order ID", value: order.id },
    { label: "Game", value: order.game_slug },
    { label: "Category", value: order.category_slug },
    { label: "Created", value: formatRoomDate(order.created_at) },
    { label: "Delivery window", value: room.delivery_deadline ? formatRoomDate(room.delivery_deadline) : "Not set yet" },
    { label: "Last sync", value: formatRoomDate(lastSyncedAt) },
  ];
  const trimmedMessageLength = messageInput.trim().length;

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

          <div className="order-room__participants">
            <article className="order-room__participant">
              {sellerAvatar ? (
                <img src={sellerAvatar} alt={sellerName} />
              ) : (
                <div className="order-room__participant-fallback">{sellerName.slice(0, 1)}</div>
              )}
              <div>
                <strong>Seller</strong>
                <span>{sellerName}</span>
              </div>
            </article>
            <article className="order-room__participant">
              {buyerAvatar ? (
                <img src={buyerAvatar} alt={buyerName} />
              ) : (
                <div className="order-room__participant-fallback">{buyerName.slice(0, 1)}</div>
              )}
              <div>
                <strong>Customer</strong>
                <span>{buyerName}</span>
              </div>
            </article>
          </div>
          <div className="order-room__workspace">
            <div className="order-room__primary">
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
                <div className="auth-form order-room__payment-form order-room__payment-card">
                  <div className="order-room__payment-head">
                    <div>
                      <strong>Secure payment hold</strong>
                      <p>
                        Complete payment through Stripe Checkout. After Stripe confirms the payment,
                        the funds stay held and the order chat opens automatically.
                      </p>
                    </div>
                    <div className="order-room__card-preview">
                      <span>STRIPE CHECKOUT</span>
                      <strong>${order.price_usd.toFixed(2)} USD</strong>
                      <small>Protected hold</small>
                    </div>
                  </div>

                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handleStripeCheckout}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? "Opening Stripe..." : "Pay with Stripe"}
                    </button>
                  </div>
                </div>
              ) : null}

              {sellerWaitingForBuyer ? (
                <div className="order-room__setup">
                  <strong>Waiting for buyer payment hold</strong>
                  <p>
                    The room is open. Once the buyer completes Stripe Checkout, funds will be held and
                    the live chat will unlock automatically.
                  </p>
                </div>
              ) : null}

              {order.delivery_mode === "instant" && deliveryDetails?.delivery_content?.trim() && deliveryDetails.unlocked_at ? (
                <div className="order-room__delivery">
                  <div className="order-room__delivery-head">
                    <div>
                      <span className="section-eyebrow">Protected delivery details</span>
                      <strong>Instant delivery payload</strong>
                    </div>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => handleCopyText(deliveryDetails.delivery_content!, "Delivery details")}
                    >
                      Copy delivery
                    </button>
                  </div>
                  <p>
                    This content is protected inside the room because the buyer completed the payment
                    hold step.
                  </p>
                  <pre className="order-room__secret">{deliveryDetails.delivery_content}</pre>
                </div>
              ) : null}

              <div className="order-room__chat">
                <div className="order-room__chat-head">
                  <div>
                    <strong>Order Chat</strong>
                    <span>
                      {canSendMessages
                        ? "Live now"
                        : room.room_status === "awaiting_seller"
                          ? "Locked until the seller starts the room"
                          : "Locked until the buyer completes the payment hold"}
                    </span>
                  </div>
                  <div className="order-room__chat-meta">
                    <span>{canSendMessages ? "Protected room active" : "Awaiting next checkpoint"}</span>
                    <small>Last sync: {formatRoomDate(lastSyncedAt)}</small>
                  </div>
                </div>

                {!canSendMessages ? (
                  <div className="order-room__chat-lock">
                    {room.room_status === "awaiting_seller"
                      ? "Seller must press Start Room first."
                      : "Customer must complete Stripe Checkout first, then chat opens automatically."}
                  </div>
                ) : null}

                {quickReplies.length > 0 ? (
                  <div className="order-room__quick-replies">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        className="order-room__quick-reply"
                        onClick={() => {
                          setMessageInput(reply);
                          composerInputRef.current?.focus();
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                ) : null}

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
                            ? `Buyer - ${buyerName}`
                            : message.sender_id === order.seller_id
                              ? `Seller - ${sellerName}`
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
                  <div ref={messagesEndRef} />
                </div>

                <form className="order-room__composer" onSubmit={handleSendMessage}>
                  <textarea
                    ref={composerInputRef}
                    rows={3}
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={
                      canSendMessages
                        ? "Write your message here. Press Enter to send, Shift + Enter for a new line."
                        : "Chat is locked until payment step is completed."
                    }
                    disabled={!canSendMessages || isActionLoading}
                  />
                  <div className="order-room__composer-actions">
                    <span>{trimmedMessageLength} chars</span>
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
            </div>

            <aside className="order-room__sidebar">
              <section className="order-room__insight order-room__insight--next">
                <span className="section-eyebrow">What Happens Next</span>
                <strong>{nextStepTitle}</strong>
                <p>{nextStepDescription}</p>
              </section>

              <section className="order-room__insight">
                <span className="section-eyebrow">Protection Summary</span>
                <div className="order-room__insight-list">
                  {protectionItems.map((item) => (
                    <article key={item} className="order-room__insight-item">
                      <strong>Protection</strong>
                      <p>{item}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="order-room__insight">
                <span className="section-eyebrow">Room Timeline</span>
                <div className="order-room__timeline">
                  {roomTimeline.map((step) => (
                    <article
                      key={step.label}
                      className={
                        step.isDone
                          ? "order-room__timeline-item order-room__timeline-item--done"
                          : "order-room__timeline-item"
                      }
                    >
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                      <small>{formatRoomDate(step.at)}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="order-room__insight">
                <span className="section-eyebrow">Order Facts</span>
                <div className="order-room__facts">
                  {orderFacts.map((fact) => (
                    <div key={fact.label} className="order-room__fact">
                      <strong>{fact.label}</strong>
                      <span>{fact.value}</span>
                    </div>
                  ))}
                </div>
                <button className="ghost-button" type="button" onClick={() => handleCopyText(order.id, "Order ID")}>
                  Copy Order ID
                </button>
              </section>
            </aside>
          </div>

          {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
          {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}
          {copyFeedback ? <p className="auth-feedback auth-feedback--success">{copyFeedback}</p> : null}

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


"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getOfferDeliveryModeLabel } from "@/lib/offer-delivery";
import { normalizeOfferRow } from "@/lib/marketplace-compat";
import { type OfferRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

export function CheckoutView({ offerId }: { offerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [offer, setOffer] = useState<OfferRow | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const confirmedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOffer() {
      const { data, error: offerError } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .maybeSingle();

      if (!isMounted) return;

      if (offerError || !data) {
        setError(offerError?.message ?? "This offer is no longer available.");
        setOffer(null);
      } else {
        setOffer(normalizeOfferRow(data as Record<string, unknown>));
      }
      setIsLoading(false);
    }

    void loadOffer();
    return () => {
      isMounted = false;
    };
  }, [offerId]);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const sessionId = searchParams.get("stripe_session_id");
    if (!orderId || !sessionId || confirmedSessionRef.current === sessionId) return;

    confirmedSessionRef.current = sessionId;

    let isMounted = true;

    async function confirmPayment() {
      setIsConfirmingPayment(true);
      setError("");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (isMounted) {
          setError("Please log in again to confirm this payment.");
          setIsConfirmingPayment(false);
        }
        return;
      }

      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId, sessionId }),
      });
      const payload = await response.json().catch(() => null);

      if (!isMounted) return;

      if (!response.ok) {
        setError(payload?.error ?? "Could not confirm your payment.");
        setIsConfirmingPayment(false);
        return;
      }

      router.replace(`/orders/${orderId}`);
      router.refresh();
    }

    void confirmPayment();
    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  async function startPayment() {
    setError("");
    setIsStartingPayment(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Please log in again.");
      setIsStartingPayment(false);
      return;
    }

    const response = await fetch("/api/checkout/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ offerId }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || typeof payload?.url !== "string") {
      setError(payload?.error ?? "Could not start secure checkout.");
      setIsStartingPayment(false);
      return;
    }

    window.location.assign(payload.url);
  }

  const cancelled = searchParams.get("cancelled") === "1";

  return (
    <main className="auth-page">
      <div className="shell">
        <section className="auth-card">
          <span className="section-eyebrow">Secure Checkout</span>
          <h1>Review and pay securely</h1>
          <p>
            Your payment is confirmed before the seller receives the order. Delivery begins only after
            the payment hold succeeds.
          </p>

          {isConfirmingPayment ? <p>Confirming your Stripe payment…</p> : null}
          {cancelled ? <p className="auth-feedback auth-feedback--error">Payment was cancelled. No delivery has started.</p> : null}
          {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

          {isLoading ? (
            <p>Loading offer…</p>
          ) : offer ? (
            <>
              <div className="order-room__banner">
                <div>
                  <strong>{offer.title}</strong>
                  <span>{getOfferDeliveryModeLabel(offer.delivery_mode)} · {offer.delivery_time}</span>
                </div>
                <strong>${offer.price_usd.toFixed(2)} USD</strong>
              </div>

              <div className="order-room__setup">
                <strong>Protected payment</strong>
                <p>
                  Stripe processes the payment. The seller is notified only after it has been confirmed,
                  and you can then follow delivery in your private order room.
                </p>
              </div>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={startPayment}
                  disabled={isStartingPayment || isConfirmingPayment}
                >
                  {isStartingPayment ? "Opening Stripe…" : `Pay $${offer.price_usd.toFixed(2)} with Stripe`}
                </button>
                <Link className="ghost-button" href="/marketplace">
                  Back to Marketplace
                </Link>
              </div>
            </>
          ) : (
            <Link className="ghost-button" href="/marketplace">
              Return to Marketplace
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}

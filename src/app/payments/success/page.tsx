import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";

type SuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const sessionId = typeof params.stripe_session_id === "string" ? params.stripe_session_id : "";
  const orderRoomHref = orderId
    ? `/orders/${orderId}${sessionId ? `?stripe_session_id=${encodeURIComponent(sessionId)}` : ""}`
    : "/notifications";

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card account-card payment-result-card">
            <span className="section-eyebrow">Payment Success</span>
            <h1>Payment approved</h1>
            <p>
              Stripe accepted the payment. Continue to the order room so BEN10 can confirm the hold
              and unlock the live delivery chat.
            </p>

            <div className="hero-actions">
              <Link className="primary-button" href={orderRoomHref}>
                Continue To Order Room
              </Link>
              <Link className="ghost-button" href="/notifications">
                Notifications
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}


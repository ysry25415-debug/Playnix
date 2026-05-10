import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";

type CancelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentCancelPage({ searchParams }: CancelPageProps) {
  const params = await searchParams;
  const orderId = typeof params.order_id === "string" ? params.order_id : "";
  const orderRoomHref = orderId ? `/orders/${orderId}` : "/notifications";

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card account-card payment-result-card payment-result-card--cancel">
            <span className="section-eyebrow">Payment Cancelled</span>
            <h1>Payment was not completed</h1>
            <p>
              No funds were held. You can return to the order room and try payment again whenever
              you are ready.
            </p>

            <div className="hero-actions">
              <Link className="primary-button" href={orderRoomHref}>
                Back To Order Room
              </Link>
              <Link className="ghost-button" href="/marketplace">
                Back To Marketplace
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}


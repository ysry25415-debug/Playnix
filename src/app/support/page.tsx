import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";

const protectionSteps = [
  {
    step: "1",
    title: "Pay through protected checkout",
    description: "A purchase starts with checkout. The seller cannot start delivery before payment is recorded.",
  },
  {
    step: "2",
    title: "Keep delivery in the order room",
    description: "Messages, delivery updates, and confirmation stay attached to the order so there is a clear record.",
  },
  {
    step: "3",
    title: "Confirm delivery or open a dispute",
    description: "Funds remain held until you confirm receipt. If something is wrong, open a dispute from the order room.",
  },
];

export default function SupportPage() {
  return (
    <AuthGuard>
      <main className="module-page support-page">
        <div className="shell">
          <section className="module-page__shell support-page__hero">
            <span className="eyebrow-chip">Protection Center</span>
            <h1>Every purchase has a clear protected path.</h1>
            <p>
              Use your order room for delivery, confirmation, and disputes. This keeps the payment
              and the evidence connected to the same transaction.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/account">
                View My Purchases
              </Link>
              <Link className="ghost-button" href="/notifications">
                Open Notifications
              </Link>
            </div>
          </section>

          <section className="support-page__steps" aria-label="How purchase protection works">
            {protectionSteps.map((item) => (
              <article key={item.step} className="support-page__step">
                <span>{item.step}</span>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </section>

          <section className="support-page__actions" aria-label="Support actions">
            <article>
              <span className="section-eyebrow">Need help with an order?</span>
              <h2>Open the relevant order.</h2>
              <p>
                The order room is the correct place to check delivery status, message the seller,
                confirm receipt, or report a problem.
              </p>
              <Link className="primary-button" href="/account">
                Go To Orders
              </Link>
            </article>
            <article>
              <span className="section-eyebrow">Selling on Playnix</span>
              <h2>Verification protects the marketplace.</h2>
              <p>
                Seller applications are reviewed before an account can publish offers. Identity
                documents are stored privately for that review.
              </p>
              <Link className="ghost-button" href="/seller/apply">
                Seller Verification
              </Link>
            </article>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

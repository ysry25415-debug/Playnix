import Link from "next/link";

import { SectionHeading } from "@/components/shared/section-heading";
import { trustHighlights } from "@/lib/homepage-data";

export function TrustSection() {
  return (
    <section className="section-block">
      <div className="shell">
        <SectionHeading
          eyebrow="BEN10 Standard"
          title="Built for premium trust, high-stakes orders, and serious growth"
          description="The first release focuses on presenting the marketplace clearly while the backend plan already accounts for moderation, evidence, payout controls, and category restrictions."
        />

        <div className="trust-grid">
          {trustHighlights.map((item) => (
            <article key={item.title} className="trust-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="cta-banner">
          <div>
            <span className="section-eyebrow">Ready To Build</span>
            <h3>
              Next we wire this storefront into real accounts, listings, orders,
              and data.
            </h3>
          </div>
          <Link className="primary-button" href="/support">
            View Support Layer
          </Link>
        </div>
      </div>
    </section>
  );
}

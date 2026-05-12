import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section eld-hero">
      <div className="shell shell--hero">
        <div className="eld-hero__media" aria-label="BEN10 hero showcase">
          <img
            src="https://i.pinimg.com/originals/4e/b0/4e/4eb04e88b652e927060d526d1e5da5a8.jpg"
            alt="Ben10 inspired gaming marketplace hero art"
          />
          <div className="eld-hero__overlay">
            <span className="eyebrow-chip">BEN10 Trading Hub</span>
            <h1>Buy and sell gaming offers in one trusted marketplace.</h1>
            <p>
              Browse accounts, currencies, and services with fast order flow and clear seller visibility
              built for smooth game trading.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/marketplace">
                Shop Now
              </Link>
              <Link className="ghost-button" href="/sell">
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

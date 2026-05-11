import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section eld-hero">
      <div className="shell shell--hero">
        <div className="hero-stage">
          <div className="hero-stage__image">
            <div className="hero-stage__topbar">
              <div className="hero-stage__caption">
                <span className="hero-stage__mini">BEN10 Trading Hub</span>
                <p>
                  Buy and sell gaming accounts, currency, and boosting services with protected flows,
                  fast delivery lanes, and verified seller visibility.
                </p>
              </div>

              <div className="hero-tag-row">
                <span>Buyer Protection</span>
                <span>Instant Delivery</span>
                <span>24/7 Support</span>
              </div>
            </div>

            <div className="hero-stage__bottom hero-stage__bottom--minimal">
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

          <article className="hero-stage__floating hero-stage__floating--left">
            <span>Live Shield</span>
            <strong>Secure order rooms for buyer and seller.</strong>
            <small>Track payment, delivery, and dispute flow in one timeline.</small>
          </article>

          <article className="hero-stage__floating hero-stage__floating--right">
            <span>Seller Lane</span>
            <strong>Publish offers by game and category.</strong>
            <small>Scale from one listing to a full storefront inside BEN10.</small>
          </article>
        </div>
      </div>
    </section>
  );
}

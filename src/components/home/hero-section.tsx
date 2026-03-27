import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section">
      <div className="shell shell--hero">
        <div className="hero-stage">
          <div className="hero-stage__image">
            <div className="hero-stage__bottom hero-stage__bottom--minimal">
              <div className="hero-actions hero-actions--single">
                <Link className="primary-button" href="/marketplace">
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

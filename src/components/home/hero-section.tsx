import Link from "next/link";

export function HeroSection() {
  return (
    <section className="eld-hero">
      <div className="shell shell--hero">
        <div className="eld-hero__media" aria-label="BEN10 hero showcase">
          <img
            src="https://i.pinimg.com/1200x/4e/b0/4e/4eb04e88b652e927060d526d1e5da5a8.jpg"
            srcSet="https://i.pinimg.com/736x/4e/b0/4e/4eb04e88b652e927060d526d1e5da5a8.jpg 736w, https://i.pinimg.com/1200x/4e/b0/4e/4eb04e88b652e927060d526d1e5da5a8.jpg 1200w"
            sizes="100vw"
            alt="Ben10 inspired gaming marketplace hero art"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="eld-hero__action">
            <Link className="primary-button" href="/marketplace">
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

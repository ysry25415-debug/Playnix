import Link from "next/link";

type SellerSectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  primaryAction?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

export function SellerSectionPage({
  eyebrow,
  title,
  description,
  highlights,
  primaryAction,
  secondaryAction,
}: SellerSectionPageProps) {
  return (
    <div className="seller-module">
      <span className="section-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="seller-module__highlights">
        {highlights.map((highlight) => (
          <article key={highlight} className="seller-module__card">
            <strong>{highlight}</strong>
            <span>Ready to expand into a full workflow as we continue building the platform.</span>
          </article>
        ))}
      </div>

      {(primaryAction || secondaryAction) ? (
        <div className="hero-actions">
          {primaryAction ? (
            <Link className="primary-button" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link className="ghost-button" href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

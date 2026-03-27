import Link from "next/link";

const footerLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sell", label: "Seller Center" },
  { href: "/support", label: "Protection" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-shell">
        <div className="footer-brand">
          <span className="brand-badge">BEN10</span>
          <p>
            BEN10 is a next-generation gaming marketplace with a bold Omnitrix
            green identity and a clean flow for buying, selling, and trading
            game services.
          </p>
        </div>

        <div className="footer-links">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

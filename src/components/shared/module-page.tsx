import Link from "next/link";

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ModulePage({
  eyebrow,
  title,
  description,
}: ModulePageProps) {
  return (
    <main className="module-page">
      <div className="shell module-page__shell">
        <span className="eyebrow-chip">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="hero-actions">
          <Link className="primary-button" href="/">
            Back To Home
          </Link>
          <Link className="ghost-button" href="/marketplace">
            Open Marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}

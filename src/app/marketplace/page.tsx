import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";
import { marketplaceGames } from "@/lib/marketplace-data";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const normalizedQuery = (q ?? "").trim().toLowerCase();

  const filteredGames = normalizedQuery
    ? marketplaceGames.filter((game) => {
        const searchableText = [
          game.title,
          game.eyebrow,
          game.description,
          ...game.categories.map((category) => `${category.title} ${category.description}`),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
    : marketplaceGames;

  return (
    <AuthGuard>
      <main className="module-page marketplace-hub-page">
        <div className="shell">
          <section className="module-page__shell marketplace-hub-shell">
            <div className="marketplace-hub-hero">
              <div className="marketplace-hub-hero__copy">
                <span className="eyebrow-chip">Marketplace Hub</span>
                <h1>Choose the game market you want to browse.</h1>
                <p>
                  Every game below leads to its own offers page, with dedicated sections so customers
                  only see the listings relevant to that game.
                </p>
                <div className="hero-actions">
                  <Link className="primary-button" href="/marketplace">
                    Shop Now
                  </Link>
                  <Link className="ghost-button" href="/support">
                    Protection Center
                  </Link>
                </div>
              </div>

              <aside className="marketplace-hub-hero__panel" aria-label="Live market lanes">
                <strong>Live market lanes</strong>
                <p>Jump directly into game-first surfaces shaped for accounts, currency, and services.</p>
                <div className="marketplace-hub-hero__chips">
                  {filteredGames.map((game) => (
                    <Link key={game.slug} href={`/marketplace/${game.slug}`}>
                      {game.title}
                    </Link>
                  ))}
                </div>
              </aside>
            </div>

            <div className="marketplace-hub-grid" id="market-hub-grid">
              {filteredGames.map((game) => (
                <Link key={game.slug} href={`/marketplace/${game.slug}`} className="marketplace-hub-card">
                  <span className="section-eyebrow">{game.eyebrow}</span>
                  <h2>{game.title}</h2>
                  <p>{game.description}</p>
                  <div className="marketplace-hub-card__chips">
                    {game.categories.map((category) => (
                      <span key={category.slug}>{category.title}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {normalizedQuery && filteredGames.length === 0 ? (
              <div className="marketplace-empty">
                <strong>No game markets match "{q}".</strong>
                <span>Try another keyword such as the game name or category.</span>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";
import { marketplaceGames } from "@/lib/marketplace-data";

export default function MarketplacePage() {
  return (
    <AuthGuard>
      <main className="module-page marketplace-hub-page">
        <div className="shell">
          <section className="module-page__shell marketplace-hub-shell">
            <span className="eyebrow-chip">Marketplace Hub</span>
            <h1>Choose the game market you want to browse.</h1>
            <p>
              Every game below leads to its own offers page, with dedicated sections so customers
              only see the listings relevant to that game.
            </p>

            <div className="marketplace-hub-grid">
              {marketplaceGames.map((game) => (
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
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

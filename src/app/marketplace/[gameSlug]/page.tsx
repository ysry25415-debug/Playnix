import { notFound } from "next/navigation";

import { GameMarketplaceView } from "@/components/marketplace/game-marketplace-view";
import { getMarketplaceGame } from "@/lib/marketplace-data";

export default async function GameMarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { gameSlug } = await params;
  const { category, q } = await searchParams;

  const game = getMarketplaceGame(gameSlug);
  if (!game) {
    notFound();
  }

  const initialCategory =
    game.categories.find((item) => item.slug === category)?.slug ?? game.categories[0].slug;

  return (
    <main className="module-page marketplace-game-shell">
      <div className="shell">
        <section className="module-page__shell">
          <GameMarketplaceView game={game} activeCategorySlug={initialCategory} searchQuery={q ?? ""} />
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import { marketplaceGames } from "@/lib/marketplace-data";

type MarketShortcut = {
  gameSlug: string;
  categorySlug: string;
  label: string;
};

type MarketGroup = {
  title: string;
  wide?: boolean;
  items: MarketShortcut[];
};

const marketGroups: MarketGroup[] = [
  {
    title: "Popular accounts",
    wide: true,
    items: [
      { gameSlug: "fortnite", categorySlug: "accounts", label: "Fortnite" },
      { gameSlug: "grand-theft-auto-5", categorySlug: "accounts", label: "Grand Theft Auto 5" },
      { gameSlug: "roblox", categorySlug: "accounts", label: "Roblox" },
      { gameSlug: "minecraft", categorySlug: "accounts", label: "Minecraft" },
      { gameSlug: "old-school-runescape", categorySlug: "accounts", label: "Old School RuneScape" },
      { gameSlug: "valorant", categorySlug: "accounts", label: "Valorant" },
      { gameSlug: "rainbow-six-siege-x", categorySlug: "accounts", label: "Rainbow Six Siege X" },
      { gameSlug: "league-of-legends", categorySlug: "accounts", label: "League of Legends" },
      { gameSlug: "pokemon-go", categorySlug: "accounts", label: "Pokemon Go" },
      { gameSlug: "clash-of-clans", categorySlug: "accounts", label: "Clash of Clans" },
    ],
  },
  {
    title: "Popular currencies",
    items: [
      { gameSlug: "donut-smp", categorySlug: "currency", label: "DonutSMP Money" },
      { gameSlug: "old-school-runescape", categorySlug: "currency", label: "Old School RuneScape Gold" },
      { gameSlug: "roblox", categorySlug: "currency", label: "Roblox Robux" },
      { gameSlug: "blade-ball", categorySlug: "currency", label: "Blade Ball Tokens" },
      { gameSlug: "path-of-exile-2", categorySlug: "currency", label: "Path of Exile 2 Currency" },
    ],
  },
  {
    title: "Popular boosting services",
    wide: true,
    items: [
      { gameSlug: "brawl-stars", categorySlug: "boosting", label: "Brawl Stars" },
      { gameSlug: "valorant", categorySlug: "boosting", label: "Valorant" },
      { gameSlug: "rocket-league", categorySlug: "boosting", label: "Rocket League" },
      { gameSlug: "rainbow-six-siege-x", categorySlug: "boosting", label: "Rainbow Six Siege X" },
    ],
  },
  {
    title: "Popular items",
    items: [
      { gameSlug: "steal-a-brainrot", categorySlug: "items", label: "Steal a Brainrot" },
      { gameSlug: "blox-fruits", categorySlug: "items", label: "Blox Fruits" },
    ],
  },
];

const gamesBySlug = new Map(marketplaceGames.map((game) => [game.slug, game]));

export function PopularMarketsSection() {
  return (
    <section className="section-block section-block--tight popular-markets">
      <div className="shell">
        <div className="popular-markets__grid">
          {marketGroups.map((group) => (
            <section
              key={group.title}
              className={group.wide ? "popular-market-group popular-market-group--wide" : "popular-market-group"}
            >
              <h2>{group.title}</h2>
              <div className="popular-market-group__items">
                {group.items.map((item) => {
                  const game = gamesBySlug.get(item.gameSlug);
                  if (!game) return null;

                  return (
                    <Link
                      key={`${item.gameSlug}-${item.categorySlug}`}
                      href={`/marketplace/${item.gameSlug}?category=${item.categorySlug}`}
                      className="popular-market-link"
                    >
                      <span className="popular-market-link__icon" aria-hidden="true">
                        {game.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

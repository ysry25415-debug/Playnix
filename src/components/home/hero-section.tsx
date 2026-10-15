import Link from "next/link";

import { marketplaceGames } from "@/lib/marketplace-data";

const heroGameSlugs = [
  "fortnite",
  "valorant",
  "grand-theft-auto-5",
  "rainbow-six-siege-x",
  "minecraft",
  "roblox",
  "league-of-legends",
  "rocket-league",
];

export function HeroSection() {
  const heroGames = heroGameSlugs
    .map((slug) => marketplaceGames.find((game) => game.slug === slug))
    .filter((game): game is (typeof marketplaceGames)[number] => Boolean(game));

  return (
    <section className="eld-hero">
      <div className="shell shell--hero">
        <div className="eld-hero__media" aria-label="BEN10 hero showcase">
          <img
            src="https://i.pinimg.com/736x/4e/b0/4e/4eb04e88b652e927060d526d1e5da5a8.jpg"
            alt="Ben10 inspired gaming marketplace hero art"
            loading="eager"
            decoding="async"
          />
          <nav className="eld-hero__game-dock" aria-label="Featured game markets">
            {heroGames.map((game) => (
              <Link key={game.slug} href={`/marketplace/${game.slug}`} title={game.title}>
                <span aria-hidden="true">{game.icon}</span>
                <small>{game.title}</small>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

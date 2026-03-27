import { SectionHeading } from "@/components/shared/section-heading";
import { featuredGames } from "@/lib/homepage-data";

export function FeaturedGamesSection() {
  return (
    <section className="section-block section-block--tight">
      <div className="shell">
        <SectionHeading
          eyebrow="Featured Markets"
          title="Game surfaces that feel alive from the first scroll"
          description="Instead of flat placeholders, BEN10 now leans into a marketplace front page with stronger merchandising, bolder hierarchy, and game-led discovery blocks."
        />

        <div className="featured-games-grid">
          {featuredGames.map((game, index) => (
            <article
              key={game.title}
              className={`game-showcase-card game-showcase-card--${index + 1}`}
            >
              <span className="section-eyebrow">{game.eyebrow}</span>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
              <div className="game-showcase-card__metrics">
                {game.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { SectionHeading } from "@/components/shared/section-heading";
import { marketplaceCategories } from "@/lib/homepage-data";

export function CategoryGrid() {
  return (
    <section className="section-block">
      <div className="shell">
        <SectionHeading
          eyebrow="Marketplace Surface"
          title="Six trading verticals, one bold BEN10 identity"
          description="The storefront is structured around the same commercial reality we analyzed: category-led discovery, game-specific funnels, and ranking-aware seller presentation."
        />

        <div className="category-grid">
          {marketplaceCategories.map((category) => (
            <article key={category.title} className="feature-card">
              <span className="feature-card__index">{category.title}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { CategoryGrid } from "@/components/home/category-grid";
import { CompactAboutStrip } from "@/components/home/compact-about-strip";
import { FeaturedGamesSection } from "@/components/home/featured-games-section";
import { HeroSection } from "@/components/home/hero-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturedGamesSection />
      <CategoryGrid />
      <CompactAboutStrip />
    </main>
  );
}

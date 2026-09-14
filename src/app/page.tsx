import { CompactAboutStrip } from "@/components/home/compact-about-strip";
import { HeroSection } from "@/components/home/hero-section";
import { PopularMarketsSection } from "@/components/home/popular-markets-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <PopularMarketsSection />
      <CompactAboutStrip />
    </main>
  );
}

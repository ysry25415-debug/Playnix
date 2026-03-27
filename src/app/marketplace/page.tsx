import { ModulePage } from "@/components/shared/module-page";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function MarketplacePage() {
  return (
    <AuthGuard>
      <ModulePage
        eyebrow="Marketplace Module"
        title="The BEN10 marketplace route is ready for listing feeds, filters, and game pages."
        description="This route will become the buyer-facing browse experience with category navigation, seller ranking, game-specific funnels, and offer detail pages."
      />
    </AuthGuard>
  );
}

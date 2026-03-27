import { ModulePage } from "@/components/shared/module-page";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function SellPage() {
  return (
    <AuthGuard>
      <ModulePage
        eyebrow="Seller Module"
        title="The seller center is staged for onboarding, verification, listings, and payout controls."
        description="This route will host seller registration, category permissions, inventory management, delivery SLAs, and earnings visibility."
      />
    </AuthGuard>
  );
}

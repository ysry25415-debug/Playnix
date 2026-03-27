import { ModulePage } from "@/components/shared/module-page";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function SupportPage() {
  return (
    <AuthGuard>
      <ModulePage
        eyebrow="Support Module"
        title="Protection, disputes, warranty flows, and support operations will live here."
        description="This route will evolve into the operational layer for buyer help, dispute evidence review, refund decisions, and seller compliance support."
      />
    </AuthGuard>
  );
}

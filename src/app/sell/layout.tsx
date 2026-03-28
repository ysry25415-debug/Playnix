import { type ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SellerCenterShell } from "@/components/seller/seller-center-shell";

export default function SellLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole={["seller", "admin"]} unauthorizedRedirectTo="/account">
      <SellerCenterShell
        title="Manage Your BEN10 storefront"
        description="Track orders, publish offers, handle messages, and control how your listings appear in each game market."
      >
        {children}
      </SellerCenterShell>
    </AuthGuard>
  );
}

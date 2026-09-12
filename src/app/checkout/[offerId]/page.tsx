import { AuthGuard } from "@/components/auth/auth-guard";
import { CheckoutView } from "@/components/checkout/checkout-view";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;

  return (
    <AuthGuard requiredRole="customer" unauthorizedRedirectTo="/account">
      <CheckoutView offerId={offerId} />
    </AuthGuard>
  );
}

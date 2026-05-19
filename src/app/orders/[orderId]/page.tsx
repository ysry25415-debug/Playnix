import { Suspense } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { OrderRoom } from "@/components/orders/order-room";
import { PageLoader } from "@/components/shared/page-loader";

export default async function OrderRoomPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <AuthGuard>
      <Suspense
        fallback={
          <PageLoader
            label="Opening delivery room..."
            hint="BEN10 is preparing the live order room and payment state."
          />
        }
      >
        <OrderRoom orderId={orderId} />
      </Suspense>
    </AuthGuard>
  );
}

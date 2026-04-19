import { AuthGuard } from "@/components/auth/auth-guard";
import { OrderRoom } from "@/components/orders/order-room";

export default async function OrderRoomPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <AuthGuard>
      <OrderRoom orderId={orderId} />
    </AuthGuard>
  );
}

import { SellerPublicProfileClientPage } from "@/components/marketplace/seller-public-profile-client-page";
import { SellerPublicProfileView } from "@/components/marketplace/seller-public-profile-view";
import { loadPublicSellerProfile } from "@/lib/public-marketplace";

export default async function SellerPublicProfilePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const data = await loadPublicSellerProfile(sellerId);

  if (data) {
    return <SellerPublicProfileView data={data} />;
  }

  return <SellerPublicProfileClientPage sellerId={sellerId} />;
}

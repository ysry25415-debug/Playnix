import { notFound } from "next/navigation";

import { SellerPublicProfileView } from "@/components/marketplace/seller-public-profile-view";
import { loadPublicSellerProfile } from "@/lib/public-marketplace";

export default async function SellerPublicProfilePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const data = await loadPublicSellerProfile(sellerId);

  if (!data) {
    notFound();
  }

  return <SellerPublicProfileView data={data} />;
}

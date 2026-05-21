import { notFound } from "next/navigation";

import { OfferDetailView } from "@/components/marketplace/offer-detail-view";
import { loadPublicOfferDetails } from "@/lib/public-marketplace";

export default async function MarketplaceOfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const data = await loadPublicOfferDetails(offerId);

  if (!data) {
    notFound();
  }

  return <OfferDetailView data={data} />;
}

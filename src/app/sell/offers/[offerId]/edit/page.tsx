import { OfferEditorForm } from "@/components/seller/offer-editor-form";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;

  return <OfferEditorForm mode="edit" offerId={offerId} />;
}

import { OfferEditorForm } from "@/components/seller/offer-editor-form";

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; category?: string }>;
}) {
  const params = await searchParams;

  return (
    <OfferEditorForm
      mode="create"
      initialGameSlug={params.game}
      initialCategorySlug={params.category}
    />
  );
}

import { type OfferImageRow } from "@/lib/marketplace-types";

export const OFFER_IMAGES_BUCKET = "offer-images";
export const MAX_OFFER_IMAGES = 6;
export const MAX_OFFER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function buildExistingOfferImageKey(imageId: string) {
  return `existing:${imageId}`;
}

export function buildPendingOfferImageKey(imageId: string) {
  return `pending:${imageId}`;
}

export function getPrimaryOfferImage(
  images: OfferImageRow[] | null | undefined
): OfferImageRow | null {
  if (!images?.length) {
    return null;
  }

  return images.find((image) => image.is_primary) ?? images[0] ?? null;
}

export function sanitizeOfferImageFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

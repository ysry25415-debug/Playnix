import { type OfferDeliveryMode } from "@/lib/marketplace-types";

export const offerDeliveryModes: Array<{
  value: OfferDeliveryMode;
  label: string;
  description: string;
}> = [
  {
    value: "instant",
    label: "Instant delivery",
    description: "Buyer receives the delivery details automatically as soon as the purchase is created.",
  },
  {
    value: "chat",
    label: "Delivery through chat",
    description: "Seller and buyer complete the handoff manually through the order chat flow.",
  },
];

export function getOfferDeliveryModeLabel(mode: OfferDeliveryMode) {
  return mode === "instant" ? "Instant delivery" : "Delivery through chat";
}

export function getOfferDeliveryModeDescription(mode: OfferDeliveryMode) {
  return mode === "instant"
    ? "Buyer receives the delivery details automatically after payment is confirmed."
    : "Seller and buyer complete the handoff inside chat after the order is paid.";
}

export type MarketplaceSellerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export async function loadMarketplaceSellerProfiles(sellerIds: string[]) {
  const response = await fetch("/api/marketplace/sellers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sellerIds }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not load seller profiles.");
  }

  return Array.isArray(payload?.sellers) ? (payload.sellers as MarketplaceSellerProfile[]) : [];
}

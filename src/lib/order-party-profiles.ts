export type OrderPartyProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export async function loadOrderPartyProfiles(accessToken: string, orderIds: string[]) {
  const response = await fetch("/api/orders/parties", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ orderIds }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not load order participant details.");
  }

  return Array.isArray(payload?.parties) ? (payload.parties as OrderPartyProfile[]) : [];
}

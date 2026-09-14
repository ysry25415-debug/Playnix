export function isPublicAccountName(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const name = value.trim();
  return name.length > 0 && name.length <= 48 && !name.includes("@");
}

export function getPublicAccountName(value: unknown, fallback = "Player") {
  return isPublicAccountName(value) ? value.trim() : fallback;
}

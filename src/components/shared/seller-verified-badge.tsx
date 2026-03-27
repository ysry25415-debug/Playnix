const VERIFIED_BADGE_IMAGE =
  "https://i.pinimg.com/736x/78/fa/94/78fa9438077616f85ba9e31709011e64.jpg";

export function SellerVerifiedBadge() {
  return (
    <span className="seller-verified-badge" title="Verified Seller" aria-label="Verified Seller">
      <img src={VERIFIED_BADGE_IMAGE} alt="Verified seller badge" />
    </span>
  );
}

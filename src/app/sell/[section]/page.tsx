import { notFound } from "next/navigation";

import { SellerSectionPage } from "@/components/seller/seller-section-page";

const sellerSections = {
  boosting: {
    eyebrow: "Boosting Desk",
    title: "Handle boosting requests and rank delivery promises.",
    description:
      "Use this area to review incoming boosting requests, keep delivery promises clear, and separate service work from standard digital item offers.",
    highlights: ["Service request queue", "Rank delivery notes", "Milestone tracking"],
  },
  loyalty: {
    eyebrow: "Seller Loyalty",
    title: "Monitor your seller standing and loyalty progress.",
    description:
      "This section is where BEN10 can reward strong delivery speed, buyer trust, and repeat performance across your storefront.",
    highlights: ["Seller tier progress", "Repeat customer score", "Performance streaks"],
  },
  beta: {
    eyebrow: "BETA Access",
    title: "Try experimental seller tools before general release.",
    description:
      "BETA gives qualified sellers a place to test new merchandising, automation, and insight features before they ship widely.",
    highlights: ["Feature previews", "Early experiments", "Private release notes"],
  },
  wallet: {
    eyebrow: "Wallet Core",
    title: "Review your BEN10 balance, held funds, and payout flow.",
    description:
      "Wallet is the finance surface for payouts, held balance, revenue snapshots, and settlement timing inside the seller center.",
    highlights: ["Available balance", "Held funds", "Payout history"],
  },
  "become-a-seller": {
    eyebrow: "Seller Status",
    title: "Review your seller verification position and market access.",
    description:
      "This page keeps your verification state, market permissions, and next approval steps in one place for clarity.",
    highlights: ["Verification status", "Market permissions", "Compliance checklist"],
  },
  messages: {
    eyebrow: "Messages",
    title: "Stay close to buyers through order and pre-sale messages.",
    description:
      "Messages is where order chat, pre-sale questions, and delivery clarifications can live once the communication layer is expanded.",
    highlights: ["Buyer inbox", "Order conversations", "Response tracking"],
  },
  notifications: {
    eyebrow: "Notifications",
    title: "Track important alerts across your seller operations.",
    description:
      "Notifications helps sellers keep up with new orders, stock issues, review activity, and platform updates from one feed.",
    highlights: ["Order alerts", "Stock reminders", "Platform notices"],
  },
  feedback: {
    eyebrow: "Feedback",
    title: "Watch how buyers rate your storefront and delivery quality.",
    description:
      "Feedback collects public reviews, quality signals, and satisfaction trends so sellers can keep improving.",
    highlights: ["Review highlights", "Quality score", "Customer notes"],
  },
  "account-settings": {
    eyebrow: "Account Settings",
    title: "Control your seller identity, profile details, and preferences.",
    description:
      "Use account settings to manage storefront naming, public profile appearance, and operational preferences.",
    highlights: ["Public profile setup", "Identity controls", "Preference toggles"],
  },
  "view-profile": {
    eyebrow: "Seller Profile",
    title: "Preview how buyers see your public seller profile.",
    description:
      "This view lets you review your seller-facing identity, trust signals, and storefront presentation before customers see it.",
    highlights: ["Public profile preview", "Trust signals", "Brand presentation"],
  },
};

type SellerSectionKey = keyof typeof sellerSections;

export default async function SellerSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const key = section as SellerSectionKey;
  const config = sellerSections[key];

  if (!config) {
    notFound();
  }

  const primaryAction =
    section === "become-a-seller"
      ? { href: "/seller/apply", label: "Open Verification" }
      : section === "account-settings"
        ? { href: "/account", label: "Open Account" }
        : undefined;

  const secondaryAction =
    section === "view-profile" ? { href: "/account", label: "Back To Account" } : undefined;

  return (
    <SellerSectionPage
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      highlights={config.highlights}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    />
  );
}

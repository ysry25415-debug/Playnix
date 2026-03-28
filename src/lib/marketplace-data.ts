export type MarketplaceCategory = {
  slug: string;
  title: string;
  description: string;
};

export type MarketplaceGame = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  categoryTitle: string;
  categories: MarketplaceCategory[];
};

export type SellerCenterItem = {
  href: string;
  label: string;
  isBeta?: boolean;
};

export const marketplaceGames: MarketplaceGame[] = [
  {
    slug: "minecraft",
    title: "Minecraft",
    eyebrow: "Hero Universe",
    description:
      "Accounts, mods, coins, cosmetics, and ready-made progression listings tailored for Minecraft players.",
    categoryTitle: "Minecraft surfaces",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "Full Minecraft accounts, premium setups, and progression-ready access.",
      },
      {
        slug: "items",
        title: "Items",
        description: "Mods, packs, collectibles, skins, and server-friendly content bundles.",
      },
      {
        slug: "services",
        title: "Services",
        description: "Build help, progression services, and account-ready setup assistance.",
      },
    ],
  },
  {
    slug: "roblox",
    title: "Roblox",
    eyebrow: "Digital Trade Lane",
    description:
      "Roblox-only offers grouped by account type, item inventory, and gift card top-up lanes.",
    categoryTitle: "Roblox departments",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "Full Roblox accounts, stacked profiles, and progression-ready logins.",
      },
      {
        slug: "items",
        title: "Items",
        description: "Inventory items, cosmetics, limiteds, and tradable extras.",
      },
      {
        slug: "gift-cards",
        title: "Gift Cards",
        description: "Digital gift cards, top-ups, and balance-ready offers.",
      },
    ],
  },
  {
    slug: "arc-raiders",
    title: "Arc Raiders",
    eyebrow: "Extraction Heat",
    description:
      "Arc Raiders offers across accounts, credits, items, and squad progression services.",
    categoryTitle: "Arc Raiders lanes",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "Ready-made Arc Raiders accounts with progress, unlocks, and strong loadouts.",
      },
      {
        slug: "credits",
        title: "Credits",
        description: "Currency-style listings for credits and progression resources.",
      },
      {
        slug: "boosting",
        title: "Boosting",
        description: "Rank, mission, and squad progression services for Arc Raiders.",
      },
    ],
  },
  {
    slug: "fortnite",
    title: "Fortnite",
    eyebrow: "Hot Listings",
    description:
      "Dedicated Fortnite offers for accounts, bundles, V-Bucks-style surfaces, and cosmetics.",
    categoryTitle: "Fortnite surfaces",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "Fortnite accounts with skins, bundles, and rare cosmetic history.",
      },
      {
        slug: "bundles",
        title: "Bundles",
        description: "Limited sets, cosmetic bundles, and hand-curated loadouts.",
      },
      {
        slug: "gift-cards",
        title: "Gift Cards",
        description: "Digital card offers and top-up style listings for Fortnite buyers.",
      },
    ],
  },
  {
    slug: "valorant",
    title: "Valorant",
    eyebrow: "Ranked Services",
    description:
      "Valorant offers structured around accounts, boosting, and premium skin inventory.",
    categoryTitle: "Valorant sections",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "Ready-to-play Valorant accounts with ranks, skins, and agent progress.",
      },
      {
        slug: "boosting",
        title: "Boosting",
        description: "Rank boosting, placement help, and progression services.",
      },
      {
        slug: "skins",
        title: "Skins",
        description: "Premium skin collections, inventory packs, and cosmetic offers.",
      },
    ],
  },
  {
    slug: "pubg-mobile",
    title: "PUBG Mobile",
    eyebrow: "Battle Royale",
    description:
      "PUBG Mobile offers focused on UC, accounts, skins, and progression-ready listings.",
    categoryTitle: "PUBG Mobile surfaces",
    categories: [
      {
        slug: "accounts",
        title: "Accounts",
        description: "PUBG Mobile accounts with ranks, cosmetics, and full progression.",
      },
      {
        slug: "uc",
        title: "UC",
        description: "Currency offers, top-ups, and account balance-ready listings.",
      },
      {
        slug: "skins",
        title: "Skins",
        description: "Weapon, outfit, and premium cosmetic offers for PUBG Mobile.",
      },
    ],
  },
];

export const sellerCenterNavigation: SellerCenterItem[] = [
  { href: "/sell/orders", label: "Orders" },
  { href: "/sell/offers", label: "Offers" },
  { href: "/sell/boosting", label: "Boosting" },
  { href: "/sell/loyalty", label: "Loyalty" },
  { href: "/sell/beta", label: "BETA", isBeta: true },
  { href: "/sell/wallet", label: "Wallet" },
  { href: "/sell/become-a-seller", label: "Become a Seller" },
  { href: "/sell/messages", label: "Messages" },
  { href: "/sell/notifications", label: "Notifications" },
  { href: "/sell/feedback", label: "Feedback" },
  { href: "/sell/account-settings", label: "Account settings" },
  { href: "/sell/view-profile", label: "View Profile" },
];

export function getMarketplaceGame(slug: string) {
  return marketplaceGames.find((game) => game.slug === slug) ?? null;
}

export type MarketplaceCategory = {
  slug: string;
  title: string;
  description: string;
};

export type MarketplaceGame = {
  slug: string;
  title: string;
  icon: string;
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
    icon: "M",
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
    icon: "R",
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
      {
        slug: "currency",
        title: "Currency",
        description: "Robux and balance-ready currency offers with clear delivery details.",
      },
    ],
  },
  {
    slug: "arc-raiders",
    title: "Arc Raiders",
    icon: "A",
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
    icon: "F",
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
    icon: "V",
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
    icon: "P",
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
  {
    slug: "grand-theft-auto-5",
    title: "Grand Theft Auto 5",
    icon: "V",
    eyebrow: "Open World",
    description: "GTA 5 accounts, money, items, and progression-ready marketplace offers.",
    categoryTitle: "GTA 5 marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "GTA 5 accounts with progress, vehicles, and unlocks." },
      { slug: "currency", title: "Currency", description: "Money and balance-ready GTA 5 offers." },
      { slug: "items", title: "Items", description: "Vehicles, properties, cosmetics, and inventory offers." },
    ],
  },
  {
    slug: "old-school-runescape",
    title: "Old School RuneScape",
    icon: "OS",
    eyebrow: "Classic MMO",
    description: "Old School RuneScape accounts, gold, items, and progression services.",
    categoryTitle: "Old School RuneScape marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "Accounts with skills, quests, and progression." },
      { slug: "currency", title: "Gold", description: "OSRS gold offers with clear delivery details." },
      { slug: "items", title: "Items", description: "Gear, supplies, and tradable item offers." },
    ],
  },
  {
    slug: "rainbow-six-siege-x",
    title: "Rainbow Six Siege X",
    icon: "6",
    eyebrow: "Tactical FPS",
    description: "Rainbow Six Siege X accounts, boosts, and cosmetic inventory offers.",
    categoryTitle: "Rainbow Six Siege X marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "Accounts with ranks, operators, and cosmetics." },
      { slug: "boosting", title: "Boosting", description: "Rank and placement progression services." },
      { slug: "items", title: "Items", description: "Cosmetic and inventory-focused offers." },
    ],
  },
  {
    slug: "league-of-legends",
    title: "League of Legends",
    icon: "L",
    eyebrow: "Ranked MOBA",
    description: "League of Legends accounts, currency, boosting, and skin offers.",
    categoryTitle: "League of Legends marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "Accounts with champions, ranks, and skins." },
      { slug: "currency", title: "Currency", description: "Balance and currency-related listings." },
      { slug: "boosting", title: "Boosting", description: "Ranked and placement support services." },
    ],
  },
  {
    slug: "pokemon-go",
    title: "Pokemon Go",
    icon: "GO",
    eyebrow: "Mobile Collection",
    description: "Pokemon Go accounts, collectibles, and progression support offers.",
    categoryTitle: "Pokemon Go marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "Accounts with collections and progression." },
      { slug: "items", title: "Items", description: "Collection and inventory-oriented offers." },
      { slug: "boosting", title: "Boosting", description: "Progression and account-development services." },
    ],
  },
  {
    slug: "clash-of-clans",
    title: "Clash of Clans",
    icon: "C",
    eyebrow: "Strategy Mobile",
    description: "Clash of Clans accounts, boosting, and item-oriented marketplace offers.",
    categoryTitle: "Clash of Clans marketplace",
    categories: [
      { slug: "accounts", title: "Accounts", description: "Village accounts with clear progression details." },
      { slug: "boosting", title: "Boosting", description: "Progression and upgrade support services." },
      { slug: "items", title: "Items", description: "Inventory and cosmetic-oriented offers." },
    ],
  },
  {
    slug: "donut-smp",
    title: "DonutSMP",
    icon: "D",
    eyebrow: "Minecraft Server",
    description: "DonutSMP money, accounts, and item offers in one dedicated market.",
    categoryTitle: "DonutSMP marketplace",
    categories: [
      { slug: "currency", title: "Money", description: "DonutSMP money offers with delivery details." },
      { slug: "accounts", title: "Accounts", description: "Accounts with server-ready progress." },
      { slug: "items", title: "Items", description: "Server items and inventory offers." },
    ],
  },
  {
    slug: "blade-ball",
    title: "Blade Ball",
    icon: "B",
    eyebrow: "Roblox Arena",
    description: "Blade Ball tokens, accounts, and item offers in a focused marketplace.",
    categoryTitle: "Blade Ball marketplace",
    categories: [
      { slug: "currency", title: "Tokens", description: "Blade Ball token offers with clear quantities." },
      { slug: "accounts", title: "Accounts", description: "Accounts with progress and inventory." },
      { slug: "items", title: "Items", description: "Weapons, cosmetics, and inventory offers." },
    ],
  },
  {
    slug: "path-of-exile-2",
    title: "Path of Exile 2",
    icon: "P2",
    eyebrow: "Action RPG",
    description: "Path of Exile 2 currency, items, and account progression offers.",
    categoryTitle: "Path of Exile 2 marketplace",
    categories: [
      { slug: "currency", title: "Currency", description: "Currency offers with clear delivery notes." },
      { slug: "items", title: "Items", description: "Build, gear, and crafting item offers." },
      { slug: "accounts", title: "Accounts", description: "Accounts with league and character progress." },
    ],
  },
  {
    slug: "brawl-stars",
    title: "Brawl Stars",
    icon: "BS",
    eyebrow: "Mobile Arena",
    description: "Brawl Stars accounts, boosting, and item-focused offers.",
    categoryTitle: "Brawl Stars marketplace",
    categories: [
      { slug: "boosting", title: "Boosting", description: "Rank and trophy progression services." },
      { slug: "accounts", title: "Accounts", description: "Accounts with brawlers, skins, and progress." },
      { slug: "items", title: "Items", description: "Inventory and cosmetic-oriented offers." },
    ],
  },
  {
    slug: "rocket-league",
    title: "Rocket League",
    icon: "RL",
    eyebrow: "Competitive Sports",
    description: "Rocket League accounts, boosting, and item offers in a dedicated market.",
    categoryTitle: "Rocket League marketplace",
    categories: [
      { slug: "boosting", title: "Boosting", description: "Rank and placement progression services." },
      { slug: "accounts", title: "Accounts", description: "Accounts with rank and inventory details." },
      { slug: "items", title: "Items", description: "Vehicle, decal, and item inventory offers." },
    ],
  },
  {
    slug: "steal-a-brainrot",
    title: "Steal a Brainrot",
    icon: "S",
    eyebrow: "Roblox Trading",
    description: "Steal a Brainrot items, accounts, and currency offers in one market.",
    categoryTitle: "Steal a Brainrot marketplace",
    categories: [
      { slug: "items", title: "Items", description: "Tradable items and inventory offers." },
      { slug: "accounts", title: "Accounts", description: "Accounts with progression and inventory." },
      { slug: "currency", title: "Currency", description: "Currency-related marketplace listings." },
    ],
  },
  {
    slug: "blox-fruits",
    title: "Blox Fruits",
    icon: "BF",
    eyebrow: "Roblox Adventure",
    description: "Blox Fruits items, accounts, and currency offers in a focused market.",
    categoryTitle: "Blox Fruits marketplace",
    categories: [
      { slug: "items", title: "Items", description: "Fruit, inventory, and item offers." },
      { slug: "accounts", title: "Accounts", description: "Accounts with levels, fruits, and progress." },
      { slug: "currency", title: "Currency", description: "Currency and balance-related offers." },
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

import type { CSSProperties } from "react";

import { getMarketplaceGame } from "@/lib/marketplace-data";

type GameOfferVisualProps = {
  gameSlug: string;
  className?: string;
};

type GameVisual = {
  domain: string;
  start: string;
  end: string;
};

const gameVisuals: Record<string, GameVisual> = {
  minecraft: { domain: "minecraft.net", start: "#397b39", end: "#132518" },
  roblox: { domain: "roblox.com", start: "#c9ced4", end: "#232831" },
  "arc-raiders": { domain: "arcraiders.com", start: "#dfa848", end: "#332518" },
  fortnite: { domain: "fortnite.com", start: "#6377e8", end: "#251b61" },
  valorant: { domain: "playvalorant.com", start: "#ff5967", end: "#511920" },
  "pubg-mobile": { domain: "pubgmobile.com", start: "#e8ac3f", end: "#3b210b" },
  "grand-theft-auto-5": { domain: "rockstargames.com", start: "#68bd8b", end: "#17352a" },
  "old-school-runescape": { domain: "oldschool.runescape.com", start: "#c99c5b", end: "#382616" },
  "rainbow-six-siege-x": { domain: "ubisoft.com", start: "#91acc4", end: "#1d2937" },
  "league-of-legends": { domain: "leagueoflegends.com", start: "#d3ae58", end: "#132846" },
  "pokemon-go": { domain: "pokemongolive.com", start: "#62ace9", end: "#1b426f" },
  "clash-of-clans": { domain: "clashofclans.com", start: "#ef9256", end: "#57251d" },
  "donut-smp": { domain: "minecraft.net", start: "#e69a58", end: "#55261e" },
  "blade-ball": { domain: "roblox.com", start: "#eb616b", end: "#481c36" },
  "path-of-exile-2": { domain: "pathofexile.com", start: "#b95845", end: "#321712" },
  "brawl-stars": { domain: "brawlstars.com", start: "#f7c64e", end: "#78331a" },
  "rocket-league": { domain: "rocketleague.com", start: "#55a8e8", end: "#172e5d" },
  "steal-a-brainrot": { domain: "roblox.com", start: "#a278e8", end: "#301e52" },
  "blox-fruits": { domain: "roblox.com", start: "#55b9dc", end: "#173f65" },
};

const fallbackVisual: GameVisual = { domain: "ben10.market", start: "#75d97b", end: "#15341c" };

export function getGameThumbnailUrl(gameSlug: string) {
  const visual = gameVisuals[gameSlug] ?? fallbackVisual;

  return `https://www.google.com/s2/favicons?domain=${visual.domain}&sz=128`;
}

export function GameOfferVisual({ gameSlug, className = "" }: GameOfferVisualProps) {
  const game = getMarketplaceGame(gameSlug);
  const visual = gameVisuals[gameSlug] ?? fallbackVisual;
  const gameTitle = game?.title ?? gameSlug.replaceAll("-", " ");
  const style = {
    "--game-offer-visual-start": visual.start,
    "--game-offer-visual-end": visual.end,
  } as CSSProperties;

  return (
    <div className={`game-offer-visual ${className}`.trim()} style={style}>
      <img
        className="game-offer-visual__icon"
        src={getGameThumbnailUrl(gameSlug)}
        alt={`${gameTitle} icon`}
      />
      <span className="game-offer-visual__title">{gameTitle}</span>
    </div>
  );
}

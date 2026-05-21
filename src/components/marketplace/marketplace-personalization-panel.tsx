"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { type MarketplaceGame } from "@/lib/marketplace-data";

type MarketplacePersonalizationPanelProps = {
  games: MarketplaceGame[];
};

type RecentLane = {
  slug: string;
  title: string;
  categoryTitle: string;
  href: string;
  savedAt: number;
};

const RECENT_LANES_KEY = "playnix-recent-lanes";
const RECENT_SEARCHES_KEY = "playnix-recent-searches";

function readRecentLanes(allowedSlugs: Set<string>) {
  if (typeof window === "undefined") {
    return [] as RecentLane[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_LANES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is RecentLane => {
        return (
          Boolean(item) &&
          typeof item === "object" &&
          typeof item.slug === "string" &&
          typeof item.title === "string" &&
          typeof item.categoryTitle === "string" &&
          typeof item.href === "string" &&
          typeof item.savedAt === "number" &&
          allowedSlugs.has(item.slug)
        );
      })
      .slice(0, 4);
  } catch {
    return [];
  }
}

function readRecentSearches() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5);
  } catch {
    return [];
  }
}

export function MarketplacePersonalizationPanel({
  games,
}: MarketplacePersonalizationPanelProps) {
  const [recentLanes, setRecentLanes] = useState<RecentLane[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const allowedSlugs = new Set(games.map((game) => game.slug));
    setRecentLanes(readRecentLanes(allowedSlugs));
    setRecentSearches(readRecentSearches());
  }, [games]);

  return (
    <section className="marketplace-return-grid" aria-label="Helpful marketplace shortcuts">
      <article className="marketplace-return-card">
        <span className="section-eyebrow">Pick Up Where You Left Off</span>
        <strong>Recent lanes</strong>
        <p>Bring users back instantly with quick return links to the markets they explored most recently.</p>
        {recentLanes.length > 0 ? (
          <div className="marketplace-return-card__stack">
            {recentLanes.map((lane) => (
              <Link key={lane.href} href={lane.href} className="marketplace-return-link">
                <strong>{lane.title}</strong>
                <span>{lane.categoryTitle}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="marketplace-return-card__empty">
            <strong>No recent market lanes yet.</strong>
            <span>As soon as a user browses a game market, it can appear here for one-tap return access.</span>
          </div>
        )}
      </article>

      <article className="marketplace-return-card">
        <span className="section-eyebrow">Search Memory</span>
        <strong>Recent searches</strong>
        <p>Let customers jump back into the exact game, item type, or seller intent they were already exploring.</p>
        {recentSearches.length > 0 ? (
          <div className="marketplace-return-card__chips">
            {recentSearches.map((query) => (
              <Link
                key={query}
                href={`/marketplace?q=${encodeURIComponent(query)}`}
                className="marketplace-return-chip"
              >
                {query}
              </Link>
            ))}
          </div>
        ) : (
          <div className="marketplace-return-card__empty">
            <strong>No saved searches yet.</strong>
            <span>Recent search intent will appear here after the first few marketplace queries.</span>
          </div>
        )}
      </article>

      <article className="marketplace-return-card">
        <span className="section-eyebrow">Why Users Return</span>
        <strong>Trust loops that keep the marketplace sticky</strong>
        <ul className="marketplace-return-list">
          <li>Protected funds stay controlled until the delivery flow reaches the right checkpoint.</li>
          <li>Live order rooms keep every delivery conversation, confirmation, and dispute path in one place.</li>
          <li>Game-first lanes reduce noise so buyers find relevant offers faster and come back with less friction.</li>
        </ul>
      </article>
    </section>
  );
}

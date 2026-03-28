"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getMarketplaceGame, marketplaceGames } from "@/lib/marketplace-data";
import { type OfferRow, type OfferStatus } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

type OfferEditorFormProps = {
  mode: "create" | "edit";
  offerId?: string;
  initialGameSlug?: string;
  initialCategorySlug?: string;
};

const offerStatuses: OfferStatus[] = ["draft", "active", "paused", "sold_out"];

export function OfferEditorForm({
  mode,
  offerId,
  initialGameSlug,
  initialCategorySlug,
}: OfferEditorFormProps) {
  const router = useRouter();
  const [gameSlug, setGameSlug] = useState(initialGameSlug ?? marketplaceGames[0].slug);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug ?? marketplaceGames[0].categories[0].slug);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("10");
  const [deliveryTime, setDeliveryTime] = useState("Instant delivery");
  const [stockCount, setStockCount] = useState("1");
  const [status, setStatus] = useState<OfferStatus>("active");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeGame = useMemo(() => getMarketplaceGame(gameSlug) ?? marketplaceGames[0], [gameSlug]);

  useEffect(() => {
    if (!activeGame.categories.find((category) => category.slug === categorySlug)) {
      setCategorySlug(activeGame.categories[0].slug);
    }
  }, [activeGame, categorySlug]);

  useEffect(() => {
    if (mode !== "edit" || !offerId) {
      return;
    }

    let isMounted = true;

    async function loadOffer() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user || !isMounted) {
        setIsLoading(false);
        return;
      }

      const { data, error: offerError } = await supabase
        .from("offers")
        .select(
          "id,seller_id,game_slug,category_slug,title,description,price_usd,delivery_time,stock_count,status,created_at,updated_at"
        )
        .eq("id", offerId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (offerError || !data) {
        setError(offerError?.message ?? "Offer not found.");
        setIsLoading(false);
        return;
      }

      const offer = data as OfferRow;
      setGameSlug(offer.game_slug);
      setCategorySlug(offer.category_slug);
      setTitle(offer.title);
      setDescription(offer.description);
      setPriceUsd(String(offer.price_usd));
      setDeliveryTime(offer.delivery_time);
      setStockCount(String(offer.stock_count));
      setStatus(offer.status);
      setIsLoading(false);
    }

    void loadOffer();

    return () => {
      isMounted = false;
    };
  }, [mode, offerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsedPrice = Number(priceUsd);
    const parsedStock = Number(stockCount);

    if (!title.trim() || !description.trim()) {
      setError("Please enter a title and description.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 1) {
      setError("Stock must be at least 1.");
      return;
    }

    setIsSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setIsSubmitting(false);
      setError("Please log in again.");
      return;
    }

    const payload = {
      seller_id: user.id,
      game_slug: gameSlug,
      category_slug: categorySlug,
      title: title.trim(),
      description: description.trim(),
      price_usd: parsedPrice,
      delivery_time: deliveryTime.trim() || "Instant delivery",
      stock_count: parsedStock,
      status,
    };

    if (mode === "create") {
      const { error: insertError } = await supabase.from("offers").insert(payload);

      setIsSubmitting(false);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push("/sell/offers");
      router.refresh();
      return;
    }

    const { error: updateError } = await supabase
      .from("offers")
      .update(payload)
      .eq("id", offerId)
      .eq("seller_id", user.id);

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Offer updated successfully.");
    router.refresh();
  }

  return (
    <div className="seller-module">
      <span className="section-eyebrow">{mode === "create" ? "New Offer" : "Edit Offer"}</span>
      <h2>
        {mode === "create"
          ? "Place a new offer exactly where buyers expect it."
          : "Update your offer details and marketplace placement."}
      </h2>
      <p>
        Choose the game, section, price, stock, and delivery language. This determines exactly where
        your listing appears on the buyer-facing marketplace.
      </p>

      {isLoading ? (
        <p>Loading offer...</p>
      ) : (
        <form className="auth-form seller-offer-form" onSubmit={handleSubmit}>
          <label htmlFor="offer-game">Game</label>
          <select
            id="offer-game"
            value={gameSlug}
            onChange={(event) => setGameSlug(event.target.value)}
          >
            {marketplaceGames.map((game) => (
              <option key={game.slug} value={game.slug}>
                {game.title}
              </option>
            ))}
          </select>

          <label htmlFor="offer-category">Category placement</label>
          <select
            id="offer-category"
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
          >
            {activeGame.categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.title}
              </option>
            ))}
          </select>

          <label htmlFor="offer-title">Offer title</label>
          <input
            id="offer-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Stacked Roblox account with rare items"
          />

          <label htmlFor="offer-description">Description</label>
          <textarea
            id="offer-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Explain exactly what the buyer receives."
          />

          <div className="seller-form-grid">
            <div>
              <label htmlFor="offer-price">Price (USD)</label>
              <input
                id="offer-price"
                type="number"
                min="1"
                step="0.01"
                value={priceUsd}
                onChange={(event) => setPriceUsd(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="offer-stock">Stock</label>
              <input
                id="offer-stock"
                type="number"
                min="1"
                step="1"
                value={stockCount}
                onChange={(event) => setStockCount(event.target.value)}
              />
            </div>
          </div>

          <div className="seller-form-grid">
            <div>
              <label htmlFor="offer-delivery">Delivery time</label>
              <input
                id="offer-delivery"
                type="text"
                value={deliveryTime}
                onChange={(event) => setDeliveryTime(event.target.value)}
                placeholder="Example: Within 10 minutes"
              />
            </div>
            <div>
              <label htmlFor="offer-status">Status</label>
              <select
                id="offer-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as OfferStatus)}
              >
                {offerStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
          {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Publish Offer" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

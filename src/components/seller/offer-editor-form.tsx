"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  buildExistingOfferImageKey,
  buildPendingOfferImageKey,
  MAX_OFFER_IMAGES,
  MAX_OFFER_IMAGE_SIZE_BYTES,
  OFFER_IMAGES_BUCKET,
  sanitizeOfferImageFileName,
} from "@/lib/offer-images";
import {
  getOfferDeliveryModeDescription,
  getOfferDeliveryModeLabel,
  offerDeliveryModes,
} from "@/lib/offer-delivery";
import { getMarketplaceGame, marketplaceGames } from "@/lib/marketplace-data";
import {
  type OfferDeliveryMode,
  type OfferImageRow,
  type OfferRow,
  type OfferStatus,
} from "@/lib/marketplace-types";
import { triggerPageLoader } from "@/lib/page-loader-events";
import { supabase } from "@/lib/supabase-client";

type OfferEditorFormProps = {
  mode: "create" | "edit";
  offerId?: string;
  initialGameSlug?: string;
  initialCategorySlug?: string;
};

type PendingOfferImage = {
  key: string;
  file: File;
  previewUrl: string;
};

const offerStatuses: OfferStatus[] = ["draft", "active", "paused", "sold_out"];

function resolvePrimaryImageKey(
  currentKey: string | null,
  existingImages: OfferImageRow[],
  pendingImages: PendingOfferImage[]
) {
  const allKeys = [
    ...existingImages.map((image) => buildExistingOfferImageKey(image.id)),
    ...pendingImages.map((image) => image.key),
  ];

  if (allKeys.length === 0) {
    return null;
  }

  return currentKey && allKeys.includes(currentKey) ? currentKey : allKeys[0];
}

function revokePendingPreview(image: PendingOfferImage) {
  URL.revokeObjectURL(image.previewUrl);
}

export function OfferEditorForm({
  mode,
  offerId,
  initialGameSlug,
  initialCategorySlug,
}: OfferEditorFormProps) {
  const router = useRouter();
  const [gameSlug, setGameSlug] = useState(initialGameSlug ?? marketplaceGames[0].slug);
  const [categorySlug, setCategorySlug] = useState(
    initialCategorySlug ?? marketplaceGames[0].categories[0].slug
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("10");
  const [deliveryMode, setDeliveryMode] = useState<OfferDeliveryMode>("chat");
  const [deliveryTime, setDeliveryTime] = useState("Within 10 minutes");
  const [instantDeliveryContent, setInstantDeliveryContent] = useState("");
  const [stockCount, setStockCount] = useState("1");
  const [status, setStatus] = useState<OfferStatus>("active");
  const [existingImages, setExistingImages] = useState<OfferImageRow[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingOfferImage[]>([]);
  const [removedExistingImages, setRemovedExistingImages] = useState<OfferImageRow[]>([]);
  const [primaryImageKey, setPrimaryImageKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingImagesRef = useRef<PendingOfferImage[]>([]);

  const activeGame = useMemo(() => getMarketplaceGame(gameSlug) ?? marketplaceGames[0], [gameSlug]);
  const totalImageCount = existingImages.length + pendingImages.length;
  const deliveryTimePlaceholder =
    deliveryMode === "instant" ? "Example: Instant delivery" : "Example: Within 10 minutes";

  const imageCards = useMemo(() => {
    return [
      ...existingImages.map((image) => ({
        key: buildExistingOfferImageKey(image.id),
        previewUrl: image.public_url,
        isPrimary: primaryImageKey === buildExistingOfferImageKey(image.id),
        isPending: false,
      })),
      ...pendingImages.map((image) => ({
        key: image.key,
        previewUrl: image.previewUrl,
        isPrimary: primaryImageKey === image.key,
        isPending: true,
      })),
    ];
  }, [existingImages, pendingImages, primaryImageKey]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach(revokePendingPreview);
    };
  }, []);

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
      setError("");
      setSuccess("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user || !isMounted) {
        setIsLoading(false);
        return;
      }

      const { data, error: offerError } = await supabase
        .from("offers")
        .select(
          "id,seller_id,game_slug,category_slug,title,description,price_usd,delivery_mode,delivery_time,stock_count,status,created_at,updated_at"
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

      const { data: imagesData, error: imagesError } = await supabase
        .from("offer_images")
        .select("id,offer_id,seller_id,storage_path,public_url,is_primary,sort_order,created_at")
        .eq("offer_id", offerId)
        .eq("seller_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      const { data: privateDeliveryData, error: privateDeliveryError } = await supabase
        .from("offer_private_deliveries")
        .select("delivery_content")
        .eq("offer_id", offerId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (imagesError) {
        setError(imagesError.message);
        setIsLoading(false);
        return;
      }

      if (privateDeliveryError) {
        setError(privateDeliveryError.message);
        setIsLoading(false);
        return;
      }

      const offer = data as OfferRow;
      const offerImages = (imagesData ?? []) as OfferImageRow[];
      const primaryExistingImage = offerImages.find((image) => image.is_primary) ?? offerImages[0] ?? null;

      pendingImagesRef.current.forEach(revokePendingPreview);
      pendingImagesRef.current = [];

      setGameSlug(offer.game_slug);
      setCategorySlug(offer.category_slug);
      setTitle(offer.title);
      setDescription(offer.description);
      setPriceUsd(String(offer.price_usd));
      setDeliveryMode(offer.delivery_mode);
      setDeliveryTime(offer.delivery_time);
      setInstantDeliveryContent(privateDeliveryData?.delivery_content ?? "");
      setStockCount(String(offer.stock_count));
      setStatus(offer.status);
      setExistingImages(offerImages);
      setPendingImages([]);
      setRemovedExistingImages([]);
      setPrimaryImageKey(
        primaryExistingImage ? buildExistingOfferImageKey(primaryExistingImage.id) : null
      );
      setIsLoading(false);
    }

    void loadOffer();

    return () => {
      isMounted = false;
    };
  }, [mode, offerId]);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_OFFER_IMAGES - totalImageCount;
    if (remainingSlots <= 0) {
      setError(`You can upload up to ${MAX_OFFER_IMAGES} images per offer.`);
      return;
    }

    const acceptedImages: PendingOfferImage[] = [];
    const notices: string[] = [];

    files.slice(0, remainingSlots).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        notices.push(`${file.name} is not an image file.`);
        return;
      }

      if (file.size > MAX_OFFER_IMAGE_SIZE_BYTES) {
        notices.push(`${file.name} is larger than 5 MB.`);
        return;
      }

      acceptedImages.push({
        key: buildPendingOfferImageKey(crypto.randomUUID()),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (files.length > remainingSlots) {
      notices.push(`Only ${remainingSlots} more image slots were available.`);
    }

    if (acceptedImages.length === 0) {
      setError(notices[0] ?? "Please choose valid product images.");
      return;
    }

    const nextPendingImages = [...pendingImages, ...acceptedImages];
    setPendingImages(nextPendingImages);
    setPrimaryImageKey(resolvePrimaryImageKey(primaryImageKey, existingImages, nextPendingImages));
    setSuccess("");
    setError(notices.join(" "));
  }

  function handleRemoveExistingImage(imageId: string) {
    const image = existingImages.find((item) => item.id === imageId);
    if (!image) {
      return;
    }

    const nextExistingImages = existingImages.filter((item) => item.id !== imageId);
    setExistingImages(nextExistingImages);
    setRemovedExistingImages([...removedExistingImages, image]);
    setPrimaryImageKey(
      resolvePrimaryImageKey(
        primaryImageKey === buildExistingOfferImageKey(imageId) ? null : primaryImageKey,
        nextExistingImages,
        pendingImages
      )
    );
  }

  function handleRemovePendingImage(imageKey: string) {
    const image = pendingImages.find((item) => item.key === imageKey);
    if (!image) {
      return;
    }

    revokePendingPreview(image);
    const nextPendingImages = pendingImages.filter((item) => item.key !== imageKey);
    setPendingImages(nextPendingImages);
    setPrimaryImageKey(
      resolvePrimaryImageKey(
        primaryImageKey === imageKey ? null : primaryImageKey,
        existingImages,
        nextPendingImages
      )
    );
  }

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

    if (deliveryMode === "instant" && !instantDeliveryContent.trim()) {
      setError("Please add the delivery details that unlock after purchase.");
      return;
    }

    if (totalImageCount === 0) {
      setError("Please upload at least one product image.");
      return;
    }

    const selectedPrimaryKey = resolvePrimaryImageKey(primaryImageKey, existingImages, pendingImages);
    if (!selectedPrimaryKey) {
      setError("Choose a main image for this offer.");
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

    const nextOfferId = offerId ?? crypto.randomUUID();
    const basePayload = {
      seller_id: user.id,
      game_slug: gameSlug,
      category_slug: categorySlug,
      title: title.trim(),
      description: description.trim(),
      price_usd: parsedPrice,
      delivery_mode: deliveryMode,
      delivery_time:
        deliveryTime.trim() || (deliveryMode === "instant" ? "Instant delivery" : "Within 10 minutes"),
      stock_count: parsedStock,
      status,
    };

    const createdStoragePaths: string[] = [];
    const createdImageIds: string[] = [];
    const insertedImageEntries: Array<{ key: string; row: OfferImageRow }> = [];
    let offerWasCreated = false;

    try {
      if (mode === "create") {
        const { error: insertError } = await supabase.from("offers").insert({
          id: nextOfferId,
          ...basePayload,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        offerWasCreated = true;
      } else {
        const { error: updateError } = await supabase
          .from("offers")
          .update(basePayload)
          .eq("id", nextOfferId)
          .eq("seller_id", user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      if (deliveryMode === "instant") {
        const { error: deliverySaveError } = await supabase.from("offer_private_deliveries").upsert(
          {
            offer_id: nextOfferId,
            seller_id: user.id,
            delivery_content: instantDeliveryContent.trim(),
          },
          {
            onConflict: "offer_id",
          }
        );

        if (deliverySaveError) {
          throw new Error(deliverySaveError.message);
        }
      } else {
        const { error: deliveryDeleteError } = await supabase
          .from("offer_private_deliveries")
          .delete()
          .eq("offer_id", nextOfferId)
          .eq("seller_id", user.id);

        if (deliveryDeleteError) {
          throw new Error(deliveryDeleteError.message);
        }
      }

      for (const pendingImage of pendingImages) {
        const imagePath = `${user.id}/${nextOfferId}/${crypto.randomUUID()}-${sanitizeOfferImageFileName(
          pendingImage.file.name
        )}`;

        const { error: uploadError } = await supabase.storage
          .from(OFFER_IMAGES_BUCKET)
          .upload(imagePath, pendingImage.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: pendingImage.file.type,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        createdStoragePaths.push(imagePath);

        const publicUrl = supabase.storage.from(OFFER_IMAGES_BUCKET).getPublicUrl(imagePath).data.publicUrl;
        const { data: imageRow, error: insertImageError } = await supabase
          .from("offer_images")
          .insert({
            offer_id: nextOfferId,
            seller_id: user.id,
            storage_path: imagePath,
            public_url: publicUrl,
            is_primary: false,
            sort_order: 0,
          })
          .select("id,offer_id,seller_id,storage_path,public_url,is_primary,sort_order,created_at")
          .single();

        if (insertImageError || !imageRow) {
          throw new Error(insertImageError?.message ?? "Could not save uploaded image.");
        }

        const typedImageRow = imageRow as OfferImageRow;
        createdImageIds.push(typedImageRow.id);
        insertedImageEntries.push({ key: pendingImage.key, row: typedImageRow });
      }

      const finalImageEntries = [
        ...existingImages.map((image) => ({
          key: buildExistingOfferImageKey(image.id),
          row: image,
        })),
        ...insertedImageEntries,
      ];

      const selectedPrimaryImage =
        finalImageEntries.find((entry) => entry.key === selectedPrimaryKey) ?? finalImageEntries[0];

      if (!selectedPrimaryImage) {
        throw new Error("Please keep at least one image on the offer.");
      }

      const { error: resetPrimaryError } = await supabase
        .from("offer_images")
        .update({ is_primary: false })
        .eq("offer_id", nextOfferId)
        .eq("seller_id", user.id);

      if (resetPrimaryError) {
        throw new Error(resetPrimaryError.message);
      }

      const sortResults = await Promise.all(
        finalImageEntries.map((entry, index) =>
          supabase
            .from("offer_images")
            .update({ sort_order: index })
            .eq("id", entry.row.id)
            .eq("seller_id", user.id)
        )
      );

      const sortError = sortResults.find((result) => result.error)?.error;
      if (sortError) {
        throw new Error(sortError.message);
      }

      const { error: setPrimaryError } = await supabase
        .from("offer_images")
        .update({ is_primary: true })
        .eq("id", selectedPrimaryImage.row.id)
        .eq("seller_id", user.id);

      if (setPrimaryError) {
        throw new Error(setPrimaryError.message);
      }

      if (removedExistingImages.length > 0) {
        const removedImageIds = removedExistingImages.map((image) => image.id);
        const removedStoragePaths = removedExistingImages.map((image) => image.storage_path);

        const { error: deleteRowsError } = await supabase
          .from("offer_images")
          .delete()
          .eq("seller_id", user.id)
          .in("id", removedImageIds);

        if (deleteRowsError) {
          throw new Error(deleteRowsError.message);
        }

        const { error: deleteStorageError } = await supabase.storage
          .from(OFFER_IMAGES_BUCKET)
          .remove(removedStoragePaths);

        if (deleteStorageError) {
          console.error("Offer image files could not be fully removed.", deleteStorageError);
        }
      }

      pendingImages.forEach(revokePendingPreview);
      pendingImagesRef.current = [];

      const finalImages = finalImageEntries.map((entry, index) => ({
        ...entry.row,
        is_primary: entry.row.id === selectedPrimaryImage.row.id,
        sort_order: index,
      }));

      if (mode === "create") {
        setPendingImages([]);
        triggerPageLoader();
        router.push("/sell/offers");
        router.refresh();
        return;
      }

      setExistingImages(finalImages);
      setPendingImages([]);
      setRemovedExistingImages([]);
      setPrimaryImageKey(buildExistingOfferImageKey(selectedPrimaryImage.row.id));
      setSuccess("Offer updated successfully.");
      router.refresh();
    } catch (submitError) {
      if (mode === "create" && offerWasCreated) {
        if (createdImageIds.length > 0) {
          await supabase.from("offer_images").delete().eq("seller_id", user.id).in("id", createdImageIds);
        }

        if (createdStoragePaths.length > 0) {
          await supabase.storage.from(OFFER_IMAGES_BUCKET).remove(createdStoragePaths);
        }

        await supabase.from("offers").delete().eq("id", nextOfferId).eq("seller_id", user.id);
      }

      setError(
        submitError instanceof Error ? submitError.message : "Could not save this offer right now."
      );
    } finally {
      setIsSubmitting(false);
    }
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
        Choose the game, section, delivery style, price, stock, and product gallery. Your main
        image becomes the preview customers see first.
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

          <fieldset className="seller-delivery-mode">
            <legend>Delivery type</legend>
            <div className="seller-delivery-mode__options">
              {offerDeliveryModes.map((option) => (
                <label
                  key={option.value}
                  className={
                    deliveryMode === option.value
                      ? "seller-delivery-mode__option seller-delivery-mode__option--active"
                      : "seller-delivery-mode__option"
                  }
                >
                  <input
                    type="radio"
                    name="offer-delivery-mode"
                    value={option.value}
                    checked={deliveryMode === option.value}
                    onChange={(event) => setDeliveryMode(event.target.value as OfferDeliveryMode)}
                  />

                  <div>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

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
                placeholder={deliveryTimePlaceholder}
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

          {deliveryMode === "instant" ? (
            <div className="seller-delivery-secret">
              <label htmlFor="offer-delivery-secret">Delivery details shown after purchase</label>
              <textarea
                id="offer-delivery-secret"
                rows={6}
                value={instantDeliveryContent}
                onChange={(event) => setInstantDeliveryContent(event.target.value)}
                placeholder="Example: Login email: ... Password: ... Recovery code: ..."
              />
              <p>
                This content stays hidden from the public marketplace and only unlocks after the
                buyer creates the order.
              </p>
            </div>
          ) : (
            <div className="seller-delivery-secret seller-delivery-secret--info">
              <strong>{getOfferDeliveryModeLabel(deliveryMode)}</strong>
              <p>{getOfferDeliveryModeDescription(deliveryMode)}</p>
            </div>
          )}

          <div className="seller-offer-images">
            <div className="seller-offer-images__copy">
              <label htmlFor="offer-images">Offer images</label>
              <span>
                Upload up to {MAX_OFFER_IMAGES} images. Pick one main image to be the customer-facing
                thumbnail.
              </span>
            </div>

            <input
              id="offer-images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleImageSelection}
            />

            <div className="seller-offer-images__status">
              <span>{totalImageCount} image(s) selected</span>
              <span>Main image appears first for customers.</span>
            </div>

            {imageCards.length === 0 ? (
              <div className="seller-offer-images__empty">
                <strong>No images yet.</strong>
                <span>Add at least one product image before publishing this offer.</span>
              </div>
            ) : (
              <div className="seller-offer-image-grid">
                {imageCards.map((image, index) => (
                  <article
                    key={image.key}
                    className={
                      image.isPrimary
                        ? "seller-offer-image-card seller-offer-image-card--primary"
                        : "seller-offer-image-card"
                    }
                  >
                    <img
                      className="seller-offer-image-card__preview"
                      src={image.previewUrl}
                      alt={`${title || "Offer"} preview ${index + 1}`}
                    />

                    <div className="seller-offer-image-card__meta">
                      <div>
                        <strong>{image.isPrimary ? "Main image" : `Image ${index + 1}`}</strong>
                        <span>{image.isPending ? "Ready to upload" : "Saved on this offer"}</span>
                      </div>

                      {image.isPrimary ? (
                        <span className="seller-offer-image-card__badge">Main</span>
                      ) : null}
                    </div>

                    <div className="seller-offer-image-card__actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setPrimaryImageKey(image.key)}
                      >
                        {image.isPrimary ? "Selected" : "Set as Main"}
                      </button>

                      <button
                        className="ghost-button seller-list__delete"
                        type="button"
                        onClick={() =>
                          image.isPending
                            ? handleRemovePendingImage(image.key)
                            : handleRemoveExistingImage(image.key.replace("existing:", ""))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
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

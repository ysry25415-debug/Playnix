"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type User } from "@supabase/supabase-js";

import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase-client";

const MAX_AVATAR_UPLOAD_MB = 5;
type UserRole = "customer" | "seller" | "admin";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Invalid image data."));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });
}

async function buildOptimizedAvatarDataUrl(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromSource(rawDataUrl);

  const maxDimension = 512;
  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return rawDataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/webp", 0.9);
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("customer");

  const avatarFallback = useMemo(() => {
    if (!displayName.trim()) return "P";
    return displayName.trim().slice(0, 1).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        if (isMounted) setRole("customer");
        return;
      }

      const response = await fetch("/api/me/role", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!isMounted) return;

      if (!response.ok) {
        setRole("customer");
        return;
      }

      const payload = await response.json().catch(() => null);
      const currentRole = payload?.role;
      if (currentRole === "admin" || currentRole === "seller" || currentRole === "customer") {
        setRole(currentRole);
      } else {
        setRole("customer");
      }
    }

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user ?? null;

      if (!isMounted) return;

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      const metadataName = currentUser.user_metadata?.display_name;
      const metadataAvatar = currentUser.user_metadata?.avatar_url;

      setDisplayName(
        typeof metadataName === "string" && metadataName.trim()
          ? metadataName.trim()
          : (currentUser.email?.split("@")[0] ?? "Player")
      );
      setAvatarUrl(typeof metadataAvatar === "string" ? metadataAvatar : "");
      await loadRole();

      setIsLoading(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_UPLOAD_MB * 1024 * 1024) {
      setError(`Image is too large. Please use a file up to ${MAX_AVATAR_UPLOAD_MB}MB.`);
      event.target.value = "";
      return;
    }

    setIsProcessingAvatar(true);

    try {
      const optimizedAvatar = await buildOptimizedAvatarDataUrl(file);
      setAvatarUrl(optimizedAvatar);
      setSuccess("Avatar selected. Click Save changes to apply it.");
    } catch (_error) {
      setError("Could not process this image. Try another file.");
    } finally {
      setIsProcessingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Please log in first.");
      return;
    }

    const trimmedName = displayName.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (!trimmedName) {
      setError("Please enter an account name.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        display_name: trimmedName,
        avatar_url: trimmedAvatar || null,
      },
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUser(data.user ?? user);
    setSuccess("Profile updated successfully.");
  }

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          {isLoading ? (
            <section className="auth-card">
              <h1>Loading account...</h1>
            </section>
          ) : (
            <section className="auth-card account-card">
              <h1>Your account</h1>
              <p>Customize your display name and avatar image.</p>

              <div className="account-preview">
                <span className="account-preview__avatar" aria-hidden="true">
                  {avatarUrl.trim() ? <img src={avatarUrl.trim()} alt="" /> : avatarFallback}
                </span>
                <div className="account-preview__copy">
                  <strong>{displayName || "Player"}</strong>
                  <span>{user?.email}</span>
                </div>
                <span className="account-role-badge">{role}</span>
              </div>

              <form className="auth-form" onSubmit={handleSave}>
                <label htmlFor="account-display-name">Account name</label>
                <input
                  id="account-display-name"
                  name="display-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your account name"
                />

                <label htmlFor="account-avatar-file">Upload avatar from device</label>
                <input
                  id="account-avatar-file"
                  name="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                />
                <p className="account-hint">Supported images up to {MAX_AVATAR_UPLOAD_MB}MB.</p>

                <label htmlFor="account-avatar-url">Or avatar image URL</label>
                <input
                  id="account-avatar-url"
                  name="avatar-url"
                  type="url"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://..."
                />

                {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
                {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

                <button
                  className="primary-button auth-submit"
                  type="submit"
                  disabled={isSaving || isProcessingAvatar}
                >
                  {isSaving ? "Saving..." : isProcessingAvatar ? "Processing image..." : "Save changes"}
                </button>
              </form>

              <p className="auth-switch">
                {role === "customer" ? (
                  <>
                    Want to sell? <Link href="/seller/apply">Join sellers</Link>.
                    <br />
                  </>
                ) : null}
                {role === "admin" ? (
                  <>
                    Open <Link href="/admin/verification">Admin review</Link>.
                    <br />
                  </>
                ) : null}
                Back to <Link href="/">Home</Link>
              </p>
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

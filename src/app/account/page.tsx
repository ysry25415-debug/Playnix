"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase-client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const avatarFallback = useMemo(() => {
    if (!displayName.trim()) return "P";
    return displayName.trim().slice(0, 1).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user ?? null;

      if (!isMounted) return;

      if (!currentUser) {
        router.replace("/auth/login");
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
      setIsLoading(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

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

  if (isLoading) {
    return (
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card">
            <h1>Loading account...</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="shell">
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

            <label htmlFor="account-avatar-url">Avatar image URL</label>
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

            <button className="primary-button auth-submit" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </form>

          <p className="auth-switch">
            Back to <Link href="/">Home</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase-client";

type DisputeItem = {
  room: {
    order_id: string;
    room_status: string;
    payment_status: string;
    resolution_status: string;
    buyer_disputed_at: string | null;
    resolution_note: string | null;
  };
  order: {
    id: string;
    offer_title: string;
    game_slug: string;
    category_slug: string;
    price_usd: number;
    status: string;
    delivery_mode: string;
    created_at: string;
  } | null;
  buyerProfile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  sellerProfile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function AdminDisputesPage() {
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadDisputes() {
    setError("");
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("You need to log in first.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/admin/disputes/pending", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error ?? "Could not load disputes.");
      setIsLoading(false);
      return;
    }

    setItems(Array.isArray(payload?.items) ? payload.items : []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadDisputes();
  }, []);

  async function review(orderId: string, decision: "seller" | "buyer") {
    setActionLoadingId(orderId);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("You need to log in first.");
      setActionLoadingId(null);
      return;
    }

    const response = await fetch("/api/admin/disputes/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        orderId,
        decision,
        note: noteMap[orderId] ?? "",
      }),
    });

    const payload = await response.json().catch(() => null);
    setActionLoadingId(null);

    if (!response.ok) {
      setError(payload?.error ?? "Could not resolve dispute.");
      return;
    }

    setItems((current) => current.filter((item) => item.room.order_id !== orderId));
  }

  return (
    <AuthGuard requiredRole="admin" unauthorizedRedirectTo="/account">
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card admin-review-card">
            <h1>Order Disputes</h1>
            <p>Held funds stay here until an admin resolves whether the seller or buyer is right.</p>

            <div className="admin-tabs">
              <button type="button" className="ghost-button admin-refresh-button" onClick={() => loadDisputes()}>
                Refresh
              </button>
              <Link className="ghost-button admin-refresh-button" href="/admin/verification">
                Verification
              </Link>
            </div>

            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

            {isLoading ? (
              <p>Loading disputes...</p>
            ) : items.length === 0 ? (
              <p className="auth-feedback auth-feedback--success">No disputed orders right now.</p>
            ) : (
              <div className="admin-review-list">
                {items.map((item) => (
                  <article key={item.room.order_id} className="admin-review-item">
                    <div className="admin-review-item__head">
                      <strong>{item.order?.offer_title || "Unknown order"}</strong>
                      <span>
                        Buyer: {item.buyerProfile?.full_name || item.order?.id || "Unknown buyer"}
                      </span>
                      <span>Seller: {item.sellerProfile?.full_name || "Unknown seller"}</span>
                      <span>Status: {item.room.room_status}</span>
                      <span>Funds: {item.room.payment_status}</span>
                      <span>Disputed: {item.room.buyer_disputed_at ? new Date(item.room.buyer_disputed_at).toLocaleString() : "Unknown"}</span>
                    </div>

                    <div className="order-room__banner">
                      <strong>
                        {item.order?.game_slug} / {item.order?.category_slug}
                      </strong>
                      <span>${item.order?.price_usd?.toFixed(2) ?? "0.00"}</span>
                    </div>

                    <label htmlFor={`dispute-note-${item.room.order_id}`}>Admin note (optional)</label>
                    <input
                      id={`dispute-note-${item.room.order_id}`}
                      type="text"
                      value={noteMap[item.room.order_id] ?? ""}
                      onChange={(event) =>
                        setNoteMap((current) => ({
                          ...current,
                          [item.room.order_id]: event.target.value,
                        }))
                      }
                      placeholder="Why you resolved it this way"
                    />

                    <div className="admin-review-actions">
                      <button
                        className="primary-button admin-approve-button"
                        type="button"
                        onClick={() => review(item.room.order_id, "seller")}
                        disabled={actionLoadingId === item.room.order_id}
                      >
                        {actionLoadingId === item.room.order_id ? "Working..." : "Resolve For Seller"}
                      </button>
                      <button
                        className="ghost-button admin-reject-button"
                        type="button"
                        onClick={() => review(item.room.order_id, "buyer")}
                        disabled={actionLoadingId === item.room.order_id}
                      >
                        Resolve For Buyer
                      </button>
                      <Link className="ghost-button" href={`/orders/${item.room.order_id}`}>
                        Open Room
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="auth-switch">
              Back to <Link href="/account">Account</Link>
            </p>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

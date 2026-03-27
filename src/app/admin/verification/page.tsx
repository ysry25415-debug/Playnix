"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase-client";

type ReviewItem = {
  id: number;
  user_id: string;
  selfie_path: string;
  passport_path: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
  selfie_url: string | null;
  passport_url: string | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ActiveTab = "pending" | "approved" | "rejected";

export default function AdminVerificationPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  async function fetchRequests(status: ActiveTab) {
    setError("");
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setIsLoading(false);
      setError("You need to log in first.");
      return;
    }

    const response = await fetch(`/api/admin/verification/pending?status=${status}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setIsLoading(false);
      setError(payload?.error ?? "Could not load verification requests.");
      return;
    }

    setItems(Array.isArray(payload?.items) ? payload.items : []);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab]);

  async function review(requestId: number, decision: "approved" | "rejected") {
    setActionLoadingId(requestId);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setActionLoadingId(null);
      setError("You need to log in first.");
      return;
    }

    const response = await fetch("/api/admin/verification/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        requestId,
        decision,
        note: noteMap[requestId] ?? "",
      }),
    });

    const payload = await response.json().catch(() => null);
    setActionLoadingId(null);

    if (!response.ok) {
      setError(payload?.error ?? "Could not update request.");
      return;
    }

    if (activeTab === "pending") {
      setItems((current) => current.filter((item) => item.id !== requestId));
    } else {
      fetchRequests(activeTab);
    }
  }

  const title =
    activeTab === "pending"
      ? "Pending Requests"
      : activeTab === "approved"
        ? "Approved Requests"
        : "Rejected Requests";

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card admin-review-card">
            <h1>Seller Verification Review</h1>
            <p>Review all seller verification requests in one place.</p>

            <div className="admin-tabs">
              <button
                type="button"
                className={activeTab === "pending" ? "admin-tab admin-tab--active" : "admin-tab"}
                onClick={() => setActiveTab("pending")}
              >
                Pending
              </button>
              <button
                type="button"
                className={activeTab === "approved" ? "admin-tab admin-tab--active" : "admin-tab"}
                onClick={() => setActiveTab("approved")}
              >
                Approved
              </button>
              <button
                type="button"
                className={activeTab === "rejected" ? "admin-tab admin-tab--active" : "admin-tab"}
                onClick={() => setActiveTab("rejected")}
              >
                Rejected
              </button>
              <button
                type="button"
                className="ghost-button admin-refresh-button"
                onClick={() => fetchRequests(activeTab)}
              >
                Refresh
              </button>
            </div>

            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

            <p className="admin-list-title">{title}</p>

            {isLoading ? (
              <p>Loading pending requests...</p>
            ) : items.length === 0 ? (
              <p className="auth-feedback auth-feedback--success">No requests in this tab.</p>
            ) : (
              <div className="admin-review-list">
                {items.map((item) => (
                  <article key={item.id} className="admin-review-item">
                    <div className="admin-review-item__head">
                      <strong>{item.profile?.full_name || "Unknown user"}</strong>
                      <span>User ID: {item.user_id}</span>
                      <span>Status: {item.status}</span>
                      <span>Submitted: {new Date(item.submitted_at).toLocaleString()}</span>
                      {item.admin_note ? <span>Admin note: {item.admin_note}</span> : null}
                    </div>

                    <div className="kyc-preview-grid">
                      <div className="kyc-preview-card">
                        <strong>Selfie</strong>
                        {item.selfie_url ? <img src={item.selfie_url} alt="Selfie" /> : <span>Not available</span>}
                      </div>
                      <div className="kyc-preview-card">
                        <strong>Passport</strong>
                        {item.passport_url ? (
                          <img src={item.passport_url} alt="Passport" />
                        ) : (
                          <span>Not available</span>
                        )}
                      </div>
                    </div>

                    {activeTab === "pending" ? (
                      <>
                        <label htmlFor={`review-note-${item.id}`}>Admin note (optional)</label>
                        <input
                          id={`review-note-${item.id}`}
                          type="text"
                          value={noteMap[item.id] ?? ""}
                          onChange={(event) =>
                            setNoteMap((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder="Reason or comment"
                        />

                        <div className="admin-review-actions">
                          <button
                            className="primary-button admin-approve-button"
                            type="button"
                            onClick={() => review(item.id, "approved")}
                            disabled={actionLoadingId === item.id}
                          >
                            {actionLoadingId === item.id ? "Working..." : "Approve Request"}
                          </button>
                          <button
                            className="ghost-button admin-reject-button"
                            type="button"
                            onClick={() => review(item.id, "rejected")}
                            disabled={actionLoadingId === item.id}
                          >
                            Reject Request
                          </button>
                        </div>
                      </>
                    ) : null}
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

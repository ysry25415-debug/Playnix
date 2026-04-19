"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { type UserNotificationRow } from "@/lib/marketplace-types";
import { supabase } from "@/lib/supabase-client";

export default function NotificationsPage() {
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadNotifications() {
    setError("");
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;

    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const { data, error: notificationsError } = await supabase
      .from("user_notifications")
      .select("id,recipient_id,actor_id,order_id,title,body,action_href,is_read,created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });

    if (notificationsError) {
      setError(notificationsError.message);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setItems((data ?? []) as UserNotificationRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markAsRead(notificationId: number) {
    setItems((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
    );

    await supabase.from("user_notifications").update({ is_read: true }).eq("id", notificationId);
  }

  async function markAllAsRead() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;

    if (!user) {
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));

    await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
  }

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card admin-review-card">
            <h1>Notifications</h1>
            <p>Room updates, buyer alerts, seller alerts, and dispute events all appear here.</p>

            <div className="admin-tabs">
              <button type="button" className="ghost-button admin-refresh-button" onClick={() => loadNotifications()}>
                Refresh
              </button>
              <button type="button" className="ghost-button admin-refresh-button" onClick={() => markAllAsRead()}>
                Mark All As Read
              </button>
            </div>

            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

            {isLoading ? (
              <p>Loading notifications...</p>
            ) : items.length === 0 ? (
              <p className="auth-feedback auth-feedback--success">No notifications yet.</p>
            ) : (
              <div className="notification-list">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={item.is_read ? "notification-item" : "notification-item notification-item--unread"}
                  >
                    <div className="notification-item__copy">
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <div className="notification-item__actions">
                      {item.action_href ? (
                        <Link
                          className="primary-button"
                          href={item.action_href}
                          onClick={() => markAsRead(item.id)}
                        >
                          Open Chat
                        </Link>
                      ) : null}
                      {!item.is_read ? (
                        <button className="ghost-button" type="button" onClick={() => markAsRead(item.id)}>
                          Mark Read
                        </button>
                      ) : null}
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

"use client";

import { Bell, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header({ title }: { title: string }) {
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; read: boolean; createdAt: string }[]
  >([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="header-card mb-8 flex flex-col gap-4 rounded-[1.9rem] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div>
        <div className="section-label">
          <span className="status-dot" />
          slow, steady progress
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)] sm:text-[2.1rem]" data-display="true">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
          A softer command center for deadlines, habits, focus, and thoughtful nudges.
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="hidden rounded-[1.2rem] bg-[rgba(255,250,244,0.8)] px-4 py-3 text-left shadow-[inset_0_0_0_1px_rgba(139,111,90,0.08)] md:block">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            <Sparkles size={13} className="text-[var(--accent)]" />
            daily tone
          </div>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">Focused, kind, and consistent</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-2xl p-3 cozy-panel hover:bg-[var(--surface-hover)]"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-white shadow-[0_6px_14px_rgba(210,143,108,0.35)]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[rgba(255,250,245,0.96)] shadow-[0_22px_50px_rgba(83,60,43,0.14)] backdrop-blur-xl">
              <div className="border-b border-[var(--border)] p-3">
                <h3 className="text-sm font-semibold">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--muted)]">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-[var(--border)] last:border-0 ${
                        !n.read ? "bg-[rgba(239,211,191,0.28)]" : ""
                      }`}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { Bell } from "lucide-react";
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
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          slow, steady progress
        </p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]" data-display="true">{title}</h1>
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
          <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[rgba(255,250,245,0.96)] shadow-[0_22px_50px_rgba(83,60,43,0.14)] backdrop-blur-xl">
            <div className="p-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-sm">Notifications</h3>
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
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

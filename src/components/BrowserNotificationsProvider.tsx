"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type BrowserNotificationPayload = {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  type: string;
  tag: string;
};

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_POLL_INTERVAL_MS = 60 * 1000;

export default function BrowserNotificationsProvider() {
  const { status } = useSession();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission
  );
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (permission === "unsupported") return;

    let cancelled = false;

    const requestPermission = async () => {
      if (Notification.permission === "default") {
        try {
          const result = await Notification.requestPermission();
          if (!cancelled) setPermission(result);
        } catch {
          // ignore
        }
      }
    };

    requestPermission();

    return () => {
      cancelled = true;
    };
  }, [status, permission]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (permission !== "granted") return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications/browser", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: { notification?: BrowserNotificationPayload | null } = await res.json();
        const notification = data.notification;

        if (!notification) return;
        if (lastShownRef.current === notification.id) return;

        lastShownRef.current = notification.id;

        const nativeNotification = new Notification(notification.title, {
          body: notification.body,
          tag: notification.tag,
          badge: "/favicon.ico",
          icon: "/favicon.ico",
        });

        nativeNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          nativeNotification.close();
        };
      } catch {
        // ignore polling errors
      }
    };

    void poll();

    const getInterval = () => (document.visibilityState === "visible" ? ACTIVE_POLL_INTERVAL_MS : POLL_INTERVAL_MS);

    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        void poll();
      }, getInterval());
    };

    const handleVisibilityChange = () => {
      startInterval();
      if (document.visibilityState === "visible") {
        void poll();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, permission]);

  return null;
}

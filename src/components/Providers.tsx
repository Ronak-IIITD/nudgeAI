"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import BrowserNotificationsProvider from "@/components/BrowserNotificationsProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <BrowserNotificationsProvider />
      {children}
    </SessionProvider>
  );
}

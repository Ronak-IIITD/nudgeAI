"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bot,
  LayoutDashboard,
  Clock,
  Repeat,
  Timer,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deadlines", label: "Deadlines", icon: Clock },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-2xl p-2.5 lg:hidden cozy-panel"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(48,38,31,0.28)] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar-shell fixed left-0 top-0 z-40 flex h-screen w-72 flex-col transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(180deg,var(--primary),var(--primary-dark))] text-white shadow-[0_14px_30px_rgba(109,84,65,0.2)]">
              <Bot size={18} />
            </div>
            <div>
              <span className="block text-xl font-semibold text-[var(--foreground)]" data-display="true">
                NudgeAI
              </span>
              <span className="block text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                calm momentum system
              </span>
            </div>
          </Link>
        </div>

        <div className="mx-4 mb-5 rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(92,73,59,0.96),rgba(123,100,84,0.92))] p-4 text-white shadow-[0_20px_42px_rgba(109,84,65,0.18)]">
          <p className="text-xs uppercase tracking-[0.22em] text-white/65">Today&apos;s tone</p>
          <p className="mt-2 text-lg font-semibold" data-display="true">
            Slow, steady progress
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Hi {firstName}, keep the list small and the momentum warm.
          </p>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`nav-item ${
                  isActive ? "nav-item-active" : "nav-item-muted"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[1rem] ${
                    isActive
                      ? "bg-[linear-gradient(180deg,var(--primary),var(--primary-dark))] text-white shadow-[0_12px_24px_rgba(109,84,65,0.16)]"
                      : "bg-[rgba(255,250,244,0.9)] text-[var(--primary)]"
                  }`}
                >
                  <Icon size={17} />
                </span>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="m-4 mt-3 rounded-[1.5rem] cozy-card p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--primary-light),var(--primary))] text-sm font-medium text-white shadow-[0_10px_24px_rgba(109,84,65,0.14)]">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.name || "User"}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <div className="mb-3 rounded-2xl bg-[rgba(255,250,244,0.72)] px-3 py-2.5 text-xs text-[var(--muted)]">
            Your routines, deadlines, and nudges stay in one place.
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[rgba(255,250,244,0.72)] px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
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

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-2xl p-2.5 lg:hidden cozy-panel"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-72 flex-col border-r border-[var(--border)] bg-[rgba(255,250,245,0.72)] backdrop-blur-2xl transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 pb-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/95 shadow-[0_10px_24px_rgba(109,84,65,0.18)]">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <span className="block text-xl font-semibold text-[var(--foreground)]" data-display="true">
                NudgeAI
              </span>
              <span className="block text-xs text-[var(--muted)]">
                cozy focus for real life
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[rgba(139,111,90,0.16)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(139,111,90,0.12)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,250,244,0.86)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-[var(--primary)] text-white" : "bg-[rgba(255,250,244,0.9)] text-[var(--primary)]"}`}>
                  <Icon size={17} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="m-4 mt-3 rounded-[1.5rem] cozy-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-medium text-white">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-xl bg-[rgba(255,250,244,0.72)] px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

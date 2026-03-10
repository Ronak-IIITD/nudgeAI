"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";
import {
  Target,
  Clock,
  Flame,
  Timer,
  Sparkles,
  Plus,
  Check,
  Loader2,
  Play,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import type { MoodLevel } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  date: string;
}

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
}

interface Habit {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  category: string;
}

interface FocusStats {
  todayMinutes: number;
  sessionsToday: number;
}

interface NudgeMessage {
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOOD_MAP: Record<MoodLevel, { label: string; emoji: string }> = {
  1: { label: "Exhausted", emoji: "\u{1F62B}" },
  2: { label: "Low", emoji: "\u{1F614}" },
  3: { label: "Okay", emoji: "\u{1F610}" },
  4: { label: "Good", emoji: "\u{1F60A}" },
  5: { label: "Energized", emoji: "\u{1F525}" },
};

const URGENCY_STYLES: Record<string, string> = {
  urgent: "border-l-[var(--danger)] bg-[rgba(186,122,107,0.12)] text-[var(--danger)]",
  high: "border-l-[var(--warning)] bg-[rgba(214,177,111,0.16)] text-[#8d6421]",
  medium: "border-l-[var(--primary)] bg-[rgba(139,111,90,0.1)] text-[var(--primary-dark)]",
  low: "border-l-[var(--success)] bg-[rgba(123,154,123,0.12)] text-[var(--success)]",
};

const URGENCY_BADGE: Record<string, string> = {
  urgent: "bg-[rgba(186,122,107,0.14)] text-[var(--danger)]",
  high: "bg-[rgba(214,177,111,0.18)] text-[#8d6421]",
  medium: "bg-[rgba(139,111,90,0.14)] text-[var(--primary-dark)]",
  low: "bg-[rgba(123,154,123,0.16)] text-[var(--success)]",
};

const PANEL_CLASS =
  "cozy-card rounded-[1.7rem] p-5 shadow-[0_18px_40px_rgba(84,60,43,0.08)]";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivationalSubtext(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Let's make today count!";
  if (hour < 17) return "Keep the momentum going!";
  return "Great work today, wind down with intention.";
}

function formatCountdown(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs <= 0) return "Overdue";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays > 0) {
    return `${diffDays}d ${remainingHours}h left`;
  }
  return `${diffHours}h left`;
}

function getDeadlineUrgency(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) return "urgent";
  if (diffHours <= 24) return "urgent";
  if (diffHours <= 72) return "high";
  if (diffHours <= 168) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className={`${PANEL_CLASS} animate-pulse`}>
      <div className="h-4 bg-[var(--border)] rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-[var(--border)] rounded w-full" />
        <div className="h-3 bg-[var(--border)] rounded w-2/3" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStats>({ todayMinutes: 0, sessionsToday: 0 });
  const [nudge, setNudge] = useState<NudgeMessage | null>(null);

  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [loadingMood, setLoadingMood] = useState(true);
  const [loadingFocus, setLoadingFocus] = useState(true);
  const [loadingNudge, setLoadingNudge] = useState(true);

  const [moodSubmitting, setMoodSubmitting] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals?date=today");
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/deadlines?limit=5&upcoming=true");
      if (res.ok) {
        const data = await res.json();
        setDeadlines(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingDeadlines(false);
    }
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits?active=true");
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHabits(false);
    }
  }, []);

  const fetchMood = useCallback(async () => {
    try {
      const res = await fetch("/api/mood?date=today");
      if (res.ok) {
        const data = await res.json();
        if (data?.mood) {
          setMood(data.mood as MoodLevel);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMood(false);
    }
  }, []);

  const fetchFocusStats = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/stats?date=today");
      if (res.ok) {
        const data = await res.json();
        setFocusStats(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingFocus(false);
    }
  }, []);

  const fetchNudge = useCallback(async () => {
    try {
      const res = await fetch("/api/nudge");
      if (res.ok) {
        const data = await res.json();
        setNudge(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingNudge(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    fetchDeadlines();
    fetchHabits();
    fetchMood();
    fetchFocusStats();
    fetchNudge();
  }, [fetchGoals, fetchDeadlines, fetchHabits, fetchMood, fetchFocusStats, fetchNudge]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const submitMood = async (level: MoodLevel) => {
    setMoodSubmitting(true);
    setMood(level);
    try {
      await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: level }),
      });
    } catch {
      setMood(null);
    } finally {
      setMoodSubmitting(false);
    }
  };

  const addGoal = async () => {
    const title = newGoalTitle.trim();
    if (!title) return;

    setAddingGoal(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: today }),
      });
      if (res.ok) {
        const created = await res.json();
        setGoals((prev) => [...prev, created]);
        setNewGoalTitle("");
        setShowGoalInput(false);
      }
    } catch {
      // silently fail
    } finally {
      setAddingGoal(false);
    }
  };

  const toggleGoal = async (id: string, completed: boolean) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !completed } : g))
    );
    try {
      await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
    } catch {
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, completed } : g))
      );
    }
  };

  const checkinHabit = async (id: string) => {
    setCheckinLoadingId(id);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, completedToday: true, streak: h.streak + 1 }
          : h
      )
    );
    try {
      await fetch(`/api/habits/${id}/checkin`, { method: "POST" });
    } catch {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === id
            ? { ...h, completedToday: false, streak: h.streak - 1 }
            : h
        )
      );
    } finally {
      setCheckinLoadingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const completedGoals = goals.filter((g) => g.completed).length;
  const totalGoals = goals.length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <>
      <Header title="Dashboard" />

      <section className="mb-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
          <div className="section-label">
            <span className="status-dot" />
            your daily brief
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl" data-display="true">
            {getGreeting()}, {firstName}!
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            {getMotivationalSubtext()} You have {totalGoals || "a fresh set of"} goal
            {totalGoals === 1 ? "" : "s"}, {deadlines.length} upcoming deadline
            {deadlines.length === 1 ? "" : "s"}, and {habits.length} active habit
            {habits.length === 1 ? "" : "s"} in motion.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-[rgba(255,250,244,0.82)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Goals</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{completedGoals}/{Math.max(totalGoals, 1)} done</p>
            </div>
            <div className="rounded-2xl bg-[rgba(255,250,244,0.82)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Focus</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{focusStats.todayMinutes} min</p>
            </div>
            <div className="rounded-2xl bg-[rgba(255,250,244,0.82)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Completion</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{completionRate}%</p>
            </div>
          </div>
        </div>

        <div className={`${PANEL_CLASS} flex flex-col justify-between`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              calm momentum
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]" data-display="true">
              Keep the list small and the follow-through warm.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["Today", totalGoals > 0 ? `${totalGoals} goals on deck` : "A clean slate to shape"],
              ["Focus streak", focusStats.sessionsToday > 0 ? `${focusStats.sessionsToday} session${focusStats.sessionsToday === 1 ? "" : "s"}` : "Start a fresh session"],
              ["Habits", habits.length > 0 ? `${habits.length} active routine${habits.length === 1 ? "" : "s"}` : "No active habits yet"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.72)] px-4 py-3 text-sm">
                <span className="font-medium text-[var(--muted)]">{label}</span>
                <span className="text-right font-semibold text-[var(--foreground)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className={`${PANEL_CLASS} overflow-hidden`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                mood check-in
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]" data-display="true">
                How are you feeling?
              </h3>
            </div>
            <div className="hidden rounded-full bg-[rgba(210,143,108,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:block">
              adjust your AI tone
            </div>
          </div>

          <p className="mb-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Your check-in helps NudgeAI respond with the right level of energy, encouragement, and pacing.
          </p>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            How are you feeling?
          </h3>
          {loadingMood ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-xl bg-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          ) : mood ? (
            <div className="flex items-center gap-4 rounded-[1.4rem] bg-[rgba(255,250,244,0.76)] px-4 py-4">
              <span className="text-4xl">{MOOD_MAP[mood].emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-[var(--foreground)]">
                  {MOOD_MAP[mood].label}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Logged for today. You can update it anytime.
                </p>
              </div>
              <div className="hidden rounded-full bg-[rgba(123,154,123,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)] sm:block">
                synced
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => submitMood(level)}
                  disabled={moodSubmitting}
                  className="flex min-w-[5rem] flex-col items-center gap-1 rounded-[1.2rem] border border-[var(--border)] bg-[rgba(255,250,244,0.82)] px-3 py-3 hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer disabled:opacity-50"
                  title={MOOD_MAP[level].label}
                >
                  <span className="text-2xl">{MOOD_MAP[level].emoji}</span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {MOOD_MAP[level].label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className={`${PANEL_CLASS} md:col-span-2 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold text-[var(--foreground)]">
                Today&apos;s Goals
              </h3>
              {totalGoals > 0 && (
                <span className="text-xs text-[var(--muted)] ml-1">
                  {completedGoals}/{totalGoals}
                </span>
              )}
            </div>
            {goals.length < 5 && (
              <button
                onClick={() => setShowGoalInput(true)}
                className="flex items-center gap-1 rounded-full bg-[rgba(139,111,90,0.08)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[rgba(139,111,90,0.14)] transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          {loadingGoals ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[var(--border)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : goals.length === 0 && !showGoalInput ? (
            <div className="text-center py-6">
              <Target size={32} className="mx-auto text-[var(--border)] mb-2" />
              <p className="text-sm text-[var(--muted)]">No goals for today yet.</p>
              <button
                onClick={() => setShowGoalInput(true)}
                className="mt-2 text-sm text-[var(--primary)] font-medium hover:underline"
              >
                Add your first goal
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="group flex items-center gap-3 rounded-[1rem] p-3 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <button
                    onClick={() => toggleGoal(goal.id, goal.completed)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      goal.completed
                        ? "bg-[var(--success)] border-[var(--success)]"
                        : "border-[var(--border)] group-hover:border-[var(--primary)]"
                    }`}
                  >
                    {goal.completed && <Check size={12} className="text-white" />}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      goal.completed
                        ? "line-through text-[var(--muted)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {goal.title}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Add goal input */}
          {showGoalInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
                placeholder="What do you want to accomplish?"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)]"
                autoFocus
              />
              <button
                onClick={addGoal}
                disabled={addingGoal || !newGoalTitle.trim()}
                className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {addingGoal ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
              <button
                onClick={() => {
                  setShowGoalInput(false);
                  setNewGoalTitle("");
                }}
                className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Progress bar */}
          {totalGoals > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Progress today</span>
                <span>{completionRate}% complete</span>
              </div>
              <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
                  style={{
                    width: `${(completedGoals / totalGoals) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`${PANEL_CLASS} bg-[linear-gradient(180deg,rgba(255,251,247,0.96),rgba(247,236,226,0.88))]`}>
          <div className="flex items-center gap-2 mb-4">
            <Timer size={18} className="text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--foreground)]">Focus</h3>
          </div>

          {loadingFocus ? (
            <CardSkeleton />
          ) : (
            <>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-[var(--foreground)]">
                  {focusStats.todayMinutes}
                </p>
                <p className="text-sm text-[var(--muted)] mt-1">
                  minutes focused today
                </p>
                {focusStats.sessionsToday > 0 && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {focusStats.sessionsToday} session{focusStats.sessionsToday !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <a
                href="/focus"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Play size={14} />
                Start Pomodoro
              </a>
            </>
          )}
        </div>

        <div className={`${PANEL_CLASS} md:col-span-2 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-[var(--danger)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Deadlines
            </h3>
          </div>

          {loadingDeadlines ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[var(--border)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : deadlines.length === 0 ? (
            <div className="text-center py-6">
              <Clock size={32} className="mx-auto text-[var(--border)] mb-2" />
              <p className="text-sm text-[var(--muted)]">No upcoming deadlines.</p>
              <a
                href="/deadlines"
                className="mt-2 inline-block text-sm text-[var(--primary)] font-medium hover:underline"
              >
                Add a deadline
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {deadlines.map((d) => {
                const urgency = getDeadlineUrgency(d.dueDate);
                return (
                  <li
                    key={d.id}
                    className={`rounded-[1.1rem] border-l-4 p-3 ${URGENCY_STYLES[urgency]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--foreground)] leading-tight">
                        {d.title}
                      </p>
                      <span
                        className={`flex-shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${URGENCY_BADGE[urgency]}`}
                      >
                        {urgency}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatCountdown(d.dueDate)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {deadlines.length > 0 && (
            <a
              href="/deadlines"
              className="block text-center text-xs text-[var(--primary)] font-medium mt-4 hover:underline"
            >
              View all deadlines
            </a>
          )}
        </div>

        <div className={`${PANEL_CLASS}`}>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-orange-500" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Habit Streaks
            </h3>
          </div>

          {loadingHabits ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[var(--border)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <div className="text-center py-6">
              <Flame size={32} className="mx-auto text-[var(--border)] mb-2" />
              <p className="text-sm text-[var(--muted)]">No active habits.</p>
              <a
                href="/habits"
                className="mt-2 inline-block text-sm text-[var(--primary)] font-medium hover:underline"
              >
                Start a habit
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className="flex items-center justify-between gap-2 rounded-[1rem] p-3 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame
                        size={12}
                        className={`${
                          habit.streak >= 7
                            ? "text-orange-500 streak-fire"
                            : "text-[var(--muted)]"
                        }`}
                      />
                      <span className="text-xs text-[var(--muted)]">
                        {habit.streak} day{habit.streak !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {habit.completedToday ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--success)] font-medium">
                      <Check size={14} />
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={() => checkinHabit(habit.id)}
                      disabled={checkinLoadingId === habit.id}
                      className="rounded-lg border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {checkinLoadingId === habit.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "Check in"
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {habits.length > 0 && (
            <a
              href="/habits"
              className="block text-center text-xs text-[var(--primary)] font-medium mt-4 hover:underline"
            >
              View all habits
            </a>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-[rgba(139,111,90,0.18)] bg-[linear-gradient(180deg,rgba(141,113,90,0.96),rgba(198,170,147,0.96))] p-5 text-white shadow-[0_18px_42px_rgba(109,84,65,0.18)] md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} />
            <h3 className="font-semibold">Your Nudge</h3>
          </div>

          {loadingNudge ? (
            <div className="space-y-2">
              <div className="h-3 bg-white/20 rounded w-full" />
              <div className="h-3 bg-white/20 rounded w-4/5" />
              <div className="h-3 bg-white/20 rounded w-2/3" />
            </div>
          ) : nudge?.message ? (
            <p className="text-sm leading-relaxed text-white/90">
              {nudge.message}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-white/90">
              You&apos;re showing up, and that matters. Keep going, one small
              step at a time. You&apos;ve got this!
            </p>
          )}

          <div className="flex items-center gap-1 mt-4 text-white/60 text-xs">
            <TrendingUp size={12} />
            <span>Personalized by NudgeAI</span>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, Check, Circle, Trash2, X, Sparkles } from "lucide-react";
import { format, subDays, isSameDay, startOfDay } from "date-fns";
import Header from "@/components/layout/Header";
import {
  HabitCategory,
  HabitFrequency,
  HABIT_CATEGORIES,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HabitCheckin {
  id: string;
  date: string;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  frequency: HabitFrequency;
  customDays: number[];
  active: boolean;
  currentStreak: number;
  longestStreak: number;
  checkins: HabitCheckin[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<HabitCategory, string> = {
  health: "bg-emerald-100 text-emerald-700",
  learning: "bg-blue-100 text-blue-700",
  work: "bg-amber-100 text-amber-700",
  personal: "bg-purple-100 text-purple-700",
  custom: "bg-pink-100 text-pink-700",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STREAK_MILESTONES = [7, 30, 100];

const PANEL_CLASS = "soft-card rounded-[1.7rem] p-5";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | HabitCategory>("all");
  const [celebration, setCelebration] = useState<{
    habitName: string;
    milestone: number;
  } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<HabitCategory>("personal");
  const [formFrequency, setFormFrequency] = useState<HabitFrequency>("daily");
  const [formCustomDays, setFormCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch habits
  // -----------------------------------------------------------------------

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // -----------------------------------------------------------------------
  // Add habit
  // -----------------------------------------------------------------------

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          category: formCategory,
          frequency: formFrequency,
          customDays: formFrequency === "custom" ? formCustomDays : undefined,
        }),
      });

      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchHabits();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCategory("personal");
    setFormFrequency("daily");
    setFormCustomDays([]);
  };

  // -----------------------------------------------------------------------
  // Check-in / undo
  // -----------------------------------------------------------------------

  const isCheckedInToday = (habit: Habit): boolean => {
    const today = startOfDay(new Date());
    return habit.checkins.some((c) => isSameDay(new Date(c.date), today));
  };

  const handleCheckin = async (habit: Habit) => {
    const checkedIn = isCheckedInToday(habit);

    try {
      if (checkedIn) {
        await fetch(`/api/habits/${habit.id}/checkin`, { method: "DELETE" });
      } else {
        const res = await fetch(`/api/habits/${habit.id}/checkin`, {
          method: "POST",
        });

        if (res.ok) {
          const updated = await res.json();
          const newStreak: number =
            updated?.currentStreak ?? habit.currentStreak + 1;

          // Check for milestones
          const milestone = STREAK_MILESTONES.find(
            (m) => newStreak >= m && habit.currentStreak < m
          );
          if (milestone) {
            setCelebration({ habitName: habit.name, milestone });
            setTimeout(() => setCelebration(null), 4000);
          }
        }
      }

      fetchHabits();
    } catch {
      // silently fail
    }
  };

  // -----------------------------------------------------------------------
  // Delete habit
  // -----------------------------------------------------------------------

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/habits/${id}`, { method: "DELETE" });
      fetchHabits();
    } catch {
      // silently fail
    }
  };

  // -----------------------------------------------------------------------
  // Custom day toggle
  // -----------------------------------------------------------------------

  const toggleCustomDay = (day: number) => {
    setFormCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // -----------------------------------------------------------------------
  // Filter
  // -----------------------------------------------------------------------

  const filteredHabits =
    filter === "all" ? habits : habits.filter((h) => h.category === filter);

  const checkedTodayCount = habits.filter((habit) => isCheckedInToday(habit)).length;
  const longestActiveStreak = habits.reduce(
    (max, habit) => Math.max(max, habit.currentStreak),
    0
  );

  // -----------------------------------------------------------------------
  // Streak calendar helpers
  // -----------------------------------------------------------------------

  const getLast30Days = () => {
    const days: Date[] = [];
    for (let i = 29; i >= 0; i--) {
      days.push(startOfDay(subDays(new Date(), i)));
    }
    return days;
  };

  const getCheckinStatus = (
    habit: Habit,
    day: Date
  ): "done" | "missed" | "future" => {
    const today = startOfDay(new Date());
    if (day > today) return "future";
    const done = habit.checkins.some((c) => isSameDay(new Date(c.date), day));
    return done ? "done" : "missed";
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      <Header title="Habits" />

      {/* Celebration overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-2xl p-8 text-center shadow-xl max-w-sm mx-4 animate-bounce-in">
            <Sparkles size={48} className="mx-auto text-[var(--warning)] mb-4" />
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              {celebration.milestone}-Day Streak!
            </h2>
            <p className="text-[var(--muted)]">
              Amazing work on <span className="font-semibold">{celebration.habitName}</span>!
              You&apos;ve kept it going for {celebration.milestone} days straight.
            </p>
          </div>
        </div>
      )}

      <section className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
          <div className="section-label">
            <span className="status-dot" />
            ritual tracker
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl" data-display="true">
            Build momentum with routines you actually want to keep.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Keep habits visible, celebrate streaks, and make consistency feel rewarding instead of rigid.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active habits</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{habits.length}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Checked today</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--success)]">{checkedTodayCount}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Best live streak</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{longestActiveStreak}d</p>
            </div>
          </div>
        </div>

        <div className={`${PANEL_CLASS} flex flex-col justify-between`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">consistency note</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]" data-display="true">
              Small check-ins compound into a steady identity.
            </p>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">Filter</span>
              <span className="font-semibold capitalize text-[var(--foreground)]">{filter}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">Focus</span>
              <span className="font-semibold text-[var(--foreground)]">Keep showing up</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="segmented-control flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`segmented-pill transition-all ${
              filter === "all"
                ? "segmented-pill-active"
                : "hover:text-[var(--foreground)]"
            }`}
          >
            All
          </button>
          {HABIT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`segmented-pill transition-all ${
                filter === cat.value
                  ? "segmented-pill-active"
                  : "hover:text-[var(--foreground)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="cozy-button inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          <Plus size={18} />
          Add Habit
        </button>
      </div>

      {/* Add Habit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="soft-card-strong mx-4 w-full max-w-lg overflow-hidden rounded-[1.9rem]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                New Habit
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Meditate for 10 minutes"
                  required
                  className="soft-input px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Description
                  <span className="text-[var(--muted)] font-normal ml-1">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Why is this habit important?"
                  rows={2}
                  className="soft-input resize-none px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormCategory(cat.value)}
                      className={`segmented-pill border transition-colors ${
                        formCategory === cat.value
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Frequency
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "daily", label: "Daily" },
                      { value: "weekdays", label: "Weekdays" },
                      { value: "weekly", label: "Weekly" },
                      { value: "custom", label: "Custom" },
                    ] as { value: HabitFrequency; label: string }[]
                  ).map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setFormFrequency(freq.value)}
                      className={`segmented-pill border transition-colors ${
                        formFrequency === freq.value
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>

                {formFrequency === "custom" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleCustomDay(idx)}
                        className={`w-10 h-10 text-xs rounded-lg border transition-colors font-medium ${
                          formCustomDays.includes(idx)
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formName.trim()}
                  className="cozy-button rounded-xl px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="soft-card loading-surface rounded-[1.7rem] p-5 animate-pulse"
            >
              <div className="h-5 w-1/3 bg-[var(--border)] rounded mb-3" />
              <div className="h-4 w-1/2 bg-[var(--border)] rounded mb-4" />
              <div className="h-8 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="empty-state-shell flex flex-col items-center justify-center rounded-[2rem] py-20 text-center">
          <div className="pulse-dot-soft mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-light)]/20">
            <Sparkles size={32} className="text-[var(--primary)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
            {filter === "all"
              ? "No habits yet"
              : `No ${filter} habits`}
          </h2>
          <p className="text-[var(--muted)] text-sm max-w-sm mb-6">
            {filter === "all"
              ? "Start building great habits! Add your first habit and track your progress every day."
              : `You don\u2019t have any habits in the ${filter} category. Create one to get started!`}
          </p>
          <button
            onClick={() => {
              resetForm();
              if (filter !== "all") setFormCategory(filter);
              setShowForm(true);
            }}
            className="cozy-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <Plus size={18} />
            Add Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHabits.map((habit) => {
            const checkedIn = isCheckedInToday(habit);
            const last30 = getLast30Days();

            return (
              <div
                key={habit.id}
                className="soft-card interactive-card rounded-[1.7rem] p-5 flex flex-col gap-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-[var(--foreground)] truncate">
                        {habit.name}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          CATEGORY_COLORS[habit.category]
                        }`}
                      >
                        {habit.category.charAt(0).toUpperCase() +
                          habit.category.slice(1)}
                      </span>
                    </div>
                    {habit.description && (
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                        {habit.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(habit.id)}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-red-50 transition-colors shrink-0"
                    aria-label="Delete habit"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      {habit.currentStreak > 0 && (
                        <Flame
                          size={18}
                          className="text-orange-500"
                        />
                      )}
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {habit.currentStreak}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        day{habit.currentStreak !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--muted)]">
                      Best: {habit.longestStreak}d
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheckin(habit)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      checkedIn
                        ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30"
                        : "bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--success)] hover:text-[var(--success)]"
                    }`}
                  >
                    {checkedIn ? (
                      <>
                        <Check size={16} />
                        Done
                      </>
                    ) : (
                      <>
                        <Circle size={16} />
                        Check in
                      </>
                    )}
                  </button>
                </div>

                {STREAK_MILESTONES.some(
                  (m) => habit.currentStreak >= m
                ) && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--warning)] bg-[var(--warning)]/10 px-2.5 py-1 rounded-lg w-fit">
                    <Sparkles size={14} />
                    {habit.currentStreak >= 100
                      ? "100-day legend!"
                      : habit.currentStreak >= 30
                        ? "30-day streak!"
                        : "7-day streak!"}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--muted)]">
                      Last 30 days
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {format(last30[0], "MMM d")} &ndash;{" "}
                      {format(last30[last30.length - 1], "MMM d")}
                    </span>
                  </div>
                  <div className="flex gap-[3px] flex-wrap">
                    {last30.map((day, i) => {
                      const status = getCheckinStatus(habit, day);
                      return (
                        <div
                          key={i}
                          title={`${format(day, "MMM d, yyyy")} - ${
                            status === "done"
                              ? "Completed"
                              : status === "missed"
                                ? "Missed"
                                : "Upcoming"
                          }`}
                          className={`w-[calc((100%-87px)/30)] min-w-[8px] max-w-[14px] aspect-square rounded-[3px] transition-colors ${
                            status === "done"
                              ? "bg-[var(--success)]"
                              : status === "missed"
                                ? "bg-[var(--border)]"
                                : "bg-transparent border border-dashed border-[var(--border)]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import {
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trophy,
  Sparkles,
  Trash2,
  Link2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  Target,
  Sun,
  Moon,
} from "lucide-react";
import { format, addDays, subDays, isToday, startOfDay } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "urgent";
}

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  date: string;
  order: number;
  winNote: string | null;
  deadlineId: string | null;
  deadline: Deadline | null;
}

interface WeekDay {
  date: Date;
  total: number;
  completed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function isAfter5pm(): boolean {
  return new Date().getHours() >= 17;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  // ---- State ----
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [showDeadlineDropdown, setShowDeadlineDropdown] = useState<string | null>(null);
  const [winNotes, setWinNotes] = useState<Record<string, string>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [addingGoal, setAddingGoal] = useState(false);
  const [savingWins, setSavingWins] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dateKey = formatDateKey(selectedDate);
  const viewingToday = isToday(selectedDate);

  // ---- Derived ----
  const completedGoals = goals.filter((g) => g.completed);
  const completedCount = completedGoals.length;
  const totalCount = goals.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const showEveningCheckin =
    totalCount > 0 && (completedCount > 0 || isAfter5pm());
  const showAiSummary =
    totalCount > 0 && (isAfter5pm() || allCompleted);

  // ---- Data Fetching ----

  const fetchGoals = useCallback(async (date: string) => {
    setLoadingGoals(true);
    try {
      const res = await fetch(`/api/goals?date=${date}`);
      if (res.ok) {
        const data: Goal[] = await res.json();
        setGoals(data.sort((a, b) => a.order - b.order));
        // Initialize win notes from existing data
        const notes: Record<string, string> = {};
        data.forEach((g) => {
          if (g.winNote) notes[g.id] = g.winNote;
        });
        setWinNotes(notes);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/deadlines?upcoming=true");
      if (res.ok) {
        const data: Deadline[] = await res.json();
        setDeadlines(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchWeekData = useCallback(async (centerDate: Date) => {
    setLoadingWeek(true);
    try {
      const days: WeekDay[] = [];
      const fetches = [];
      for (let i = -6; i <= 0; i++) {
        const d = addDays(centerDate, i);
        fetches.push(
          fetch(`/api/goals?date=${formatDateKey(d)}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data: Goal[]) => ({
              date: d,
              total: data.length,
              completed: data.filter((g) => g.completed).length,
            }))
            .catch(() => ({ date: d, total: 0, completed: 0 }))
        );
      }
      const results = await Promise.all(fetches);
      days.push(...results);
      setWeekData(days);
    } catch {
      // silently fail
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  const fetchAiSummary = useCallback(async () => {
    setLoadingAi(true);
    try {
      const goalsSummary = goals.map((g) => ({
        title: g.title,
        completed: g.completed,
        winNote: g.winNote || winNotes[g.id] || null,
      }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "day_summary",
          context: {
            goals: goalsSummary,
            date: dateKey,
            completedCount,
            totalCount,
          },
          additionalInfo: `Summarize the user's day based on their goals and wins. Be warm and encouraging.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.message);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingAi(false);
    }
  }, [goals, winNotes, dateKey, completedCount, totalCount]);

  // ---- Effects ----

  useEffect(() => {
    fetchGoals(dateKey);
    fetchWeekData(selectedDate);
    setAiSummary(null);
  }, [dateKey, fetchGoals, fetchWeekData, selectedDate]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  // Auto-fetch AI summary when conditions met
  useEffect(() => {
    if (showAiSummary && !aiSummary && !loadingAi && viewingToday && goals.length > 0) {
      fetchAiSummary();
    }
  }, [showAiSummary, aiSummary, loadingAi, viewingToday, goals.length, fetchAiSummary]);

  // Close deadline dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDeadlineDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ---- Actions ----

  const addGoal = async () => {
    const title = newGoalTitle.trim();
    if (!title || goals.length >= 5) return;

    setAddingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: dateKey }),
      });
      if (res.ok) {
        const created: Goal = await res.json();
        setGoals((prev) => [...prev, created]);
        setNewGoalTitle("");
        inputRef.current?.focus();
      }
    } catch {
      // silently fail
    } finally {
      setAddingGoal(false);
    }
  };

  const toggleGoal = async (goal: Goal) => {
    const newCompleted = !goal.completed;
    setTogglingId(goal.id);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : null,
            }
          : g
      )
    );
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (res.ok) {
        const updated: Goal = await res.json();
        setGoals((prev) =>
          prev.map((g) => (g.id === updated.id ? updated : g))
        );
      }
    } catch {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, completed: goal.completed, completedAt: goal.completedAt } : g
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  const deleteGoal = async (id: string) => {
    setDeletingId(id);
    const prev = [...goals];
    setGoals((g) => g.filter((goal) => goal.id !== id));
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setGoals(prev);
      }
    } catch {
      setGoals(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const linkDeadline = async (goalId: string, deadlineId: string | null) => {
    setShowDeadlineDropdown(null);
    const deadline = deadlineId
      ? deadlines.find((d) => d.id === deadlineId) || null
      : null;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, deadlineId, deadline } : g
      )
    );
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlineId }),
      });
    } catch {
      // silently fail
    }
  };

  const moveGoal = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= goals.length) return;

    const reordered = [...goals];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Update local order
    const withNewOrder = reordered.map((g, i) => ({ ...g, order: i }));
    setGoals(withNewOrder);

    // Persist both changed orders
    try {
      await Promise.all([
        fetch(`/api/goals/${withNewOrder[index].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: index }),
        }),
        fetch(`/api/goals/${withNewOrder[newIndex].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newIndex }),
        }),
      ]);
    } catch {
      // silently fail
    }
  };

  const saveWinNotes = async () => {
    setSavingWins(true);
    try {
      const updates = completedGoals
        .filter((g) => winNotes[g.id] !== undefined)
        .map((g) =>
          fetch(`/api/goals/${g.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ winNote: winNotes[g.id] }),
          })
        );
      await Promise.all(updates);
      // Refresh goals to get updated data
      await fetchGoals(dateKey);
    } catch {
      // silently fail
    } finally {
      setSavingWins(false);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate((d) =>
      direction === "prev" ? subDays(d, 1) : addDays(d, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  // ---- Render ----

  const maxWeekGoals = Math.max(...weekData.map((d) => d.total), 1);

  return (
    <>
      <Header title="Daily Goals" />

      <section className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
          <div className="section-label">
            <span className="status-dot" />
            daily intention board
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-[var(--foreground)] sm:text-4xl" data-display="true">
            Keep the day small enough to finish well.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Pick what matters, move it into order, and close the day with a record of what actually went right.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Selected day</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{viewingToday ? "Today" : format(selectedDate, "MMM d")}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Completed</p>
              <p className="mt-2 text-lg font-semibold text-[var(--success)]">{completedCount}/{Math.max(totalCount, 1)}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Momentum</p>
              <p className="mt-2 text-lg font-semibold text-[var(--accent)]">{allCompleted ? "Fully done" : totalCount === 0 ? "Fresh slate" : "In progress"}</p>
            </div>
          </div>
        </div>

        <div className="soft-card rounded-[1.7rem] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">focus note</p>
          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]" data-display="true">
            Finishing three meaningful things is often better than listing ten.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">Evening check-in</span>
              <span className="font-semibold text-[var(--foreground)]">{showEveningCheckin ? "Ready" : "Later"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(255,250,244,0.74)] px-4 py-3">
              <span className="text-[var(--muted)]">AI summary</span>
              <span className="font-semibold text-[var(--foreground)]">{showAiSummary ? "Available" : "Waiting"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="soft-card rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-[var(--warning)]" />
              <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                Last 7 Days
              </h3>
            </div>
            {!loadingWeek && (
              <span className="text-xs text-[var(--muted)]">
                {weekData.reduce((s, d) => s + d.completed, 0)}/
                {weekData.reduce((s, d) => s + d.total, 0)} goals completed
              </span>
            )}
          </div>

          {loadingWeek ? (
            <div className="flex items-end gap-2 h-20">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-[var(--border)] rounded-t animate-pulse" style={{ height: 24 + i * 4 }} />
                  <div className="h-3 w-6 bg-[var(--border)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-24">
              {weekData.map((day) => {
                const pct =
                  day.total > 0
                    ? (day.completed / day.total) * 100
                    : 0;
                const barHeight =
                  day.total > 0
                    ? Math.max((day.total / maxWeekGoals) * 100, 16)
                    : 8;
                const isSel =
                  formatDateKey(day.date) === dateKey;

                return (
                  <button
                    key={formatDateKey(day.date)}
                    onClick={() => setSelectedDate(startOfDay(day.date))}
                    className={`flex-1 flex flex-col items-center gap-1 group cursor-pointer ${
                      isSel ? "opacity-100" : "opacity-70 hover:opacity-100"
                    }`}
                    title={`${format(day.date, "MMM d")}: ${day.completed}/${day.total}`}
                  >
                    <div
                      className="w-full rounded-t relative overflow-hidden"
                      style={{ height: `${barHeight}%`, minHeight: 6 }}
                    >
                      {/* Background (total) */}
                      <div className="absolute inset-0 bg-[var(--border)] rounded-t" />
                      {/* Filled (completed) */}
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t transition-all duration-500"
                        style={{
                          height: `${pct}%`,
                          backgroundColor:
                            pct === 100
                              ? "var(--success)"
                              : pct > 0
                              ? "var(--primary)"
                              : "transparent",
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isSel
                          ? "text-[var(--primary)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {format(day.date, "EEE")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDate("prev")}
              className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} className="text-[var(--foreground)]" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[var(--primary)]" />
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h2>
              {viewingToday && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--primary)] text-white">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => navigateDate("next")}
              className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Next day"
            >
              <ChevronRight size={18} className="text-[var(--foreground)]" />
            </button>
          </div>

          {!viewingToday && (
            <button
              onClick={goToToday}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] border border-[var(--primary)] rounded-xl hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              <Calendar size={14} />
              Today
            </button>
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="soft-card rounded-[1.9rem] p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sun size={20} className="text-[var(--warning)]" />
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Morning Goals
            </h3>
          </div>
          <p className="text-sm text-[var(--muted)] mb-5">
            What are your most important things today?
          </p>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--muted)]">
                  Progress
                </span>
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {completedCount}/{totalCount} completed
                </span>
              </div>
              <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(completedCount / totalCount) * 100}%`,
                    backgroundColor:
                      allCompleted ? "var(--success)" : "var(--primary)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Loading */}
          {loadingGoals ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-[var(--border)] rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : goals.length === 0 && !newGoalTitle ? (
            /* Empty state */
            <div className="text-center py-10">
              <Target
                size={48}
                className="mx-auto text-[var(--primary-light)] mb-3"
              />
              <h4 className="text-base font-semibold text-[var(--foreground)] mb-1">
                No goals set for this day
              </h4>
              <p className="text-sm text-[var(--muted)] mb-4 max-w-sm mx-auto">
                Start your day with intention. What are the 1-5 most important
                things you want to accomplish?
              </p>
              <button
                onClick={() => inputRef.current?.focus()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus size={16} />
                Add your first goal
              </button>
            </div>
          ) : (
            /* Goal list */
            <ul className="space-y-2">
              {goals.map((goal, index) => (
                <li
                  key={goal.id}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary-light)] hover:bg-[var(--surface-hover)] transition-colors group"
                >
                  {/* Drag handle (visual) */}
                  <GripVertical
                    size={16}
                    className="text-[var(--border)] group-hover:text-[var(--muted)] flex-shrink-0 cursor-grab"
                  />

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleGoal(goal)}
                    disabled={togglingId === goal.id}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      goal.completed
                        ? "bg-[var(--success)] border-[var(--success)]"
                        : "border-[var(--border)] group-hover:border-[var(--primary)]"
                    }`}
                    aria-label={
                      goal.completed ? "Mark incomplete" : "Mark complete"
                    }
                  >
                    {goal.completed && (
                      <Check size={12} className="text-white" />
                    )}
                  </button>

                  {/* Title + deadline badge */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm block truncate ${
                        goal.completed
                          ? "line-through text-[var(--muted)]"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {goal.title}
                    </span>
                    {goal.deadline && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)] mt-0.5">
                        <Link2 size={10} />
                        {goal.deadline.title}
                      </span>
                    )}
                  </div>

                  {/* Link to deadline dropdown */}
                  <div className="relative" ref={showDeadlineDropdown === goal.id ? dropdownRef : undefined}>
                    <button
                      onClick={() =>
                        setShowDeadlineDropdown(
                          showDeadlineDropdown === goal.id ? null : goal.id
                        )
                      }
                      className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors opacity-0 group-hover:opacity-100"
                      title="Link to deadline"
                    >
                      <Link2 size={14} />
                    </button>

                    {showDeadlineDropdown === goal.id && (
                      <div className="absolute right-0 top-8 z-20 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => linkDeadline(goal.id, null)}
                          className="w-full text-left px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          No deadline
                        </button>
                        {deadlines.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => linkDeadline(goal.id, d.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors ${
                              goal.deadlineId === d.id
                                ? "text-[var(--primary)] font-medium"
                                : "text-[var(--foreground)]"
                            }`}
                          >
                            {d.title}
                            <span className="block text-[10px] text-[var(--muted)]">
                              Due {format(new Date(d.dueDate), "MMM d")}
                            </span>
                          </button>
                        ))}
                        {deadlines.length === 0 && (
                          <p className="px-3 py-2 text-xs text-[var(--muted)]">
                            No upcoming deadlines
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => moveGoal(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move up"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => moveGoal(index, "down")}
                      disabled={index === goals.length - 1}
                      className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move down"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    disabled={deletingId === goal.id}
                    className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    aria-label="Delete goal"
                  >
                    {deletingId === goal.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add goal input */}
          {goals.length < 5 && !loadingGoals && (
            <div className="mt-4 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGoal();
                  }
                }}
                placeholder={
                  goals.length === 0
                    ? "e.g. Finish the project proposal..."
                    : "Add another goal..."
                }
                className="soft-input flex-1 px-4 py-2.5 text-sm placeholder:text-[var(--muted)]/60"
              />
              <button
                onClick={addGoal}
                disabled={addingGoal || !newGoalTitle.trim()}
                className="cozy-button flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                {addingGoal ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    Add
                  </>
                )}
              </button>
            </div>
          )}

          {goals.length >= 5 && !loadingGoals && (
            <p className="mt-3 text-xs text-[var(--muted)] text-center">
              Maximum of 5 goals reached. Focus on what matters most.
            </p>
          )}
        </div>
      </section>

      {showEveningCheckin && (
        <section className="mb-6">
          <div className="soft-card rounded-[1.9rem] p-6">
            <div className="flex items-center gap-2 mb-1">
              <Moon size={20} className="text-[var(--primary-light)]" />
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Evening Check-in
              </h3>
            </div>
            <p className="text-sm text-[var(--muted)] mb-5">
              How did today go? Celebrate your wins!
            </p>

            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-[var(--success)] flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {goal.title}
                    </span>
                    <Trophy size={14} className="text-[var(--warning)] ml-auto flex-shrink-0" />
                  </div>
                  <input
                    type="text"
                    value={winNotes[goal.id] || ""}
                    onChange={(e) =>
                      setWinNotes((prev) => ({
                        ...prev,
                        [goal.id]: e.target.value,
                      }))
                    }
                    placeholder="What's your win? (e.g. Finished ahead of schedule!)"
                    className="soft-input px-3 py-2 text-sm placeholder:text-[var(--muted)]/50"
                  />
                </div>
              ))}
            </div>

            {completedGoals.length > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={saveWinNotes}
                  disabled={savingWins}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingWins ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Trophy size={16} />
                      Save Wins
                    </>
                  )}
                </button>
              </div>
            )}

            {completedGoals.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--muted)]">
                  Complete a goal to log your win here.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {showAiSummary && viewingToday && (
        <section className="mb-6">
          <div className="insight-gradient rounded-[1.9rem] p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={20} className="text-white/90" />
              <h3 className="text-lg font-bold text-white">
                Your Day Summary
              </h3>
            </div>

            {loadingAi ? (
              <div className="space-y-2">
                <div
                  className="h-3 rounded w-full"
                  style={{ backgroundColor: "var(--primary-light)", opacity: 0.3 }}
                />
                <div
                  className="h-3 rounded w-4/5"
                  style={{ backgroundColor: "var(--primary-light)", opacity: 0.25 }}
                />
                <div
                  className="h-3 rounded w-3/5"
                  style={{ backgroundColor: "var(--primary-light)", opacity: 0.2 }}
                />
              </div>
            ) : aiSummary ? (
              <p className="text-sm leading-relaxed text-white/90">
                {aiSummary}
              </p>
            ) : (
              <p className="text-sm text-white/70">
                Could not generate summary. Try again later.
              </p>
            )}

            <div className="mt-4 flex items-center gap-1 text-xs text-white/70">
              <Sparkles size={12} />
              <span>Powered by NudgeAI</span>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

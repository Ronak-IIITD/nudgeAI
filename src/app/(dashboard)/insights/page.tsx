"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Flame,
  Target,
  Clock,
  Smile,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay, getDay } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoodCheckin {
  id: string;
  mood: number;
  energyLevel: number | null;
  note: string | null;
  date: string;
  timeOfDay: string;
}

interface DailyGoal {
  id: string;
  title: string;
  completed: boolean;
  date: string;
}

interface Habit {
  id: string;
  name: string;
  active: boolean;
  currentStreak: number;
  longestStreak: number;
  _count: { checkins: number };
}

interface HabitDetail {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  checkins: { id: string; date: string }[];
}

interface FocusSession {
  id: string;
  mode: string;
  workMinutes: number;
  totalFocusMinutes: number;
  startedAt: string;
  endedAt: string | null;
  completed: boolean;
  taskTitle: string | null;
}

// Per-day aggregated data
interface DayData {
  date: Date;
  dateStr: string;
  label: string;
  mood: number | null;
  goalsCompleted: number;
  goalsTotal: number;
  habitsChecked: number;
  focusMinutes: number;
}

type TimeRange = 7 | 30 | 90;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm animate-pulse ${className}`}
    >
      <div className="h-4 w-24 bg-[var(--border)] rounded mb-3" />
      <div className="h-8 w-16 bg-[var(--border)] rounded mb-2" />
      <div className="h-3 w-32 bg-[var(--border)] rounded" />
    </div>
  );
}

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm animate-pulse ${className}`}
    >
      <div className="h-4 w-32 bg-[var(--border)] rounded mb-4" />
      <div className="h-48 bg-[var(--border)] rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip Styles
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltipContent({
  active,
  payload,
  label,
  valueLabel,
  valueSuffix,
}: {
  active?: boolean;
  payload?: Array<Record<string, unknown>>;
  label?: string | number;
  valueLabel: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-md text-xs">
      <p className="text-[var(--muted)] mb-0.5">{String(label ?? "")}</p>
      <p className="font-semibold text-[var(--foreground)]">
        {valueLabel}: {String(value ?? "")}
        {valueSuffix ?? ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  const [range, setRange] = useState<TimeRange>(30);
  const [loading, setLoading] = useState(true);

  // Raw data from APIs
  const [moodData, setMoodData] = useState<MoodCheckin[]>([]);
  const [goalsMap, setGoalsMap] = useState<Map<string, DailyGoal[]>>(new Map());
  const [habits, setHabits] = useState<HabitDetail[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  // AI insight
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Date helpers
  // -------------------------------------------------------------------------

  const dateRange = useMemo(() => {
    const end = startOfDay(new Date());
    const start = startOfDay(subDays(end, range - 1));
    return eachDayOfInterval({ start, end });
  }, [range]);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchMood = useCallback(async () => {
    try {
      const res = await fetch(`/api/mood?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        // The API may return a single object for today or an array for range
        setMoodData(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silently fail */
    }
  }, [range]);

  const fetchGoals = useCallback(async () => {
    try {
      // Fetch goals for each day in range. To avoid N requests,
      // we batch by fetching a reasonable subset. For ranges > 30 days
      // we sample weekly. For now, fetch all days — the API is fast.
      const dates = dateRange.map((d) => format(d, "yyyy-MM-dd"));
      const results = new Map<string, DailyGoal[]>();

      // Fetch in parallel batches of 10
      for (let i = 0; i < dates.length; i += 10) {
        const batch = dates.slice(i, i + 10);
        const responses = await Promise.all(
          batch.map((date) =>
            fetch(`/api/goals?date=${date}`)
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => [])
          )
        );
        batch.forEach((date, idx) => {
          const goals = responses[idx];
          if (Array.isArray(goals) && goals.length > 0) {
            results.set(date, goals);
          }
        });
      }

      setGoalsMap(results);
    } catch {
      /* silently fail */
    }
  }, [dateRange]);

  const fetchHabits = useCallback(async () => {
    try {
      // First get list of active habits
      const listRes = await fetch("/api/habits?active=true");
      if (!listRes.ok) return;
      const habitList: Habit[] = await listRes.json();

      // Then get each habit's detail with checkins
      const details = await Promise.all(
        habitList.map((h) =>
          fetch(`/api/habits/${h.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      setHabits(details.filter(Boolean) as HabitDetail[]);
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchFocus = useCallback(async () => {
    try {
      const res = await fetch(`/api/focus?limit=500`);
      if (res.ok) {
        const data = await res.json();
        setFocusSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchAiInsight = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insight",
          context: {
            range,
            totalMoodEntries: moodData.length,
            averageMood:
              moodData.length > 0
                ? (
                    moodData.reduce((s, m) => s + m.mood, 0) / moodData.length
                  ).toFixed(1)
                : null,
          },
          additionalInfo: `Analyze the user's patterns over the last ${range} days and provide a personalized insight paragraph.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.message);
      }
    } catch {
      /* silently fail */
    } finally {
      setAiLoading(false);
    }
  }, [range, moodData]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMood(), fetchGoals(), fetchHabits(), fetchFocus()]).finally(
      () => setLoading(false)
    );
  }, [fetchMood, fetchGoals, fetchHabits, fetchFocus]);

  // Fetch AI insight after data loads
  useEffect(() => {
    if (!loading) {
      fetchAiInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, range]);

  // -------------------------------------------------------------------------
  // Aggregated Day Data
  // -------------------------------------------------------------------------

  const dayData: DayData[] = useMemo(() => {
    const rangeStart = startOfDay(subDays(new Date(), range - 1));

    return dateRange.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const label = format(date, "MMM d");

      // Mood — average if multiple entries per day
      const dayMoods = moodData.filter(
        (m) => format(new Date(m.date), "yyyy-MM-dd") === dateStr
      );
      const mood =
        dayMoods.length > 0
          ? dayMoods.reduce((s, m) => s + m.mood, 0) / dayMoods.length
          : null;

      // Goals
      const dayGoals = goalsMap.get(dateStr) || [];
      const goalsCompleted = dayGoals.filter((g) => g.completed).length;
      const goalsTotal = dayGoals.length;

      // Habits checked on this day
      const habitsChecked = habits.reduce((count, habit) => {
        const hasCheckin = habit.checkins?.some(
          (c) => format(new Date(c.date), "yyyy-MM-dd") === dateStr
        );
        return count + (hasCheckin ? 1 : 0);
      }, 0);

      // Focus minutes
      const dayFocus = focusSessions
        .filter(
          (f) =>
            format(new Date(f.startedAt), "yyyy-MM-dd") === dateStr &&
            new Date(f.startedAt) >= rangeStart
        )
        .reduce((s, f) => s + f.totalFocusMinutes, 0);

      return {
        date,
        dateStr,
        label,
        mood: mood ? Math.round(mood * 10) / 10 : null,
        goalsCompleted,
        goalsTotal,
        habitsChecked,
        focusMinutes: dayFocus,
      };
    });
  }, [dateRange, moodData, goalsMap, habits, focusSessions, range]);

  // -------------------------------------------------------------------------
  // Computed Stats
  // -------------------------------------------------------------------------

  // Stats overview
  const totalGoalsCompleted = dayData.reduce((s, d) => s + d.goalsCompleted, 0);
  const totalGoals = dayData.reduce((s, d) => s + d.goalsTotal, 0);
  const totalHabitsChecked = dayData.reduce((s, d) => s + d.habitsChecked, 0);

  const focusInRange = focusSessions.filter((f) => {
    const fDate = startOfDay(new Date(f.startedAt));
    const rangeStart = startOfDay(subDays(new Date(), range - 1));
    return fDate >= rangeStart;
  });

  const totalFocusMinutes = focusInRange.reduce(
    (s, f) => s + f.totalFocusMinutes,
    0
  );
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

  const completedSessions = focusInRange.filter((f) => f.totalFocusMinutes > 0);
  const avgSessionMinutes =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((s, f) => s + f.totalFocusMinutes, 0) /
            completedSessions.length
        )
      : 0;

  // Best focus day
  const focusByDay = dayData.reduce(
    (acc, d) => {
      if (d.focusMinutes > (acc.best?.focusMinutes ?? 0)) {
        return { best: d };
      }
      return acc;
    },
    { best: null as DayData | null }
  );
  const bestFocusDay = focusByDay.best;

  // Mood data for chart
  const moodChartData = dayData
    .filter((d) => d.mood !== null)
    .map((d) => ({
      label: d.label,
      mood: d.mood,
    }));

  // Average mood
  const moodEntries = dayData.filter((d) => d.mood !== null);
  const avgMood =
    moodEntries.length > 0
      ? Math.round(
          (moodEntries.reduce((s, d) => s + (d.mood ?? 0), 0) /
            moodEntries.length) *
            10
        ) / 10
      : null;

  // Goal completion rate
  const goalCompletionRate =
    totalGoals > 0 ? Math.round((totalGoalsCompleted / totalGoals) * 100) : 0;

  // Goal trend (compare first half vs second half)
  const halfPoint = Math.floor(dayData.length / 2);
  const firstHalfGoals = dayData.slice(0, halfPoint);
  const secondHalfGoals = dayData.slice(halfPoint);
  const firstHalfRate =
    firstHalfGoals.reduce((s, d) => s + d.goalsTotal, 0) > 0
      ? firstHalfGoals.reduce((s, d) => s + d.goalsCompleted, 0) /
        firstHalfGoals.reduce((s, d) => s + d.goalsTotal, 0)
      : 0;
  const secondHalfRate =
    secondHalfGoals.reduce((s, d) => s + d.goalsTotal, 0) > 0
      ? secondHalfGoals.reduce((s, d) => s + d.goalsCompleted, 0) /
        secondHalfGoals.reduce((s, d) => s + d.goalsTotal, 0)
      : 0;
  const goalTrending = secondHalfRate >= firstHalfRate ? "up" : "down";

  // Habit completion rate per habit
  const habitCompletionData = useMemo(() => {
    return habits.map((habit) => {
      const daysInRange = dateRange.length;
      const checkinsInRange = habit.checkins?.filter((c) => {
        const cDate = startOfDay(new Date(c.date));
        const rangeStart = startOfDay(subDays(new Date(), range - 1));
        return cDate >= rangeStart;
      }).length ?? 0;
      const rate = daysInRange > 0 ? Math.round((checkinsInRange / daysInRange) * 100) : 0;
      return {
        name: habit.name.length > 14 ? habit.name.slice(0, 12) + "..." : habit.name,
        fullName: habit.name,
        rate,
        checkins: checkinsInRange,
        total: daysInRange,
      };
    });
  }, [habits, dateRange, range]);

  // Productivity per day of week (for correlation insight)
  const productivityByDow = useMemo(() => {
    const byDay: Record<number, { goals: number; total: number; mood: number[]; focus: number }> = {};
    for (let i = 0; i < 7; i++) {
      byDay[i] = { goals: 0, total: 0, mood: [], focus: 0 };
    }
    dayData.forEach((d) => {
      const dow = getDay(d.date);
      byDay[dow].goals += d.goalsCompleted;
      byDay[dow].total += d.goalsTotal;
      byDay[dow].focus += d.focusMinutes;
      if (d.mood !== null) byDay[dow].mood.push(d.mood);
    });
    return byDay;
  }, [dayData]);

  // Most productive day
  const mostProductiveDay = useMemo(() => {
    let bestDay = 0;
    let bestScore = -1;
    Object.entries(productivityByDow).forEach(([dow, data]) => {
      const score = data.goals + data.focus / 30 + (data.mood.length > 0 ? data.mood.reduce((a, b) => a + b, 0) / data.mood.length : 0);
      if (score > bestScore) {
        bestScore = score;
        bestDay = parseInt(dow);
      }
    });
    return DAY_NAMES[bestDay];
  }, [productivityByDow]);

  // Mood-productivity correlation
  const moodProductivityCorrelation = useMemo(() => {
    const highMoodDays = dayData.filter((d) => d.mood !== null && d.mood >= 4);
    const lowMoodDays = dayData.filter((d) => d.mood !== null && d.mood < 4);

    const highMoodGoalRate =
      highMoodDays.reduce((s, d) => s + d.goalsTotal, 0) > 0
        ? highMoodDays.reduce((s, d) => s + d.goalsCompleted, 0) /
          highMoodDays.reduce((s, d) => s + d.goalsTotal, 0)
        : 0;

    const lowMoodGoalRate =
      lowMoodDays.reduce((s, d) => s + d.goalsTotal, 0) > 0
        ? lowMoodDays.reduce((s, d) => s + d.goalsCompleted, 0) /
          lowMoodDays.reduce((s, d) => s + d.goalsTotal, 0)
        : 0;

    const diff =
      lowMoodGoalRate > 0
        ? Math.round(((highMoodGoalRate - lowMoodGoalRate) / lowMoodGoalRate) * 100)
        : highMoodGoalRate > 0
          ? 100
          : 0;

    return { highMoodGoalRate, lowMoodGoalRate, diff };
  }, [dayData]);

  // -------------------------------------------------------------------------
  // Heatmap Data
  // -------------------------------------------------------------------------

  const heatmapData = useMemo(() => {
    // Build a grid: rows = weeks, columns = days (Sun-Sat)
    // Each cell is a DayData entry with intensity score
    const maxIntensity = Math.max(
      ...dayData.map(
        (d) => d.goalsCompleted + d.habitsChecked + d.focusMinutes / 15
      ),
      1
    );

    return dayData.map((d) => {
      const rawScore =
        d.goalsCompleted + d.habitsChecked + d.focusMinutes / 15;
      const intensity = Math.min(rawScore / maxIntensity, 1);
      return { ...d, intensity };
    });
  }, [dayData]);

  // Group heatmap into weeks
  const heatmapWeeks = useMemo(() => {
    const weeks: (typeof heatmapData[number] | null)[][] = [];
    let currentWeek: (typeof heatmapData[number] | null)[] = [];

    // Pad the first week with nulls for days before the range start
    if (heatmapData.length > 0) {
      const firstDow = getDay(heatmapData[0].date);
      for (let i = 0; i < firstDow; i++) {
        currentWeek.push(null);
      }
    }

    heatmapData.forEach((d) => {
      currentWeek.push(d);
      if (getDay(d.date) === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Pad the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [heatmapData]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Header title="Insights" />
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Insights" />

      {/* Time Range Selector */}
      <div className="flex items-center gap-2 mb-6">
        {([7, 30, 90] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              range === r
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--primary-light)]"
            }`}
          >
            {r} days
          </button>
        ))}
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-[var(--primary)]" />
            <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Goals Done
            </span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">
            {totalGoalsCompleted}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            of {totalGoals} total
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-[#fd79a8]" />
            <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Habits Checked
            </span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">
            {totalHabitsChecked}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            across {habits.length} habit{habits.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-[var(--primary)]" />
            <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Focus Hours
            </span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">
            {totalFocusHours}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {completedSessions.length} session
            {completedSessions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Smile size={16} className="text-[#00b894]" />
            <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
              Avg Mood
            </span>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">
            {avgMood ?? "—"}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {moodEntries.length} check-in{moodEntries.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mood Trend Chart */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Smile size={16} className="text-[var(--primary)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Mood Trend
            </h3>
          </div>
          {moodChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(
                    0,
                    Math.floor(moodChartData.length / 8) - 1
                  )}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={payload as unknown as Array<Record<string, unknown>>}
                      label={label}
                      valueLabel="Mood"
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#6c5ce7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#6c5ce7", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#6c5ce7", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--muted)]">
              No mood data for this period
            </div>
          )}
        </div>

        {/* Habit Completion Rate */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#00b894]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Habit Completion Rate
            </h3>
          </div>
          {habitCompletionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={habitCompletionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    const item = habitCompletionData.find((h) => h.name === label);
                    return (
                      <ChartTooltipContent
                        active={active}
                        payload={payload as unknown as Array<Record<string, unknown>>}
                        label={item?.fullName ?? String(label ?? "")}
                        valueLabel="Completion"
                        valueSuffix="%"
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="rate"
                  fill="#00b894"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--muted)]">
              No active habits tracked
            </div>
          )}
        </div>
      </div>

      {/* Productivity Heatmap */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={16} className="text-[var(--primary)]" />
          <h3 className="font-semibold text-[var(--foreground)]">
            Productivity Heatmap
          </h3>
          <span className="text-xs text-[var(--muted)] ml-auto">
            Goals + Habits + Focus
          </span>
        </div>
        <div className="overflow-x-auto">
          {/* Day labels */}
          <div className="flex gap-1 mb-1 pl-0">
            <div className="flex gap-1">
              {DAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="w-[18px] h-[14px] text-[9px] text-[var(--muted)] flex items-center justify-center"
                >
                  {name[0]}
                </div>
              ))}
            </div>
          </div>
          {/* Grid */}
          <div className="flex flex-col gap-1">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex gap-1">
                {week.map((cell, ci) => (
                  <div
                    key={ci}
                    title={
                      cell
                        ? `${cell.label}: ${cell.goalsCompleted} goals, ${cell.habitsChecked} habits, ${cell.focusMinutes}m focus`
                        : ""
                    }
                    className="w-[18px] h-[18px] rounded-[4px] transition-colors"
                    style={{
                      backgroundColor: cell
                        ? cell.intensity === 0
                          ? "var(--border)"
                          : `rgba(108, 92, 231, ${0.15 + cell.intensity * 0.85})`
                        : "transparent",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--muted)]">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((level) => (
              <div
                key={level}
                className="w-[14px] h-[14px] rounded-[3px]"
                style={{
                  backgroundColor:
                    level === 0
                      ? "var(--border)"
                      : `rgba(108, 92, 231, ${0.15 + level * 0.85})`,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Focus Stats + Goal Completion + Correlation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Focus Stats */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-[var(--primary)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Focus Stats
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Total Hours</span>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {totalFocusHours}h
              </span>
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Avg Session</span>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {avgSessionMinutes}m
              </span>
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Best Day</span>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {bestFocusDay && bestFocusDay.focusMinutes > 0
                  ? `${bestFocusDay.label} (${bestFocusDay.focusMinutes}m)`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Goal Completion Rate */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-[var(--primary)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Goal Completion
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#6c5ce7"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${goalCompletionRate * 2.64} ${264 - goalCompletionRate * 2.64}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-[var(--foreground)]">
                  {goalCompletionRate}%
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {goalTrending === "up" ? (
                  <TrendingUp size={16} className="text-[#00b894]" />
                ) : (
                  <TrendingDown size={16} className="text-[#fd79a8]" />
                )}
                <span
                  className={`text-sm font-medium ${
                    goalTrending === "up"
                      ? "text-[#00b894]"
                      : "text-[#fd79a8]"
                  }`}
                >
                  {goalTrending === "up" ? "Trending up" : "Trending down"}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {totalGoalsCompleted} of {totalGoals} completed
              </p>
              <p className="text-xs text-[var(--muted)]">
                over the last {range} days
              </p>
            </div>
          </div>
        </div>

        {/* Mood-Productivity Correlation */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-[var(--primary)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Patterns
            </h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-[#f8f7ff] p-3">
              <p className="text-sm text-[var(--foreground)]">
                <span className="font-semibold">Most productive on </span>
                <span className="text-[var(--primary)] font-bold">
                  {mostProductiveDay}s
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-[#f0fdf4] p-3">
              <p className="text-sm text-[var(--foreground)]">
                {moodProductivityCorrelation.diff > 0 ? (
                  <>
                    Good mood days correlate with{" "}
                    <span className="font-bold text-[#00b894]">
                      {moodProductivityCorrelation.diff}% more
                    </span>{" "}
                    goal completion
                  </>
                ) : moodProductivityCorrelation.diff < 0 ? (
                  <>
                    Interestingly, lower mood days show{" "}
                    <span className="font-bold text-[#fd79a8]">
                      {Math.abs(moodProductivityCorrelation.diff)}% more
                    </span>{" "}
                    goal completion
                  </>
                ) : (
                  <>
                    Mood doesn&apos;t significantly affect your goal completion
                    rate
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div
        className="rounded-2xl p-5 shadow-sm mb-6"
        style={{
          background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-white/90" />
          <h3 className="font-semibold text-white">AI Insights</h3>
        </div>
        {aiLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/20 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-white/20 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-white/20 rounded animate-pulse" />
          </div>
        ) : aiInsight ? (
          <p className="text-sm text-white/90 leading-relaxed">{aiInsight}</p>
        ) : (
          <p className="text-sm text-white/70 leading-relaxed">
            Not enough data to generate insights yet. Keep tracking your goals,
            habits, and mood to unlock personalized AI analysis.
          </p>
        )}
      </div>
    </>
  );
}

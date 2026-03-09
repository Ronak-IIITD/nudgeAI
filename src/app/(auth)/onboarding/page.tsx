"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Target,
  Clock,
  Repeat,
  Bell,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowRight,
  Lightbulb,
  Globe,
  Rocket,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const PRODUCTIVITY_GOALS = [
  { id: "deadlines", label: "Stay on top of deadlines", icon: Clock },
  { id: "habits", label: "Build better habits", icon: Repeat },
  { id: "focus", label: "Focus without distractions", icon: Target },
  { id: "goals", label: "Track daily goals", icon: Sparkles },
  { id: "mood", label: "Improve mood awareness", icon: Lightbulb },
];

const PRESET_HABITS = [
  { id: "exercise", label: "Exercise 30 min", category: "health" },
  { id: "read", label: "Read 20 pages", category: "learning" },
  { id: "meditate", label: "Meditate 10 min", category: "health" },
  { id: "water", label: "Drink 8 glasses of water", category: "health" },
  { id: "journal", label: "Journal before bed", category: "personal" },
  { id: "learn", label: "Learn something new", category: "learning" },
];

const STEP_COUNT = 5;

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
              i < current
                ? "bg-[var(--success)] text-white"
                : i === current
                ? "bg-[var(--primary)] text-white scale-110 shadow-lg shadow-[var(--primary)]/30"
                : "bg-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${
                i < current ? "bg-[var(--success)]" : "bg-[var(--border)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Wrapper (handles animations)
// ---------------------------------------------------------------------------

function StepWrapper({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: "forward" | "backward";
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`transition-all duration-400 ease-out ${
        visible
          ? "opacity-100 translate-x-0"
          : direction === "forward"
          ? "opacity-0 translate-x-8"
          : "opacity-0 -translate-x-8"
      }`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [submitting, setSubmitting] = useState(false);

  // Step 2: Quick Setup
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 3: First Deadline
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");

  // Step 4: First Habit
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [customHabit, setCustomHabit] = useState("");

  // Step 5: Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState<string[]>(["morning"]);

  // Pre-fill name
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
    // Try to guess timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES.includes(tz)) setTimezone(tz);
    } catch {
      // fallback to UTC
    }
  }, [session]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const goNext = () => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };

  const goBack = () => {
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleReminderTime = (time: string) => {
    setReminderTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // -------------------------------------------------------------------------
  // Complete Onboarding
  // -------------------------------------------------------------------------

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // Save user settings
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          timezone,
          onboarded: true,
        }),
      });

      // Create first deadline if provided
      if (deadlineTitle.trim() && deadlineDate) {
        await fetch("/api/deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: deadlineTitle.trim(),
            dueDate: deadlineDate,
          }),
        });
      }

      // Create first habit if selected
      const habitName =
        selectedHabit === "custom"
          ? customHabit.trim()
          : PRESET_HABITS.find((h) => h.id === selectedHabit)?.label;

      if (habitName) {
        const category =
          selectedHabit === "custom"
            ? "personal"
            : PRESET_HABITS.find((h) => h.id === selectedHabit)?.category ||
              "personal";

        await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: habitName,
            category,
            frequency: "daily",
          }),
        });
      }

      router.push("/dashboard");
    } catch {
      // Still redirect on error
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step Content
  // -------------------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      // ─── Step 1: Welcome ─────────────────────────────────
      case 0:
        return (
          <StepWrapper direction={direction} key="step-0">
            <div className="text-center max-w-lg mx-auto">
              {/* Illustration area */}
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20 mb-6">
                  <Sparkles size={40} className="text-white" />
                </div>
                <div className="flex items-center justify-center gap-3 text-3xl mb-2">
                  <span>&#x1F3AF;</span>
                  <span>&#x1F525;</span>
                  <span>&#x1F680;</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">
                Welcome to NudgeAI!
              </h1>
              <p className="text-[var(--muted)] mb-8">
                Your friendly AI companion for productivity. Let&apos;s set you
                up in under 3 minutes.
              </p>

              <div className="text-left space-y-4 mb-10 bg-[var(--surface-hover)] rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target size={16} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Smart deadline tracking
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      AI-powered reminders that adapt to your schedule
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Repeat size={16} className="text-[var(--success)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Habit building made easy
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Build streaks and stay consistent with gentle nudges
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={16} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Personalized AI coaching
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Daily insights and motivation tailored just for you
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[var(--primary)] text-white rounded-2xl font-medium hover:opacity-90 shadow-lg shadow-[var(--primary)]/20 text-base"
              >
                Let&apos;s get started
                <ArrowRight size={18} />
              </button>
            </div>
          </StepWrapper>
        );

      // ─── Step 2: Quick Setup ─────────────────────────────
      case 1:
        return (
          <StepWrapper direction={direction} key="step-1">
            <div className="max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2 text-center">
                Quick Setup
              </h2>
              <p className="text-[var(--muted)] text-center mb-8">
                Tell us a bit about yourself
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    What should we call you?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                    Your timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent appearance-none cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                    What are your productivity goals? (pick 2-3)
                  </label>
                  <div className="grid gap-2">
                    {PRODUCTIVITY_GOALS.map((goal) => {
                      const Icon = goal.icon;
                      const selected = selectedGoals.includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => toggleGoal(goal.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? "border-[var(--primary)] bg-[var(--surface-hover)]"
                              : "border-[var(--border)] hover:border-[var(--primary-light)]"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              selected
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface-hover)] text-[var(--muted)]"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              selected
                                ? "text-[var(--foreground)]"
                                : "text-[var(--muted)]"
                            }`}
                          >
                            {goal.label}
                          </span>
                          {selected && (
                            <Check
                              size={16}
                              className="ml-auto text-[var(--primary)]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </StepWrapper>
        );

      // ─── Step 3: First Deadline ──────────────────────────
      case 2:
        return (
          <StepWrapper direction={direction} key="step-2">
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--warning)]/10 flex items-center justify-center mb-4">
                  <Clock size={28} className="text-[var(--warning)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Set Your First Deadline
                </h2>
                <p className="text-[var(--muted)]">
                  What&apos;s something you need to get done soon?
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    What needs to get done?
                  </label>
                  <input
                    type="text"
                    value={deadlineTitle}
                    onChange={(e) => setDeadlineTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="e.g., Finish project report"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                  <Lightbulb
                    size={16}
                    className="text-[var(--primary)] mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs text-[var(--primary)]">
                    Try: &quot;Finish project by Friday&quot; or &quot;Submit
                    report by March 15&quot;
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    When is it due?
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--muted)] text-center mt-6">
                You can skip this and add deadlines later from your dashboard.
              </p>
            </div>
          </StepWrapper>
        );

      // ─── Step 4: First Habit ─────────────────────────────
      case 3:
        return (
          <StepWrapper direction={direction} key="step-3">
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--success)]/10 flex items-center justify-center mb-4">
                  <Repeat size={28} className="text-[var(--success)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Pick a Habit to Build
                </h2>
                <p className="text-[var(--muted)]">
                  Start with one habit. Small wins lead to big changes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {PRESET_HABITS.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => {
                      setSelectedHabit(habit.id);
                      setCustomHabit("");
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedHabit === habit.id
                        ? "border-[var(--success)] bg-[var(--success)]/5"
                        : "border-[var(--border)] hover:border-[var(--success)]/50"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        selectedHabit === habit.id
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {habit.label}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-1 capitalize">
                      {habit.category}
                    </p>
                  </button>
                ))}
              </div>

              {/* Custom option */}
              <div
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedHabit === "custom"
                    ? "border-[var(--success)] bg-[var(--success)]/5"
                    : "border-[var(--border)]"
                }`}
              >
                <button
                  onClick={() => setSelectedHabit("custom")}
                  className="text-sm font-medium text-[var(--foreground)] mb-2 w-full text-left"
                >
                  Or create your own:
                </button>
                {selectedHabit === "custom" && (
                  <input
                    type="text"
                    value={customHabit}
                    onChange={(e) => setCustomHabit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--success)] focus:border-transparent"
                    placeholder="e.g., Walk 10,000 steps"
                    autoFocus
                  />
                )}
              </div>

              <p className="text-xs text-[var(--muted)] text-center mt-6">
                You can add more habits anytime from the Habits page.
              </p>
            </div>
          </StepWrapper>
        );

      // ─── Step 5: Notifications ───────────────────────────
      case 4:
        return (
          <StepWrapper direction={direction} key="step-4">
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                  <Bell size={28} className="text-[var(--accent)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                  Stay in the Loop
                </h2>
                <p className="text-[var(--muted)]">
                  Choose how NudgeAI keeps you on track.
                </p>
              </div>

              <div className="space-y-1 bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 mb-6">
                {/* Push toggle */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-[var(--muted)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Browser push notifications
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Real-time reminders in your browser
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pushEnabled}
                    onClick={() => setPushEnabled(!pushEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      pushEnabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        pushEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Email toggle */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-[var(--muted)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Email notifications
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Daily summaries and important updates
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emailEnabled}
                    onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      emailEnabled
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        emailEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Preferred reminder times */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                  When should we nudge you?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "morning", label: "Morning", time: "8-10 AM", emoji: "&#x1F305;" },
                    { id: "afternoon", label: "Afternoon", time: "1-3 PM", emoji: "&#x2600;&#xFE0F;" },
                    { id: "evening", label: "Evening", time: "6-8 PM", emoji: "&#x1F307;" },
                  ].map((slot) => {
                    const selected = reminderTimes.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => toggleReminderTime(slot.id)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          selected
                            ? "border-[var(--primary)] bg-[var(--surface-hover)]"
                            : "border-[var(--border)] hover:border-[var(--primary-light)]"
                        }`}
                      >
                        <span
                          className="text-2xl block mb-1"
                          dangerouslySetInnerHTML={{ __html: slot.emoji }}
                        />
                        <p
                          className={`text-sm font-medium ${
                            selected
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {slot.label}
                        </p>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">
                          {slot.time}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </StepWrapper>
        );

      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--primary)]">NudgeAI</h1>
          {step > 0 && step < STEP_COUNT - 1 && (
            <button
              onClick={goNext}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 pt-4">
        <StepIndicator current={step} total={STEP_COUNT} />
      </div>

      {/* Step Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">{renderStep()}</div>

      {/* Navigation Footer */}
      <div className="px-6 py-6 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)]"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEP_COUNT - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] rounded-xl hover:opacity-90 shadow-sm"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl hover:opacity-90 shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  Done! Take me to my dashboard
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

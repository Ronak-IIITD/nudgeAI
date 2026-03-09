"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Header from "@/components/layout/Header";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Timer,
  Settings2,
  Sparkles,
  Coffee,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimerMode = "pomodoro" | "custom" | "flow";
type TimerPhase = "work" | "break" | "longBreak" | "idle" | "done";
type TimerStatus = "idle" | "running" | "paused";

interface FocusSession {
  id: string;
  mode: string;
  workMinutes: number;
  breakMinutes: number;
  rounds: number;
  currentRound: number;
  taskTitle: string | null;
  totalFocusMinutes: number | null;
  completed: boolean;
  startedAt: string;
  endedAt: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POMODORO_DEFAULTS = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  rounds: 4,
};

const AI_MESSAGES = [
  "Amazing focus session! You showed up for yourself today.",
  "That was incredible! Your future self is thanking you right now.",
  "Deep work done. You're building something great, one session at a time.",
  "Wonderful session! Rest well — you've earned it.",
  "You just proved that consistency beats motivation. Well done!",
  "Another session in the books! Small steps, big results.",
  "Your ability to focus is a superpower. Never forget that.",
  "Beautiful work! Take a moment to appreciate what you just accomplished.",
];

const MODE_TABS: { key: TimerMode; label: string; icon: typeof Timer }[] = [
  { key: "pomodoro", label: "Pomodoro", icon: Timer },
  { key: "custom", label: "Custom", icon: Settings2 },
  { key: "flow", label: "Flow", icon: Zap },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.abs(totalSeconds) % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomAIMessage(): string {
  return AI_MESSAGES[Math.floor(Math.random() * AI_MESSAGES.length)];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FocusPage() {
  // -- Mode & config --------------------------------------------------------
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [customRounds, setCustomRounds] = useState(4);

  // -- Timer state ----------------------------------------------------------
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_DEFAULTS.workMinutes * 60);
  const [flowSeconds, setFlowSeconds] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [taskTitle, setTaskTitle] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // -- Stats & history ------------------------------------------------------
  const [todaySessions, setTodaySessions] = useState<FocusSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // -- UI -------------------------------------------------------------------
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // -- Refs -----------------------------------------------------------------
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusStartRef = useRef<Date | null>(null);
  const workAccumRef = useRef(0); // accumulated work seconds this session

  // -- Derived config -------------------------------------------------------
  const config = useMemo(() => mode === "pomodoro"
    ? POMODORO_DEFAULTS
    : { workMinutes: customWork, breakMinutes: customBreak, longBreakMinutes: customBreak * 3, rounds: customRounds },
    [mode, customWork, customBreak, customRounds]
  );

  const totalRounds = config.rounds;

  // -----------------------------------------------------------------------
  // Fetch today's sessions
  // -----------------------------------------------------------------------

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/focus?date=${todayISO()}`);
      if (res.ok) {
        const data = await res.json();
        setTodaySessions(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // -----------------------------------------------------------------------
  // Stats derived from history
  // -----------------------------------------------------------------------

  const completedSessions = todaySessions.filter((s) => s.completed);
  const totalFocusMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.totalFocusMinutes ?? 0),
    0
  );
  const totalSessionCount = completedSessions.length;
  const bestStreak = completedSessions.reduce(
    (max, s) => Math.max(max, s.totalFocusMinutes ?? 0),
    0
  );

  // -----------------------------------------------------------------------
  // Timer tick
  // -----------------------------------------------------------------------

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Advance to next phase (break/work/done)
  const advancePhase = useCallback(() => {
    if (mode === "flow") return; // flow has no phases

    if (phase === "work") {
      workAccumRef.current += config.workMinutes * 60;
      if (currentRound >= totalRounds) {
        // All rounds done
        setPhase("done");
        setStatus("idle");
        clearTimer();
        return "done";
      }
      // Determine break type
      const isLongBreak = currentRound % 4 === 0;
      const breakDuration = isLongBreak ? config.longBreakMinutes : config.breakMinutes;
      setPhase(isLongBreak ? "longBreak" : "break");
      setSecondsLeft(breakDuration * 60);
      return "break";
    }

    if (phase === "break" || phase === "longBreak") {
      setCurrentRound((r) => r + 1);
      setPhase("work");
      setSecondsLeft(config.workMinutes * 60);
      return "work";
    }

    return null;
  }, [mode, phase, currentRound, totalRounds, config, clearTimer]);

  const tick = useCallback(() => {
    if (mode === "flow") {
      setFlowSeconds((s) => s + 1);
      return;
    }

    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Phase ended — schedule advance on next frame to avoid state conflicts
        setTimeout(() => advancePhase(), 0);
        return 0;
      }
      return prev - 1;
    });
  }, [mode, advancePhase]);

  // Start/stop interval when status changes
  useEffect(() => {
    if (status === "running") {
      clearTimer();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [status, tick, clearTimer]);

  // When phase becomes "done", finalize session
  useEffect(() => {
    if (phase === "done" && sessionId) {
      finalizeSession(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // -----------------------------------------------------------------------
  // API calls
  // -----------------------------------------------------------------------

  const createSession = async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          workMinutes: mode === "flow" ? 0 : config.workMinutes,
          breakMinutes: mode === "flow" ? 0 : config.breakMinutes,
          rounds: mode === "flow" ? 1 : config.rounds,
          taskTitle: taskTitle.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch {
      // silently fail
    }
    return null;
  };

  const finalizeSession = async (completed: boolean) => {
    if (!sessionId) return;

    let totalMinutes: number;
    if (mode === "flow") {
      totalMinutes = Math.round(flowSeconds / 60);
    } else {
      // Calculate actual work time: completed rounds * work duration + partial current round
      const completedWorkSeconds = workAccumRef.current;
      const currentPhaseIsWork = phase === "work" || phase === "done";
      const partialWork = currentPhaseIsWork
        ? config.workMinutes * 60 - secondsLeft
        : 0;
      totalMinutes = Math.round((completedWorkSeconds + partialWork) / 60);
    }

    try {
      await fetch(`/api/focus/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
          completed,
          totalFocusMinutes: Math.max(totalMinutes, 1),
          currentRound: currentRound,
        }),
      });
    } catch {
      // silently fail
    }

    if (completed) {
      setAiMessage(randomAIMessage());
    }

    fetchHistory();
  };

  // -----------------------------------------------------------------------
  // Controls
  // -----------------------------------------------------------------------

  const handleStart = async () => {
    setAiMessage(null);

    if (mode === "flow") {
      setFlowSeconds(0);
      setPhase("work");
    } else {
      setSecondsLeft(config.workMinutes * 60);
      setCurrentRound(1);
      setPhase("work");
      workAccumRef.current = 0;
    }

    focusStartRef.current = new Date();
    const id = await createSession();
    setSessionId(id);
    setStatus("running");
  };

  const handlePause = () => {
    setStatus("paused");
  };

  const handleResume = () => {
    setStatus("running");
  };

  const handleStop = async () => {
    clearTimer();
    setStatus("idle");
    const wasRunning = phase !== "idle" && phase !== "done";
    setPhase("idle");

    if (wasRunning && sessionId) {
      await finalizeSession(false);
    }

    setSessionId(null);
    setSecondsLeft(config.workMinutes * 60);
    setFlowSeconds(0);
    setCurrentRound(1);
    workAccumRef.current = 0;
  };

  const handleSkip = () => {
    if (mode === "flow") return;
    const result = advancePhase();
    if (result === "done") {
      // phase will be set to done, finalizeSession handled in useEffect
    }
  };

  const handleModeChange = (newMode: TimerMode) => {
    if (status !== "idle") return; // can't change mode while running
    setMode(newMode);
    setPhase("idle");
    setAiMessage(null);
    if (newMode === "pomodoro") {
      setSecondsLeft(POMODORO_DEFAULTS.workMinutes * 60);
    } else if (newMode === "custom") {
      setSecondsLeft(customWork * 60);
    } else {
      setFlowSeconds(0);
    }
  };

  // Update timer when custom settings change
  useEffect(() => {
    if (mode === "custom" && status === "idle") {
      setSecondsLeft(customWork * 60);
    }
  }, [customWork, mode, status]);

  // -----------------------------------------------------------------------
  // Derived display values
  // -----------------------------------------------------------------------

  const displayTime = mode === "flow" ? formatTime(flowSeconds) : formatTime(secondsLeft);
  const isWorkPhase = phase === "work";
  const isBreakPhase = phase === "break" || phase === "longBreak";
  const isIdle = status === "idle";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isActive = isRunning || isPaused;

  const phaseLabel =
    phase === "work"
      ? "Focus Time"
      : phase === "break"
        ? "Short Break"
        : phase === "longBreak"
          ? "Long Break"
          : phase === "done"
            ? "Session Complete"
            : "Ready to Focus";

  // Progress for circular timer (0-1)
  const progress = (() => {
    if (mode === "flow") return null; // no progress ring in flow
    if (phase === "idle" || phase === "done") return 0;
    const total =
      phase === "work"
        ? config.workMinutes * 60
        : phase === "longBreak"
          ? config.longBreakMinutes * 60
          : config.breakMinutes * 60;
    return total > 0 ? 1 - secondsLeft / total : 0;
  })();

  // Circle dimensions
  const CIRCLE_SIZE = 240;
  const STROKE_WIDTH = 6;
  const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = progress !== null ? CIRCUMFERENCE * (1 - progress) : CIRCUMFERENCE;

  const ringColor = isBreakPhase
    ? "var(--success)"
    : "var(--primary)";

  const ringTrackColor = isBreakPhase
    ? "rgba(0,184,148,0.15)"
    : "rgba(108,92,231,0.12)";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Header title="Focus Timer" />

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* ---- Main Timer Column ---- */}
        <div className="flex-1 flex flex-col items-center">
          {/* Mode Tabs */}
          <div className="flex bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-1 mb-8 w-full max-w-sm">
            {MODE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleModeChange(key)}
                disabled={isActive}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  mode === key
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                } ${isActive ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Task Input */}
          <div className="w-full max-w-sm mb-6">
            <input
              type="text"
              placeholder="What are you working on?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              disabled={isActive}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] focus:border-transparent disabled:opacity-60"
            />
          </div>

          {/* Phase Label */}
          <div className="mb-4 flex items-center gap-2">
            {isBreakPhase && <Coffee size={18} className="text-[var(--success)]" />}
            {isWorkPhase && <Zap size={18} className="text-[var(--primary)]" />}
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{
                color: isBreakPhase
                  ? "var(--success)"
                  : phase === "done"
                    ? "var(--warning)"
                    : "var(--primary)",
              }}
            >
              {phaseLabel}
            </span>
          </div>

          {/* Circular Timer */}
          <div className="relative flex items-center justify-center mb-6" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
            <svg
              width={CIRCLE_SIZE}
              height={CIRCLE_SIZE}
              className="absolute inset-0 -rotate-90"
            >
              {/* Track */}
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={ringTrackColor}
                strokeWidth={STROKE_WIDTH}
              />
              {/* Progress */}
              {progress !== null && (
                <circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              )}
            </svg>

            {/* Inner circle + time */}
            <div
              className="relative z-10 rounded-full flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] shadow-sm"
              style={{ width: CIRCLE_SIZE - 24, height: CIRCLE_SIZE - 24 }}
            >
              <span
                className="text-5xl font-bold tabular-nums tracking-tight"
                style={{
                  color: isBreakPhase ? "var(--success)" : "var(--foreground)",
                }}
              >
                {displayTime}
              </span>
              {mode === "flow" && isActive && (
                <span className="text-xs text-[var(--muted)] mt-1">elapsed</span>
              )}
            </div>
          </div>

          {/* Round Progress (not flow) */}
          {mode !== "flow" && (
            <div className="flex flex-col items-center mb-6 gap-2">
              <span className="text-sm text-[var(--muted)]">
                Round {currentRound} of {totalRounds}
              </span>
              <div className="flex gap-2">
                {Array.from({ length: totalRounds }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full transition-all"
                    style={{
                      backgroundColor:
                        i < currentRound && (isActive || phase === "done")
                          ? "var(--primary)"
                          : i === currentRound - 1 && isActive
                            ? "var(--primary-light)"
                            : "var(--border)",
                      transform:
                        i === currentRound - 1 && isRunning && isWorkPhase
                          ? "scale(1.3)"
                          : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 mb-8">
            {isIdle && phase !== "done" && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-base hover:opacity-90 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Play size={20} fill="white" />
                Start
              </button>
            )}

            {isRunning && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--warning)] text-[var(--foreground)] font-semibold text-base hover:opacity-90 shadow-md cursor-pointer"
              >
                <Pause size={20} />
                Pause
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-base hover:opacity-90 shadow-md cursor-pointer"
              >
                <Play size={20} fill="white" />
                Resume
              </button>
            )}

            {isActive && (
              <>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] font-medium text-sm hover:bg-red-50 hover:text-[var(--danger)] hover:border-red-200 cursor-pointer"
                >
                  <Square size={18} />
                  Stop
                </button>

                {mode !== "flow" && (
                  <button
                    onClick={handleSkip}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] font-medium text-sm hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <SkipForward size={18} />
                    Skip
                  </button>
                )}
              </>
            )}

            {phase === "done" && isIdle && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-base hover:opacity-90 shadow-md cursor-pointer"
              >
                <Play size={20} fill="white" />
                New Session
              </button>
            )}
          </div>

          {/* Custom Settings (inline) */}
          {mode === "custom" && isIdle && (
            <div className="w-full max-w-sm bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={16} className="text-[var(--primary)]" />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Custom Settings
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">
                    Work (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customWork}
                    onChange={(e) => setCustomWork(Math.max(1, Math.min(120, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">
                    Break (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customBreak}
                    onChange={(e) => setCustomBreak(Math.max(1, Math.min(60, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">
                    Rounds
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={customRounds}
                    onChange={(e) => setCustomRounds(Math.max(1, Math.min(12, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Message */}
          {aiMessage && (
            <div className="w-full max-w-sm bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-8 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-0.5">
                  NudgeAI
                </p>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {aiMessage}
                </p>
              </div>
            </div>
          )}

          {/* Session History */}
          <div className="w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
              Today&apos;s Sessions
            </h3>
            {loadingHistory ? (
              <div className="text-sm text-[var(--muted)] py-4 text-center">
                Loading...
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="text-sm text-[var(--muted)] py-4 text-center bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                No sessions yet today. Start your first focus session!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: s.completed
                            ? "var(--success)"
                            : "var(--muted)",
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {s.taskTitle || s.mode.charAt(0).toUpperCase() + s.mode.slice(1)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {new Date(s.startedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {s.totalFocusMinutes ?? 0}m
                      </span>
                      {s.completed && (
                        <span className="block text-xs text-[var(--success)]">
                          completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---- Stats Sidebar ---- */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 lg:sticky lg:top-8">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
              Today&apos;s Stats
            </h3>

            <div className="flex flex-col gap-5">
              {/* Total Focus */}
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Total Focus</p>
                <p className="text-3xl font-bold text-[var(--primary)]">
                  {totalFocusMinutes}
                  <span className="text-base font-medium text-[var(--muted)] ml-1">
                    min
                  </span>
                </p>
              </div>

              {/* Sessions */}
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Sessions</p>
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {totalSessionCount}
                </p>
              </div>

              {/* Best Session */}
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">
                  Best Session
                </p>
                <p className="text-3xl font-bold text-[var(--success)]">
                  {bestStreak}
                  <span className="text-base font-medium text-[var(--muted)] ml-1">
                    min
                  </span>
                </p>
              </div>

              {/* Visual bar */}
              <div>
                <p className="text-xs text-[var(--muted)] mb-2">
                  Daily Goal (120 min)
                </p>
                <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (totalFocusMinutes / 120) * 100)}%`,
                      backgroundColor: "var(--primary)",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 text-right">
                  {Math.round((totalFocusMinutes / 120) * 100)}%
                </p>
              </div>
            </div>

            {/* Mode descriptions */}
            <div className="mt-6 pt-5 border-t border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--foreground)] mb-2">
                Timer Modes
              </p>
              <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
                <div className="flex items-start gap-2">
                  <Timer size={13} className="mt-0.5 flex-shrink-0 text-[var(--primary)]" />
                  <span>
                    <strong className="text-[var(--foreground)]">Pomodoro</strong>{" "}
                    — 25/5 min, long break every 4 rounds
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Settings2 size={13} className="mt-0.5 flex-shrink-0 text-[var(--primary)]" />
                  <span>
                    <strong className="text-[var(--foreground)]">Custom</strong>{" "}
                    — Set your own durations
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap size={13} className="mt-0.5 flex-shrink-0 text-[var(--primary)]" />
                  <span>
                    <strong className="text-[var(--foreground)]">Flow</strong>{" "}
                    — Pure focus, no breaks, counts up
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

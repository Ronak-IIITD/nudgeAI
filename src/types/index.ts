import { Session } from "next-auth";

export interface ExtendedSession extends Session {
  user: Session["user"] & {
    id: string;
  };
}

export type DeadlinePriority = "low" | "medium" | "high" | "urgent";

export type HabitCategory = "health" | "learning" | "work" | "personal" | "custom";

export type HabitFrequency = "daily" | "weekdays" | "weekly" | "custom";

export type FocusMode = "pomodoro" | "custom" | "flow";

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type AiTone = "friendly" | "motivational" | "direct";

export type SubscriptionTier = "free" | "pro" | "team";

export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: "Exhausted",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Energized",
};

export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  1: "\u{1F62B}",
  2: "\u{1F614}",
  3: "\u{1F610}",
  4: "\u{1F60A}",
  5: "\u{1F525}",
};

export const HABIT_CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "custom", label: "Custom" },
];

export const PRIORITY_COLORS: Record<DeadlinePriority, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

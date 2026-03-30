import type { TimeOfDay } from "@/types";

export function normalizeToMidnightUTC(date: Date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

export function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function getUtcDayRange(date: Date) {
  const startDate = normalizeToMidnightUTC(date);
  return {
    startDate,
    endDate: addUtcDays(startDate, 1),
  };
}

export function parseDateInput(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseDayParam(value: string | null) {
  if (!value) return null;
  if (value === "today") return normalizeToMidnightUTC(new Date());

  const parsed = parseDateInput(value);
  return parsed ? normalizeToMidnightUTC(parsed) : null;
}

export function parseDayParamOrToday(value: string | null) {
  return parseDayParam(value) ?? normalizeToMidnightUTC(new Date());
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function getUtcTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getUTCHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function getTimeOfDayInTimezone(timezone?: string | null, date = new Date()): TimeOfDay {
  try {
    const hourString = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone || "UTC",
    }).format(date);

    const hour = Number(hourString);
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  } catch {
    return getUtcTimeOfDay(date);
  }
}

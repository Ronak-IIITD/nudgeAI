import * as chrono from "chrono-node";

export const DEFAULT_REMINDER_INTERVALS = [10080, 4320, 1440, 720, 120];

export function parseDeadlineDueDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const standardDate = new Date(trimmedValue);
  if (!Number.isNaN(standardDate.getTime())) {
    return standardDate;
  }

  return chrono.parseDate(trimmedValue) ?? null;
}

export function normalizeReminderIntervals(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_REMINDER_INTERVALS;
  }

  return value.filter(
    (minutesBefore): minutesBefore is number =>
      Number.isInteger(minutesBefore) && minutesBefore >= 0
  );
}

export function buildReminderSchedule(
  dueDate: Date,
  reminderIntervals: number[],
  now = new Date()
) {
  return reminderIntervals
    .map((minutesBefore) => ({
      scheduledAt: new Date(dueDate.getTime() - minutesBefore * 60 * 1000),
    }))
    .filter((reminder) => reminder.scheduledAt > now);
}

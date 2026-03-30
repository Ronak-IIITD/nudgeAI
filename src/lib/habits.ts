import { prisma } from "@/lib/prisma";
import { normalizeToMidnightUTC } from "@/lib/dates";

export function getRecentHabitWindow(days = 30) {
  const startDate = normalizeToMidnightUTC(new Date());
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(days - 1, 0));
  return startDate;
}

export async function calculateHabitStreak(habitId: string) {
  const checkins = await prisma.habitCheckin.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (checkins.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const uniqueDates = Array.from(
    new Set(checkins.map((checkin) => normalizeToMidnightUTC(checkin.date).getTime()))
  ).sort((left, right) => right - left);

  const oneDayMs = 24 * 60 * 60 * 1000;
  const today = normalizeToMidnightUTC(new Date()).getTime();

  let currentStreak = 0;
  let expectedDate = today;

  if (uniqueDates[0] === today) {
    expectedDate = today;
  } else if (uniqueDates[0] === today - oneDayMs) {
    expectedDate = today - oneDayMs;
  } else {
    expectedDate = -1;
  }

  if (expectedDate >= 0) {
    for (const date of uniqueDates) {
      if (date === expectedDate) {
        currentStreak += 1;
        expectedDate -= oneDayMs;
      } else if (date < expectedDate) {
        break;
      }
    }
  }

  let longestStreak = 1;
  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (uniqueDates[index - 1] - uniqueDates[index] === oneDayMs) {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

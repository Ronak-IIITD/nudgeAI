import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNudge, type NudgeContext, type NudgeType } from "@/lib/ai";
import {
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";
import { getTimeOfDay, normalizeToMidnightUTC } from "@/lib/dates";

export const dynamic = "force-dynamic";

type BrowserNotificationPayload = {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  type: string;
  tag: string;
};

type NotificationCandidate = {
  score: number;
  reason: string;
  type: string;
  title: string;
  actionUrl: string;
  tag: string;
  nudgeType?: NudgeType;
  context?: Partial<NudgeContext>;
  additionalInfo?: string;
  fallbackBody?: string;
};

function getDeadlineUrgency(minutesLeft: number): "low" | "medium" | "high" | "overdue" {
  if (minutesLeft <= 0) return "overdue";
  if (minutesLeft <= 60) return "high";
  if (minutesLeft <= 180) return "medium";
  return "low";
}

function minutesUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / 60000);
}

function isWithinQuietHours(now: Date, start?: string | null, end?: string | null) {
  if (!start || !end) return false;

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

async function buildPayload(
  candidate: NotificationCandidate,
  nudgeContext: NudgeContext,
  now: Date
): Promise<BrowserNotificationPayload> {
  let body = candidate.fallbackBody || "You have a thoughtful reminder waiting.";

  if (candidate.nudgeType) {
    try {
      body = await generateNudge(
        candidate.nudgeType,
        {
          ...nudgeContext,
          ...candidate.context,
        },
        candidate.additionalInfo
      );
    } catch {
      body = candidate.fallbackBody || body;
    }
  }

  return {
    id: `${candidate.type}-${now.toISOString()}`,
    title: candidate.title,
    body,
    actionUrl: candidate.actionUrl,
    type: candidate.type,
    tag: candidate.tag,
  };
}

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        aiTone: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        browserNotificationsEnabled: true,
      },
    });

    if (!user) {
      return notFound("User");
    }

    if (!user.browserNotificationsEnabled) {
      return NextResponse.json({ notification: null, reason: "browser-disabled" });
    }

    if (isWithinQuietHours(now, user.quietHoursStart, user.quietHoursEnd)) {
      return NextResponse.json({ notification: null, reason: "quiet-hours" });
    }

    const lastFifteenMinutes = new Date(now.getTime() - 15 * 60 * 1000);
    const recentlySent = await prisma.notification.findFirst({
      where: {
        userId,
        createdAt: { gte: lastFifteenMinutes },
        type: { startsWith: "browser_" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentlySent) {
      return NextResponse.json({ notification: null, reason: "rate-limited" });
    }

    const today = normalizeToMidnightUTC(now);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [latestMood, deadlines, habits, goals] = await Promise.all([
      prisma.moodCheckin.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deadline.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { gte: now },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.habit.findMany({
        where: { userId, active: true },
        take: 8,
        include: {
          checkins: {
            where: {
              date: { gte: today, lt: tomorrow },
            },
            take: 1,
          },
        },
      }),
      prisma.dailyGoal.findMany({
        where: {
          userId,
          date: { gte: today, lt: tomorrow },
        },
        orderBy: { order: "asc" },
      }),
    ]);

    const timeOfDay = getTimeOfDay(now);
    const completedGoalsToday = goals.filter((goal) => goal.completed).length;
    const remainingGoals = goals.filter((goal) => !goal.completed);
    const incompleteHabits = habits.filter((habit) => habit.checkins.length === 0);

    const nudgeContext: NudgeContext = {
      userName: user.name || "there",
      aiTone: user.aiTone as NudgeContext["aiTone"],
      mood: latestMood?.mood,
      timeOfDay,
      completedGoalsToday,
      totalGoalsToday: goals.length,
      activeHabitsCount: habits.length,
      upcomingDeadlinesCount: deadlines.length,
    };

    const candidates: NotificationCandidate[] = [];

    for (const deadline of deadlines) {
      const minutesLeft = minutesUntil(deadline.dueDate);
      const urgency = getDeadlineUrgency(minutesLeft);
      let score = 0;

      if (urgency === "overdue") score += 140;
      else if (urgency === "high") score += 125;
      else if (urgency === "medium") score += 95;
      else score += 55;

      score += Math.min(deadline.snoozedCount * 6, 24);

      if (deadline.priority === "urgent") score += 20;
      else if (deadline.priority === "high") score += 12;

      if (latestMood?.mood && latestMood.mood <= 2 && urgency !== "overdue") {
        score -= 8;
      }

      candidates.push({
        score,
        reason: `deadline-${urgency}`,
        type: "browser_deadline",
        title: `Deadline coming up: ${deadline.title}`,
        actionUrl: "/deadlines",
        tag: `deadline-${deadline.id}`,
        nudgeType: deadline.snoozedCount >= 3 ? "procrastination" : "deadline_reminder",
        context: {
          deadlineUrgency: urgency,
          snoozedCount: deadline.snoozedCount,
        },
        additionalInfo: `${deadline.title} is due ${deadline.dueDate.toLocaleString()}`,
        fallbackBody: `Heads up - ${deadline.title} is coming up soon.`,
      });
    }

    for (const habit of incompleteHabits) {
      let score = 44 + Math.min(habit.currentStreak, 10) * 3;
      if (timeOfDay === "evening") score += 10;
      if (latestMood?.mood && latestMood.mood >= 4) score += 4;

      candidates.push({
        score,
        reason: "habit-open",
        type: "browser_habit",
        title: `Little habit nudge: ${habit.name}`,
        actionUrl: "/habits",
        tag: `habit-${habit.id}`,
        nudgeType: "habit_nudge",
        context: {
          streakCount: habit.currentStreak,
        },
        additionalInfo: habit.name,
        fallbackBody: `A quick check-in on ${habit.name} could keep the streak warm.`,
      });
    }

    if (remainingGoals.length > 0) {
      let score = 0;
      if (timeOfDay === "morning") score += 78;
      else if (timeOfDay === "afternoon") score += 68;
      else score += 62;

      score += Math.min(remainingGoals.length * 4, 20);

      if (completedGoalsToday > 0) score += 6;
      if (latestMood?.mood && latestMood.mood <= 2) score -= 6;

      candidates.push({
        score,
        reason: "goals-remaining",
        type: "browser_goal",
        title: timeOfDay === "morning" ? "Shape today with a clear next step" : "A gentle check-in for today",
        actionUrl: "/goals",
        tag: `goals-${today.toISOString()}`,
        nudgeType: timeOfDay === "evening" && remainingGoals.length >= 3 ? "procrastination" : "daily_goal",
        context: {
          snoozedCount: remainingGoals.length,
        },
        additionalInfo: `Remaining goals: ${remainingGoals.slice(0, 3).map((goal) => goal.title).join(", ")}`,
        fallbackBody: "A quick review of your remaining goals could make the rest of the day feel lighter.",
      });
    }

    if (timeOfDay === "morning" && !latestMood) {
      candidates.push({
        score: 52,
        reason: "morning-mood-gap",
        type: "browser_mood",
        title: "Quick check-in?",
        actionUrl: "/dashboard",
        tag: `mood-${today.toISOString()}`,
        fallbackBody: "Before the day gets busy, how are you feeling? A tiny mood check helps me nudge you better.",
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ notification: null, reason: "no-candidate" });
    }

    candidates.sort((a, b) => b.score - a.score);

    let selectedCandidate: NotificationCandidate | null = null;

    for (const candidate of candidates) {
      const existingDuplicate = await prisma.notification.findFirst({
        where: {
          userId,
          type: candidate.type,
          title: candidate.title,
          createdAt: { gte: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
        },
      });

      if (!existingDuplicate) {
        selectedCandidate = candidate;
        break;
      }
    }

    if (!selectedCandidate) {
      return NextResponse.json({ notification: null, reason: "duplicate" });
    }

    const notification = await buildPayload(selectedCandidate, nudgeContext, now);

    await prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.body,
        actionUrl: notification.actionUrl,
      },
    });

    return NextResponse.json({
      notification,
      reason: selectedCandidate.reason,
      score: selectedCandidate.score,
    });
  } catch (error) {
    return internalServerError("GET /api/notifications/browser", error);
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNudge, type NudgeContext } from "@/lib/ai";

export const dynamic = "force-dynamic";

type BrowserNotificationPayload = {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  type: string;
  tag: string;
};

function getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function normalizeToMidnightUTC(date: Date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        take: 3,
      }),
      prisma.habit.findMany({
        where: { userId, active: true },
        take: 6,
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
    const nudgeContext: NudgeContext = {
      userName: user.name || "there",
      mood: latestMood?.mood,
      timeOfDay,
      completedGoalsToday: goals.filter((goal) => goal.completed).length,
      totalGoalsToday: goals.length,
    };

    let candidate: BrowserNotificationPayload | null = null;

    const urgentDeadline = deadlines.find((deadline) => minutesUntil(deadline.dueDate) <= 180);
    if (urgentDeadline) {
      const urgency = minutesUntil(urgentDeadline.dueDate) <= 0
        ? "overdue"
        : minutesUntil(urgentDeadline.dueDate) <= 60
        ? "high"
        : "medium";

      const body = await generateNudge(
        "deadline_reminder",
        {
          ...nudgeContext,
          deadlineUrgency: urgency,
          snoozedCount: urgentDeadline.snoozedCount,
        },
        `${urgentDeadline.title} is due ${urgentDeadline.dueDate.toLocaleString()}`
      );

      candidate = {
        id: `deadline-${urgentDeadline.id}`,
        title: `Deadline coming up: ${urgentDeadline.title}`,
        body,
        actionUrl: "/deadlines",
        type: "browser_deadline",
        tag: `deadline-${urgentDeadline.id}`,
      };
    }

    if (!candidate) {
      const incompleteHabit = habits.find((habit) => habit.checkins.length === 0);

      if (incompleteHabit) {
        const body = await generateNudge(
          "habit_nudge",
          {
            ...nudgeContext,
            streakCount: incompleteHabit.currentStreak,
          },
          incompleteHabit.name
        );

        candidate = {
          id: `habit-${incompleteHabit.id}`,
          title: `Little habit nudge: ${incompleteHabit.name}`,
          body,
          actionUrl: "/habits",
          type: "browser_habit",
          tag: `habit-${incompleteHabit.id}`,
        };
      }
    }

    if (!candidate && goals.length > 0) {
      const remainingGoals = goals.filter((goal) => !goal.completed);
      if (remainingGoals.length > 0) {
        const body = await generateNudge(
          "daily_goal",
          nudgeContext,
          `Remaining goals: ${remainingGoals.slice(0, 3).map((goal) => goal.title).join(", ")}`
        );

        candidate = {
          id: `goals-${today.toISOString()}`,
          title: "A gentle check-in for today",
          body,
          actionUrl: "/goals",
          type: "browser_goal",
          tag: `goals-${today.toISOString()}`,
        };
      }
    }

    if (!candidate && timeOfDay === "morning" && !latestMood) {
      candidate = {
        id: `mood-${today.toISOString()}`,
        title: "Quick check-in?",
        body: "Before the day gets busy, how are you feeling? A tiny mood check helps me nudge you better.",
        actionUrl: "/dashboard",
        type: "browser_mood",
        tag: `mood-${today.toISOString()}`,
      };
    }

    if (!candidate) {
      return NextResponse.json({ notification: null, reason: "no-candidate" });
    }

    const existingDuplicate = await prisma.notification.findFirst({
      where: {
        userId,
        type: candidate.type,
        title: candidate.title,
        createdAt: { gte: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
      },
    });

    if (existingDuplicate) {
      return NextResponse.json({ notification: null, reason: "duplicate" });
    }

    await prisma.notification.create({
      data: {
        userId,
        type: candidate.type,
        title: candidate.title,
        message: candidate.body,
        actionUrl: candidate.actionUrl,
      },
    });

    return NextResponse.json({ notification: candidate });
  } catch (error) {
    console.error("GET /api/notifications/browser error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNudge, type NudgeContext, type NudgeType } from "@/lib/ai";
import { badRequest, getRequiredUserId, internalServerError, unauthorized } from "@/lib/api";
import { getTimeOfDayInTimezone, getUtcDayRange } from "@/lib/dates";

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { type, context, additionalInfo } = body as {
      type?: NudgeType;
      context?: Record<string, unknown>;
      additionalInfo?: string;
    };

    if (!type) {
      return badRequest("type is required");
    }

    const { startDate, endDate } = getUtcDayRange(new Date());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        aiTone: true,
        timezone: true,
        deadlines: {
          where: { completed: false, dueDate: { gte: new Date() } },
          select: { id: true },
          take: 5,
        },
        habits: {
          where: { active: true },
          select: { id: true },
          take: 20,
        },
        dailyGoals: {
          where: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
          select: { completed: true },
        },
        focusSessions: {
          where: {
            startedAt: {
              gte: startDate,
              lt: endDate,
            },
          },
          select: { totalFocusMinutes: true },
        },
        moodCheckins: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { mood: true },
        },
      },
    });

    const timeOfDay = getTimeOfDayInTimezone(user?.timezone);
    const completedGoalsToday = user?.dailyGoals.filter((goal) => goal.completed).length ?? 0;
    const totalGoalsToday = user?.dailyGoals.length ?? 0;
    const focusMinutesToday = user?.focusSessions.reduce(
      (sum, session) => sum + session.totalFocusMinutes,
      0
    ) ?? 0;

    const nudgeContext: NudgeContext = {
      userName: user?.name || "there",
      aiTone: user?.aiTone as NudgeContext["aiTone"],
      timezone: user?.timezone,
      mood: user?.moodCheckins[0]?.mood,
      timeOfDay,
      completedGoalsToday,
      totalGoalsToday,
      focusMinutesToday,
      activeHabitsCount: user?.habits.length ?? 0,
      upcomingDeadlinesCount: user?.deadlines.length ?? 0,
      ...context,
    };

    const message = await generateNudge(type, nudgeContext, additionalInfo);

    // Store the nudge in the database
    await prisma.nudge.create({
      data: {
        userId,
        type,
        message,
        context: context ? JSON.stringify(context) : null,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    return internalServerError("POST /api/ai", error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNudge, type NudgeContext, type NudgeType } from "@/lib/ai";

function getTimeOfDayInTimezone(timezone?: string | null): "morning" | "afternoon" | "evening" {
  const now = new Date();

  try {
    const hourString = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone || "UTC",
    }).format(now);
    const hour = Number(hourString);

    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  } catch {
    const hour = now.getUTCHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { type, context, additionalInfo } = body as {
      type?: NudgeType;
      context?: Record<string, unknown>;
      additionalInfo?: string;
    };

    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    // Build NudgeContext from provided context or defaults
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
              gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
              lt: new Date(new Date().setUTCHours(24, 0, 0, 0)),
            },
          },
          select: { completed: true },
        },
        focusSessions: {
          where: {
            startedAt: {
              gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
              lt: new Date(new Date().setUTCHours(24, 0, 0, 0)),
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
    console.error("POST /api/ai error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

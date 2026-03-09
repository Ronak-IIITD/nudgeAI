import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeToMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function calculateStreak(habitId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const checkins = await prisma.habitCheckin.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (checkins.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dates = checkins.map((c) => normalizeToMidnightUTC(c.date).getTime());
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a); // descending

  const oneDayMs = 24 * 60 * 60 * 1000;
  const today = normalizeToMidnightUTC(new Date()).getTime();

  // Calculate current streak (must include today or yesterday)
  let currentStreak = 0;
  let expectedDate = today;

  // Allow streak to start from today or yesterday
  if (uniqueDates[0] === today) {
    expectedDate = today;
  } else if (uniqueDates[0] === today - oneDayMs) {
    expectedDate = today - oneDayMs;
  } else {
    // Streak is broken — current streak is 0
    // Still need to calculate longest streak
    currentStreak = 0;
    expectedDate = -1; // skip loop
  }

  if (expectedDate >= 0) {
    for (const d of uniqueDates) {
      if (d === expectedDate) {
        currentStreak++;
        expectedDate -= oneDayMs;
      } else if (d < expectedDate) {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    if (uniqueDates[i - 1] - uniqueDates[i] === oneDayMs) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id: habitId } = await params;
    const body = await req.json();
    const { note } = body;

    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const today = normalizeToMidnightUTC(new Date());

    // Check if already checked in today
    const existingCheckin = await prisma.habitCheckin.findUnique({
      where: { habitId_date: { habitId, date: today } },
    });

    if (existingCheckin) {
      return NextResponse.json(
        { error: "Already checked in for today" },
        { status: 400 }
      );
    }

    // Create checkin
    await prisma.habitCheckin.create({
      data: {
        habitId,
        userId,
        date: today,
        note,
      },
    });

    // Recalculate streaks
    const { currentStreak, longestStreak } = await calculateStreak(habitId);

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: { currentStreak, longestStreak },
      include: {
        checkins: {
          where: { date: today },
        },
      },
    });

    return NextResponse.json(updatedHabit, { status: 201 });
  } catch (error) {
    console.error("POST /api/habits/[id]/checkin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id: habitId } = await params;

    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const today = normalizeToMidnightUTC(new Date());

    const existingCheckin = await prisma.habitCheckin.findUnique({
      where: { habitId_date: { habitId, date: today } },
    });

    if (!existingCheckin) {
      return NextResponse.json(
        { error: "No checkin found for today" },
        { status: 404 }
      );
    }

    await prisma.habitCheckin.delete({
      where: { id: existingCheckin.id },
    });

    // Recalculate streaks
    const { currentStreak, longestStreak } = await calculateStreak(habitId);

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: { currentStreak, longestStreak },
    });

    return NextResponse.json(updatedHabit);
  } catch (error) {
    console.error("DELETE /api/habits/[id]/checkin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeToMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let targetDate: Date;
    if (!dateParam || dateParam === "today") {
      targetDate = normalizeToMidnightUTC(new Date());
    } else {
      targetDate = normalizeToMidnightUTC(new Date(dateParam));
    }

    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const goals = await prisma.dailyGoal.findMany({
      where: {
        userId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      orderBy: { order: "asc" },
      include: { deadline: true },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const { title, date, deadlineId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const targetDate = date
      ? normalizeToMidnightUTC(new Date(date))
      : normalizeToMidnightUTC(new Date());

    // Auto-set order to the next available position
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const existingCount = await prisma.dailyGoal.count({
      where: {
        userId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    const goal = await prisma.dailyGoal.create({
      data: {
        userId,
        title,
        date: targetDate,
        order: existingCount,
        deadlineId: deadlineId ?? null,
      },
      include: { deadline: true },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

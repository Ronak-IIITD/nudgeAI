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
    const limit = searchParams.get("limit");

    const where: { userId: string; startedAt?: { gte: Date; lt: Date } } = { userId };

    if (dateParam) {
      const targetDate = normalizeToMidnightUTC(new Date(dateParam));
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      where.startedAt = { gte: targetDate, lt: nextDay };
    }

    const focusSessions = await prisma.focusSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      ...(limit ? { take: parseInt(limit, 10) } : {}),
    });

    return NextResponse.json(focusSessions);
  } catch (error) {
    console.error("GET /api/focus error:", error);
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
    const { mode, workMinutes, breakMinutes, rounds, taskTitle } = body;

    if (!mode) {
      return NextResponse.json(
        { error: "mode is required" },
        { status: 400 }
      );
    }

    const focusSession = await prisma.focusSession.create({
      data: {
        userId,
        mode,
        workMinutes: workMinutes ?? 25,
        breakMinutes: breakMinutes ?? 5,
        rounds: rounds ?? 4,
        currentRound: 0,
        taskTitle: taskTitle ?? null,
      },
    });

    return NextResponse.json(focusSession, { status: 201 });
  } catch (error) {
    console.error("POST /api/focus error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

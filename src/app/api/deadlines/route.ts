import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import * as chrono from "chrono-node";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const upcoming = searchParams.get("upcoming");
    const completed = searchParams.get("completed");

    const where: Prisma.DeadlineWhereInput = { userId };

    if (upcoming === "true") {
      where.dueDate = { gte: new Date() };
      where.completed = false;
    }

    if (completed === "true") {
      where.completed = true;
    } else if (completed === "false") {
      where.completed = false;
    }

    const deadlines = await prisma.deadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
      ...(limit ? { take: parseInt(limit, 10) } : {}),
      include: { reminders: true },
    });

    return NextResponse.json(deadlines);
  } catch (error) {
    console.error("GET /api/deadlines error:", error);
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
    const { title, description, dueDate, priority, category, reminderIntervals } = body;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "title and dueDate are required" },
        { status: 400 }
      );
    }

    // Parse dueDate — support natural language via chrono-node
    let parsedDate: Date;
    if (dueDate instanceof Date || !isNaN(Date.parse(dueDate))) {
      parsedDate = new Date(dueDate);
    } else {
      const chronoParsed = chrono.parseDate(dueDate);
      if (!chronoParsed) {
        return NextResponse.json(
          { error: "Could not parse dueDate" },
          { status: 400 }
        );
      }
      parsedDate = chronoParsed;
    }

    const intervals: number[] =
      reminderIntervals ?? [10080, 4320, 1440, 720, 120];

    // Build reminder records
    const reminderData = intervals
      .map((minutesBefore: number) => {
        const scheduledAt = new Date(
          parsedDate.getTime() - minutesBefore * 60 * 1000
        );
        return { scheduledAt };
      })
      .filter((r) => r.scheduledAt > new Date()); // only future reminders

    const deadline = await prisma.deadline.create({
      data: {
        userId,
        title,
        description,
        dueDate: parsedDate,
        priority: priority ?? "medium",
        category,
        reminderIntervals: intervals,
        reminders: {
          create: reminderData,
        },
      },
      include: { reminders: true },
    });

    return NextResponse.json(deadline, { status: 201 });
  } catch (error) {
    console.error("POST /api/deadlines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

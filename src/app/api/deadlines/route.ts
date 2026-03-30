import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  parsePositiveIntParam,
  unauthorized,
} from "@/lib/api";
import {
  buildReminderSchedule,
  DEFAULT_REMINDER_INTERVALS,
  normalizeReminderIntervals,
  parseDeadlineDueDate,
} from "@/lib/deadlines";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const upcoming = searchParams.get("upcoming");
    const completed = searchParams.get("completed");
    const parsedLimit = parsePositiveIntParam(limit);

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

    if (limit && !parsedLimit) {
      return badRequest("limit must be a positive integer");
    }

    const deadlines = await prisma.deadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
      ...(parsedLimit ? { take: parsedLimit } : {}),
      include: { reminders: true },
    });

    return NextResponse.json(deadlines);
  } catch (error) {
    return internalServerError("GET /api/deadlines", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { title, description, dueDate, priority, category, reminderIntervals } = body;

    if (!title || !dueDate) {
      return badRequest("title and dueDate are required");
    }

    if (reminderIntervals !== undefined && !Array.isArray(reminderIntervals)) {
      return badRequest("reminderIntervals must be an array of minutes");
    }

    const parsedDate = parseDeadlineDueDate(dueDate);
    if (!parsedDate) {
      return badRequest("Could not parse dueDate");
    }

    const intervals =
      reminderIntervals === undefined
        ? DEFAULT_REMINDER_INTERVALS
        : normalizeReminderIntervals(reminderIntervals);
    const reminderData = buildReminderSchedule(parsedDate, intervals);

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
    return internalServerError("POST /api/deadlines", error);
  }
}

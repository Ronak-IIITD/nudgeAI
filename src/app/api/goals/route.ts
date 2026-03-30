import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, getRequiredUserId, internalServerError, unauthorized } from "@/lib/api";
import { getUtcDayRange, parseDayParam } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? parseDayParam(dateParam) : parseDayParam("today");

    if (!targetDate) {
      return badRequest("Invalid date");
    }

    const { startDate, endDate } = getUtcDayRange(targetDate);

    const goals = await prisma.dailyGoal.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { order: "asc" },
      include: { deadline: true },
    });

    return NextResponse.json(goals);
  } catch (error) {
    return internalServerError("GET /api/goals", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { title, date, deadlineId } = body;

    if (!title) {
      return badRequest("title is required");
    }

    const targetDate = date ? parseDayParam(date) : parseDayParam("today");
    if (!targetDate) {
      return badRequest("Invalid date");
    }

    const { startDate, endDate } = getUtcDayRange(targetDate);

    const existingCount = await prisma.dailyGoal.count({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
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
    return internalServerError("POST /api/goals", error);
  }
}

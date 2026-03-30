import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  parsePositiveIntParam,
  unauthorized,
} from "@/lib/api";
import { getUtcDayRange, parseDayParam } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const limit = searchParams.get("limit");
    const parsedLimit = parsePositiveIntParam(limit);

    const where: { userId: string; startedAt?: { gte: Date; lt: Date } } = { userId };

    if (dateParam) {
      const targetDate = parseDayParam(dateParam);
      if (!targetDate) {
        return badRequest("Invalid date");
      }

      const { startDate, endDate } = getUtcDayRange(targetDate);
      where.startedAt = { gte: startDate, lt: endDate };
    }

    if (limit && !parsedLimit) {
      return badRequest("limit must be a positive integer");
    }

    const focusSessions = await prisma.focusSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      ...(parsedLimit ? { take: parsedLimit } : {}),
    });

    return NextResponse.json(focusSessions);
  } catch (error) {
    return internalServerError("GET /api/focus", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { mode, workMinutes, breakMinutes, rounds, taskTitle } = body;

    if (!mode) {
      return badRequest("mode is required");
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
    return internalServerError("POST /api/focus", error);
  }
}

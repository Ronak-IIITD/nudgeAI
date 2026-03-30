import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, getRequiredUserId, internalServerError, unauthorized } from "@/lib/api";
import {
  getUtcDayRange,
  getUtcTimeOfDay,
  parseDayParam,
} from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const rangeParam = searchParams.get("range");

    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      const parsedDate = parseDayParam(dateParam);
      if (!parsedDate) {
        return badRequest("Invalid date");
      }

      const dayRange = getUtcDayRange(parsedDate);
      startDate = dayRange.startDate;
      endDate = dayRange.endDate;
    } else if (rangeParam) {
      const days = parseInt(rangeParam, 10);
      if (![7, 30, 90].includes(days)) {
        return badRequest("range must be 7, 30, or 90");
      }
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setUTCHours(0, 0, 0, 0);
    } else {
      // Default: last 7 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    const moodCheckins = await prisma.moodCheckin.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(moodCheckins);
  } catch (error) {
    return internalServerError("GET /api/mood", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { mood, energyLevel, note } = body;

    if (typeof mood !== "number" || mood < 1 || mood > 5) {
      return badRequest("mood is required and must be between 1 and 5");
    }

    if (
      energyLevel !== undefined &&
      (typeof energyLevel !== "number" || energyLevel < 1 || energyLevel > 5)
    ) {
      return badRequest("energyLevel must be between 1 and 5");
    }

    const timeOfDay = getUtcTimeOfDay();

    const moodCheckin = await prisma.moodCheckin.create({
      data: {
        userId,
        mood,
        energyLevel: energyLevel ?? null,
        note,
        date: new Date(),
        timeOfDay,
      },
    });

    return NextResponse.json(moodCheckin, { status: 201 });
  } catch (error) {
    return internalServerError("POST /api/mood", error);
  }
}

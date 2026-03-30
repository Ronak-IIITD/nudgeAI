import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  unauthorized,
} from "@/lib/api";
import { getRecentHabitWindow } from "@/lib/habits";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    const category = searchParams.get("category");
    const recentWindowStart = getRecentHabitWindow();

    const where: Prisma.HabitWhereInput = { userId };

    if (active === "true") {
      where.active = true;
    } else if (active === "false") {
      where.active = false;
    }

    if (category) {
      where.category = category;
    }

    const habits = await prisma.habit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        checkins: {
          where: {
            date: { gte: recentWindowStart },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    return NextResponse.json(habits);
  } catch (error) {
    return internalServerError("GET /api/habits", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { name, description, category, frequency, customDays } = body;

    if (!name) {
      return badRequest("name is required");
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name,
        description,
        category: category ?? "personal",
        frequency: frequency ?? "daily",
        customDays: customDays ?? [],
      },
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    return internalServerError("POST /api/habits", error);
  }
}

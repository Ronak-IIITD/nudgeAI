import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

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
    const rangeParam = searchParams.get("range");

    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      // Single day
      startDate = normalizeToMidnightUTC(new Date(dateParam));
      endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    } else if (rangeParam) {
      const days = parseInt(rangeParam, 10);
      if (![7, 30, 90].includes(days)) {
        return NextResponse.json(
          { error: "range must be 7, 30, or 90" },
          { status: 400 }
        );
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
    console.error("GET /api/mood error:", error);
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
    const { mood, energyLevel, note } = body;

    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json(
        { error: "mood is required and must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (energyLevel !== undefined && (energyLevel < 1 || energyLevel > 5)) {
      return NextResponse.json(
        { error: "energyLevel must be between 1 and 5" },
        { status: 400 }
      );
    }

    const timeOfDay = getTimeOfDay();

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
    console.error("POST /api/mood error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";
import { normalizeToMidnightUTC } from "@/lib/dates";
import { calculateHabitStreak } from "@/lib/habits";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { id: habitId } = await params;
    const body = await req.json();
    const { note } = body;

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return notFound("Habit");
    }

    const today = normalizeToMidnightUTC(new Date());

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

    const { currentStreak, longestStreak } = await calculateHabitStreak(habitId);

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
    return internalServerError("POST /api/habits/[id]/checkin", error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { id: habitId } = await params;

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
    });

    if (!habit) {
      return notFound("Habit");
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

    const { currentStreak, longestStreak } = await calculateHabitStreak(habitId);

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: { currentStreak, longestStreak },
    });

    return NextResponse.json(updatedHabit);
  } catch (error) {
    return internalServerError("DELETE /api/habits/[id]/checkin", error);
  }
}

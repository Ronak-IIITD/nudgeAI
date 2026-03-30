import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";
import { getRecentHabitWindow } from "@/lib/habits";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { id } = await params;
    const recentWindowStart = getRecentHabitWindow();

    const habit = await prisma.habit.findFirst({
      where: { id, userId },
      include: {
        checkins: {
          where: { date: { gte: recentWindowStart } },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!habit) {
      return notFound("Habit");
    }

    return NextResponse.json(habit);
  } catch (error) {
    return internalServerError("GET /api/habits/[id]", error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Habit");
    }

    const { name, description, category, frequency, customDays, active } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (customDays !== undefined) updateData.customDays = customDays;
    if (active !== undefined) updateData.active = active;

    const habit = await prisma.habit.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(habit);
  } catch (error) {
    return internalServerError("PATCH /api/habits/[id]", error);
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

    const { id } = await params;

    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Habit");
    }

    // Soft delete: set active = false
    await prisma.habit.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalServerError("DELETE /api/habits/[id]", error);
  }
}

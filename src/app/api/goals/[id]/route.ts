import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";

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

    const existing = await prisma.dailyGoal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Goal");
    }

    const { title, completed, winNote, order } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (winNote !== undefined) updateData.winNote = winNote;
    if (order !== undefined) updateData.order = order;

    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed === true) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    const goal = await prisma.dailyGoal.update({
      where: { id },
      data: updateData,
      include: { deadline: true },
    });

    return NextResponse.json(goal);
  } catch (error) {
    return internalServerError("PATCH /api/goals/[id]", error);
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

    const existing = await prisma.dailyGoal.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Goal");
    }

    await prisma.dailyGoal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalServerError("DELETE /api/goals/[id]", error);
  }
}

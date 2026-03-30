import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";
import { parseDateInput } from "@/lib/dates";

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

    const existing = await prisma.focusSession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Focus session");
    }

    const { endedAt, completed, totalFocusMinutes, currentRound } = body;

    const updateData: Record<string, unknown> = {};
    if (endedAt !== undefined) {
      const parsedEndedAt = parseDateInput(String(endedAt));
      if (!parsedEndedAt) {
        return NextResponse.json({ error: "Invalid endedAt" }, { status: 400 });
      }

      updateData.endedAt = parsedEndedAt;
    }

    if (completed !== undefined) updateData.completed = completed;
    if (totalFocusMinutes !== undefined) updateData.totalFocusMinutes = totalFocusMinutes;
    if (currentRound !== undefined) updateData.currentRound = currentRound;

    const focusSession = await prisma.focusSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(focusSession);
  } catch (error) {
    return internalServerError("PATCH /api/focus/[id]", error);
  }
}

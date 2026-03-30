import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";
import {
  buildReminderSchedule,
  normalizeReminderIntervals,
  parseDeadlineDueDate,
} from "@/lib/deadlines";

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

    const deadline = await prisma.deadline.findFirst({
      where: { id, userId },
      include: { reminders: true },
    });

    if (!deadline) {
      return notFound("Deadline");
    }

    return NextResponse.json(deadline);
  } catch (error) {
    return internalServerError("GET /api/deadlines/[id]", error);
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

    // Verify ownership
    const existing = await prisma.deadline.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Deadline");
    }

    const { title, description, dueDate, priority, completed, category, reminderIntervals } = body;

    if (reminderIntervals !== undefined && !Array.isArray(reminderIntervals)) {
      return badRequest("reminderIntervals must be an array of minutes");
    }

    let parsedDate: Date | undefined;
    if (dueDate !== undefined) {
      parsedDate = parseDeadlineDueDate(dueDate) ?? undefined;
      if (!parsedDate) {
        return badRequest("Could not parse dueDate");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (parsedDate !== undefined) updateData.dueDate = parsedDate;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (reminderIntervals !== undefined) updateData.reminderIntervals = reminderIntervals;

    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed === true) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    // If dueDate or reminderIntervals changed, recreate reminders
    if (parsedDate || reminderIntervals) {
      const finalDate = parsedDate ?? existing.dueDate;
      const finalIntervals =
        reminderIntervals === undefined
          ? existing.reminderIntervals
          : normalizeReminderIntervals(reminderIntervals);

      await prisma.reminder.deleteMany({ where: { deadlineId: id } });

      const reminderData = buildReminderSchedule(finalDate, finalIntervals).map(
        (reminder) => ({
          deadlineId: id,
          scheduledAt: reminder.scheduledAt,
        })
      );

      if (reminderData.length > 0) {
        await prisma.reminder.createMany({ data: reminderData });
      }
    }

    const deadline = await prisma.deadline.update({
      where: { id },
      data: updateData,
      include: { reminders: true },
    });

    return NextResponse.json(deadline);
  } catch (error) {
    return internalServerError("PATCH /api/deadlines/[id]", error);
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

    const existing = await prisma.deadline.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return notFound("Deadline");
    }

    await prisma.deadline.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalServerError("DELETE /api/deadlines/[id]", error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as chrono from "chrono-node";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const deadline = await prisma.deadline.findFirst({
      where: { id, userId },
      include: { reminders: true },
    });

    if (!deadline) {
      return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
    }

    return NextResponse.json(deadline);
  } catch (error) {
    console.error("GET /api/deadlines/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.deadline.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
    }

    const { title, description, dueDate, priority, completed, category, reminderIntervals } = body;

    // Parse dueDate if provided
    let parsedDate: Date | undefined;
    if (dueDate !== undefined) {
      if (!isNaN(Date.parse(dueDate))) {
        parsedDate = new Date(dueDate);
      } else {
        const chronoParsed = chrono.parseDate(dueDate);
        if (!chronoParsed) {
          return NextResponse.json(
            { error: "Could not parse dueDate" },
            { status: 400 }
          );
        }
        parsedDate = chronoParsed;
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
      const finalIntervals: number[] =
        reminderIntervals ?? existing.reminderIntervals;

      // Delete old reminders
      await prisma.reminder.deleteMany({ where: { deadlineId: id } });

      // Create new reminders
      const reminderData = finalIntervals
        .map((minutesBefore: number) => ({
          deadlineId: id,
          scheduledAt: new Date(
            finalDate.getTime() - minutesBefore * 60 * 1000
          ),
        }))
        .filter((r) => r.scheduledAt > new Date());

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
    console.error("PATCH /api/deadlines/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const existing = await prisma.deadline.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
    }

    await prisma.deadline.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deadlines/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

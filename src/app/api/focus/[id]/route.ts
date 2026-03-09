import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const existing = await prisma.focusSession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Focus session not found" },
        { status: 404 }
      );
    }

    const { endedAt, completed, totalFocusMinutes, currentRound } = body;

    const updateData: Record<string, unknown> = {};
    if (endedAt !== undefined) updateData.endedAt = new Date(endedAt);
    if (completed !== undefined) updateData.completed = completed;
    if (totalFocusMinutes !== undefined) updateData.totalFocusMinutes = totalFocusMinutes;
    if (currentRound !== undefined) updateData.currentRound = currentRound;

    const focusSession = await prisma.focusSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(focusSession);
  } catch (error) {
    console.error("PATCH /api/focus/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

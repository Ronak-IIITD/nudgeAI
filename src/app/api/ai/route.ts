import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateNudge, type NudgeContext } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { type, context, additionalInfo } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }

    // Build NudgeContext from provided context or defaults
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const hour = new Date().getUTCHours();
    const timeOfDay: "morning" | "afternoon" | "evening" =
      hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const nudgeContext: NudgeContext = {
      userName: user?.name || "there",
      timeOfDay,
      ...context,
    };

    const message = await generateNudge(type, nudgeContext, additionalInfo);

    // Store the nudge in the database
    await prisma.nudge.create({
      data: {
        userId,
        type,
        message,
        context: context ? JSON.stringify(context) : null,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("POST /api/ai error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

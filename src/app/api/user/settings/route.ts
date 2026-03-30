import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  notFound,
  unauthorized,
} from "@/lib/api";

const userSettingsSelect = {
  id: true,
  name: true,
  email: true,
  timezone: true,
  onboarded: true,
  aiTone: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  browserNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  tier: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSettingsSelect,
    });

    if (!user) {
      return notFound("User");
    }

    return NextResponse.json(user);
  } catch (error) {
    return internalServerError("GET /api/user/settings", error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();

    // Whitelist allowed fields
    const allowedFields: Record<string, boolean> = {
      name: true,
      timezone: true,
      onboarded: true,
      aiTone: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      browserNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };

    const data: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (allowedFields[key]) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No valid fields to update");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSettingsSelect,
    });

    return NextResponse.json(user);
  } catch (error) {
    return internalServerError("PATCH /api/user/settings", error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  getRequiredUserId,
  internalServerError,
  parsePositiveIntParam,
  unauthorized,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const unread = searchParams.get("unread");
    const parsedLimit = parsePositiveIntParam(limit);

    const where: Prisma.NotificationWhereInput = { userId };

    if (unread === "true") {
      where.read = false;
    }

    if (limit && !parsedLimit) {
      return badRequest("limit must be a positive integer");
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(parsedLimit ? { take: parsedLimit } : {}),
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return internalServerError("GET /api/notifications", error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) {
      return unauthorized();
    }

    const body = await req.json();
    const { ids, all } = body;

    if (!ids && !all) {
      return badRequest("Provide ids array or all: true");
    }

    if (all === true) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (
      Array.isArray(ids) &&
      ids.length > 0 &&
      ids.every((id) => typeof id === "string")
    ) {
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId,
        },
        data: { read: true },
      });
    } else {
      return badRequest("ids must be a non-empty array of strings");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalServerError("PATCH /api/notifications", error);
  }
}

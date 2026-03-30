import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function badRequest(error: string) {
  return jsonError(error, 400);
}

export function unauthorized() {
  return jsonError("Unauthorized", 401);
}

export function notFound(resource: string) {
  return jsonError(`${resource} not found`, 404);
}

export function internalServerError(route: string, error: unknown) {
  console.error(`${route} error:`, error);
  return jsonError("Internal server error", 500);
}

export async function getRequiredUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function parsePositiveIntParam(value: string | null) {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? null : parsed;
}

export function parseBooleanParam(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

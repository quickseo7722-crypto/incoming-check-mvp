import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getSessionFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getApiSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/incoming-check-session=([^;]+)/);
  return getSessionFromToken(match?.[1] ? decodeURIComponent(match[1]) : null);
}

export function requireAdminApi(request: Request) {
  const session = getApiSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return null;
  }
  return session;
}

export async function requireCurrentAdminUser(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || user.role !== UserRole.ADMIN || !user.isActive) {
    return null;
  }

  return { session, user };
}

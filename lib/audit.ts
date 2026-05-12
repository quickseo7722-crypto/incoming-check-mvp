import { prisma } from "@/lib/prisma";

type AuditLogInput = {
  userId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
};

async function resolveAuditUserId(userId?: string | null) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    console.error("[audit] userId not found, writing null instead", { userId });
    return null;
  }

  return user.id;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    const safeUserId = await resolveAuditUserId(input.userId);

    await prisma.auditLog.create({
      data: {
        userId: safeUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to create audit log", {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      error,
    });
  }
}

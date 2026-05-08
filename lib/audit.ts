import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  userId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

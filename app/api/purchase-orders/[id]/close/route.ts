import { PurchaseOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return jsonError("找不到叫貨單", 404);

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: PurchaseOrderStatus.CLOSED,
      closedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_closed",
    targetType: "PurchaseOrder",
    targetId: id,
  });

  return NextResponse.json({ order: updated });
}

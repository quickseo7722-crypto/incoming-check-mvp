import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { buildOrderStatus } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) return jsonError("找不到叫貨單", 404);

  const status = buildOrderStatus(order.items);
  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      completedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_marked_complete",
    targetType: "PurchaseOrder",
    targetId: id,
    metadata: { status },
  });

  return NextResponse.json({ order: updated });
}

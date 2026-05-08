import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/api";
import { buildOrderStatus, parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";
import { shareSubmitSchema } from "@/lib/validators";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await request.json();
  const parsed = shareSubmitSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "送出資料失敗");

  const order = await prisma.purchaseOrder.findFirst({
    where: { shareToken: token },
    include: { items: true },
  });

  if (!order) return jsonError("分享連結無效或已失效", 404);

  await prisma.$transaction(async (tx) => {
    for (const entry of parsed.data.items) {
      await tx.purchaseOrderItem.update({
        where: { id: entry.id },
        data: {
          receivedQuantity: parseNumber(entry.receivedQuantity),
          status: entry.status,
          staffNote: entry.staffNote || null,
          checkedByName: parsed.data.checkerName,
          checkedAt: new Date(),
        },
      });
    }
  });

  const refreshedItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: order.id },
  });
  const status = buildOrderStatus(refreshedItems);
  const updatedOrder = await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status,
      submittedByName: parsed.data.checkerName,
      completedAt: new Date(),
    },
  });

  await createAuditLog({
    action: "purchase_order_submitted_via_share",
    targetType: "PurchaseOrder",
    targetId: order.id,
    metadata: { checkerName: parsed.data.checkerName, status },
  });

  return NextResponse.json({ order: updatedOrder });
}

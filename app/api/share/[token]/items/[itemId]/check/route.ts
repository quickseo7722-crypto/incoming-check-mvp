import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/api";
import { buildOrderStatus, parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";
import { itemCheckSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await context.params;
  const body = await request.json();
  const parsed = itemCheckSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "清點資料有誤");

  const order = await prisma.purchaseOrder.findFirst({
    where: { shareToken: token },
    include: { items: true },
  });

  if (!order) return jsonError("分享連結無效或已失效", 404);
  const target = order.items.find((item) => item.id === itemId);
  if (!target) return jsonError("找不到品項", 404);

  const updatedItem = await prisma.purchaseOrderItem.update({
    where: { id: itemId },
    data: {
      receivedQuantity: parseNumber(parsed.data.receivedQuantity),
      status: parsed.data.status,
      staffNote: parsed.data.staffNote || null,
      checkedByName: parsed.data.checkerName || null,
      checkedAt: new Date(),
    },
  });

  const status = buildOrderStatus(order.items.map((item) => (item.id === itemId ? updatedItem : item)));
  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status },
  });

  await createAuditLog({
    action: "purchase_order_item_checked_via_share",
    targetType: "PurchaseOrderItem",
    targetId: itemId,
    metadata: { checkerName: parsed.data.checkerName, status: parsed.data.status },
  });

  return NextResponse.json({ item: updatedItem });
}

import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { buildOrderStatus, parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";
import { itemCheckSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { itemId } = await context.params;
  const body = await request.json();
  const parsed = itemCheckSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message || "清點資料有誤");

  const item = await prisma.purchaseOrderItem.findUnique({
    where: { id: itemId },
  });

  if (!item) return jsonError("找不到品項", 404);

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

  const items = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: item.purchaseOrderId },
  });
  const status = buildOrderStatus(items.map((entry) => (entry.id === updatedItem.id ? updatedItem : entry)));

  await prisma.purchaseOrder.update({
    where: { id: item.purchaseOrderId },
    data: {
      status,
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_item_checked",
    targetType: "PurchaseOrderItem",
    targetId: itemId,
    metadata: { status: parsed.data.status, checkerName: parsed.data.checkerName },
  });

  return NextResponse.json({ item: updatedItem });
}

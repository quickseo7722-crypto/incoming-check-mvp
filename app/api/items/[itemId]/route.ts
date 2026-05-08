import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { itemId } = await context.params;
  const body = await request.json();

  const item = await prisma.purchaseOrderItem.update({
    where: { id: itemId },
    data: {
      name: body.name,
      spec: body.spec || null,
      orderedQuantity: parseNumber(body.orderedQuantity),
      unit: body.unit || null,
      receivedQuantity: parseNumber(body.receivedQuantity),
      status: body.status,
      staffNote: body.staffNote || null,
      bossNote: body.bossNote || null,
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_item_updated",
    targetType: "PurchaseOrderItem",
    targetId: itemId,
  });

  return NextResponse.json({ item });
}

export async function DELETE(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { itemId } = await context.params;
  await prisma.purchaseOrderItem.delete({
    where: { id: itemId },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_item_deleted",
    targetType: "PurchaseOrderItem",
    targetId: itemId,
  });

  return NextResponse.json({ ok: true });
}

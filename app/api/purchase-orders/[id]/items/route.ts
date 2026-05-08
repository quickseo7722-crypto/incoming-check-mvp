import { ItemCheckStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const body = await request.json();

  if (!body?.name) return jsonError("品名不可空白");

  const sortOrder =
    (await prisma.purchaseOrderItem.count({
      where: { purchaseOrderId: id },
    })) + 1;

  const item = await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: id,
      sortOrder,
      name: body.name,
      spec: body.spec || null,
      orderedQuantity: parseNumber(body.orderedQuantity),
      unit: body.unit || null,
      status: ItemCheckStatus.UNCHECKED,
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_item_created",
    targetType: "PurchaseOrderItem",
    targetId: item.id,
  });

  return NextResponse.json({ item });
}

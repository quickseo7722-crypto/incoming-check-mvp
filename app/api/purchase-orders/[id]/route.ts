import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";
import { purchaseOrderUpdateSchema } from "@/lib/validators";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { createdAt: "asc" },
      },
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!order) return jsonError("找不到叫貨單", 404);
  return NextResponse.json({ order });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = purchaseOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "更新資料失敗");
  }

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) return jsonError("找不到叫貨單", 404);

  const incomingIds = new Set(parsed.data.items.map((item) => item.id).filter(Boolean) as string[]);
  const deleteIds = existing.items.filter((item) => !incomingIds.has(item.id)).map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        title: parsed.data.title,
        supplierName: parsed.data.supplierName || null,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : null,
        finalNote: parsed.data.finalNote || null,
      },
    });

    if (deleteIds.length) {
      await tx.purchaseOrderItem.deleteMany({
        where: {
          id: { in: deleteIds },
        },
      });
    }

    for (const [index, item] of parsed.data.items.entries()) {
      await tx.purchaseOrderItem.upsert({
        where: {
          id: item.id || `missing-${index}`,
        },
        update: {
          sortOrder: index,
          name: item.name,
          spec: item.spec || null,
          orderedQuantity: parseNumber(item.orderedQuantity),
          unit: item.unit || null,
          receivedQuantity: parseNumber(item.receivedQuantity),
          status: item.status,
          staffNote: item.staffNote || null,
          bossNote: item.bossNote || null,
          note: item.note || null,
          confidence: item.confidence ?? null,
          rawText: item.rawText || null,
          checkedByName: item.checkedByName || null,
        },
        create: {
          purchaseOrderId: id,
          sortOrder: index,
          name: item.name,
          spec: item.spec || null,
          orderedQuantity: parseNumber(item.orderedQuantity),
          unit: item.unit || null,
          receivedQuantity: parseNumber(item.receivedQuantity),
          status: item.status,
          staffNote: item.staffNote || null,
          bossNote: item.bossNote || null,
          note: item.note || null,
          confidence: item.confidence ?? null,
          rawText: item.rawText || null,
          checkedByName: item.checkedByName || null,
        },
      });
    }
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_updated",
    targetType: "PurchaseOrder",
    targetId: id,
    metadata: { itemCount: parsed.data.items.length },
  });

  const updated = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      images: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ order: updated });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!order) return jsonError("找不到叫貨單", 404);
  if (order.status !== "DRAFT") {
    return jsonError("只有草稿可以刪除", 400);
  }

  await prisma.purchaseOrder.delete({ where: { id } });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_deleted",
    targetType: "PurchaseOrder",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { getPurchaseOrderListRows } from "@/lib/purchase-order-list";
import { prisma } from "@/lib/prisma";
import { purchaseOrderCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 20);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  const orders = await getPurchaseOrderListRows({
    limit: safeLimit,
    orderBy: "updatedAt",
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const body = await request.json();
  const parsed = purchaseOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "建立叫貨單失敗");
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      title: parsed.data.title,
      supplierName: parsed.data.supplierName || null,
      orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : null,
      createdById: session.userId,
      shareToken: randomBytes(32).toString("hex"),
    },
  });

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_created",
    targetType: "PurchaseOrder",
    targetId: order.id,
  });

  return NextResponse.json({ order });
}

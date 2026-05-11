import { NextResponse } from "next/server";
import { ItemCheckStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { parseNumber } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";
import { purchaseOrderUpdateSchema } from "@/lib/validators";

type SanitizedDraftItem = {
  id?: string;
  sortOrder: number;
  name: string;
  spec: string | null;
  orderedQuantity: number | null;
  unit: string | null;
  receivedQuantity: number | null;
  status: ItemCheckStatus;
  staffNote: string | null;
  bossNote: string | null;
  note: string | null;
  confidence: number | null;
  rawText: string | null;
  checkedByName: string | null;
};

type ItemSaveError = {
  type: "item_validation" | "item_save_failed";
  index: number;
  name: string;
  message: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function sanitizeDraftItem(rawItem: any, index: number): SanitizedDraftItem {
  const name = cleanText(rawItem.name);

  if (!name) {
    throw {
      type: "item_validation",
      index,
      name: typeof rawItem?.name === "string" ? rawItem.name : `第 ${index + 1} 筆品項`,
      message: "品名不能空白",
    } satisfies ItemSaveError;
  }

  return {
    id: cleanText(rawItem.id) || undefined,
    sortOrder: index,
    name,
    spec: normalizeNullableText(rawItem.spec),
    orderedQuantity: parseNumber(rawItem.orderedQuantity),
    unit: normalizeNullableText(rawItem.unit),
    receivedQuantity: parseNumber(rawItem.receivedQuantity),
    status: rawItem.status,
    staffNote: normalizeNullableText(rawItem.staffNote),
    bossNote: normalizeNullableText(rawItem.bossNote),
    note: normalizeNullableText(rawItem.note),
    confidence: parseNumber(rawItem.confidence),
    rawText: normalizeNullableText(rawItem.rawText),
    checkedByName: normalizeNullableText(rawItem.checkedByName),
  };
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "發生未預期錯誤";
}

function isItemSaveError(error: unknown): error is ItemSaveError {
  if (!error || typeof error !== "object") return false;

  const candidate = error as Record<string, unknown>;
  return (
    (candidate.type === "item_validation" || candidate.type === "item_save_failed") &&
    typeof candidate.index === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.message === "string"
  );
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("未授權", 401);

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
  if (!session) return jsonError("未授權", 401);

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = purchaseOrderUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "表單資料格式錯誤");
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) return jsonError("找不到叫貨單", 404);

    const items = parsed.data.items.map((item, index) => sanitizeDraftItem(item, index));
    const existingItemMap = new Map(existing.items.map((item) => [item.id, item]));
    const incomingIds = new Set(items.map((item) => item.id).filter(Boolean) as string[]);
    const deleteIds = existing.items
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => item.id);

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          title: cleanText(parsed.data.title),
          supplierName: normalizeNullableText(parsed.data.supplierName),
          orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : null,
          finalNote: normalizeNullableText(parsed.data.finalNote),
        },
      });

      if (deleteIds.length) {
        await tx.purchaseOrderItem.deleteMany({
          where: {
            id: { in: deleteIds },
          },
        });
      }

      for (const item of items) {
        const itemData = {
          sortOrder: item.sortOrder,
          name: item.name,
          spec: item.spec,
          orderedQuantity: item.orderedQuantity,
          unit: item.unit,
          receivedQuantity: item.receivedQuantity,
          status: item.status,
          staffNote: item.staffNote,
          bossNote: item.bossNote,
          note: item.note,
          confidence: item.confidence,
          rawText: item.rawText,
          checkedByName: item.checkedByName,
        };

        try {
          if (item.id) {
            if (!existingItemMap.has(item.id)) {
              throw new Error("找不到對應的既有品項，請重新整理後再試");
            }

            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: itemData,
            });
          } else {
            await tx.purchaseOrderItem.create({
              data: {
                purchaseOrderId: id,
                ...itemData,
              },
            });
          }
        } catch (error) {
          throw {
            type: "item_save_failed",
            index: item.sortOrder,
            name: item.name,
            message: getSafeErrorMessage(error),
          } satisfies ItemSaveError;
        }
      }
    });

    await createAuditLog({
      userId: session.userId,
      action: "purchase_order_updated",
      targetType: "PurchaseOrder",
      targetId: id,
      metadata: { itemCount: items.length },
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        images: { orderBy: { createdAt: "asc" } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    if (isItemSaveError(error)) {
      console.error("Draft item save failed", {
        index: error.index,
        name: error.name,
        message: error.message,
      });

      return NextResponse.json(
        {
          error: `第 ${error.index + 1} 筆品項儲存失敗：${error.message}`,
          item: {
            index: error.index,
            name: error.name,
          },
        },
        { status: 400 },
      );
    }

    console.error("Purchase order draft save failed", {
      message: getSafeErrorMessage(error),
    });

    return jsonError("儲存失敗，請稍後再試", 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("未授權", 401);

  const { id } = await context.params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!order) return jsonError("找不到叫貨單", 404);
  if (order.status !== "DRAFT") {
    return jsonError("只有草稿狀態的叫貨單可以刪除", 400);
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

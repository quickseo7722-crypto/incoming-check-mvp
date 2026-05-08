import { OcrStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { parsePurchaseOrderImage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string; imageId: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id, imageId } = await context.params;
  const image = await prisma.purchaseOrderImage.findFirst({
    where: {
      id: imageId,
      purchaseOrderId: id,
    },
  });

  if (!image) return jsonError("找不到圖片", 404);

  await prisma.purchaseOrderImage.update({
    where: { id: imageId },
    data: {
      ocrStatus: OcrStatus.PROCESSING,
      parseError: null,
    },
  });

  try {
    const parsed = await parsePurchaseOrderImage(image.url);

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderImage.update({
        where: { id: imageId },
        data: {
          ocrStatus: OcrStatus.SUCCESS,
          rawText: parsed.items.map((item) => item.raw_text).join("\n"),
          aiJson: JSON.stringify(parsed),
        },
      });

      const currentCount = await tx.purchaseOrderItem.count({
        where: { purchaseOrderId: id },
      });

      for (const [index, item] of parsed.items.entries()) {
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: id,
            sortOrder: currentCount + index,
            name: item.name,
            spec: item.spec || null,
            orderedQuantity: item.ordered_quantity ?? null,
            unit: item.unit || null,
            note: item.note || null,
            confidence: item.confidence,
            rawText: item.raw_text || null,
          },
        });
      }

      if (parsed.supplier_name?.trim()) {
        const parsedDate =
          parsed.order_date && !Number.isNaN(new Date(parsed.order_date).getTime())
            ? new Date(parsed.order_date)
            : null;
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            supplierName: parsed.supplier_name.trim(),
            orderDate: parsedDate ?? undefined,
          },
        });
      }
    });

    await createAuditLog({
      userId: session.userId,
      action: "purchase_order_image_parsed",
      targetType: "PurchaseOrderImage",
      targetId: imageId,
      metadata: { itemCount: parsed.items.length, warnings: parsed.warnings },
    });

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        images: { orderBy: { createdAt: "asc" } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ parsed, order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失敗";

    await prisma.purchaseOrderImage.update({
      where: { id: imageId },
      data: {
        ocrStatus: OcrStatus.FAILED,
        parseError: message,
      },
    });

    return jsonError(message, 500);
  }
}

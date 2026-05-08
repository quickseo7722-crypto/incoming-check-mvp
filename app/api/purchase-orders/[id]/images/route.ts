import { randomUUID } from "crypto";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { OcrStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// We rely on Vercel Blob for persistent image storage so that uploads survive
// redeploys on Vercel's ephemeral filesystem. BLOB_READ_WRITE_TOKEN must be
// configured in the environment (Vercel auto-injects it when a Blob store is
// linked to the project; locally, copy it from the Vercel dashboard).

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return jsonError("缺少 BLOB_READ_WRITE_TOKEN，無法上傳圖片。請在環境變數中設定。", 500);
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) return jsonError("請至少選擇一張圖片");

  const createdImages = [];
  for (const file of files) {
    const extension = path.extname(file.name) || ".jpg";
    const blobKey = `orders/${id}/${randomUUID()}${extension}`;

    const blob = await put(blobKey, file, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false,
    });

    const image = await prisma.purchaseOrderImage.create({
      data: {
        purchaseOrderId: id,
        url: blob.url,
        originalName: file.name,
        mimeType: file.type || null,
        fileSize: file.size || null,
        ocrStatus: OcrStatus.PENDING,
      },
    });

    createdImages.push(image);
  }

  await createAuditLog({
    userId: session.userId,
    action: "purchase_order_images_uploaded",
    targetType: "PurchaseOrder",
    targetId: id,
    metadata: { count: createdImages.length },
  });

  return NextResponse.json({ images: createdImages });
}

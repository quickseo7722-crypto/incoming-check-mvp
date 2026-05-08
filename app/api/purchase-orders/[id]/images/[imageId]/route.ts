import { NextResponse } from "next/server";
import { jsonError, requireAdminApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string; imageId: string }> }) {
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
  return NextResponse.json({ image });
}

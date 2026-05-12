import { NextResponse } from "next/server";
import { jsonError, requireAdminApi } from "@/lib/api";
import { getSaleDetailById, serializeSaleDetail } from "@/lib/sales";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const sale = await getSaleDetailById(id);
  if (!sale) return jsonError("找不到銷售交易", 404);

  return NextResponse.json({
    success: true,
    data: serializeSaleDetail(sale),
  });
}

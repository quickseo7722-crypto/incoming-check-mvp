import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import { voidSaleRecord } from "@/lib/sales";
import { saleVoidSchema } from "@/lib/validators";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { id } = await context.params;
  const body = await request.json();
  const parsed = saleVoidSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "作廢交易失敗");
  }

  const result = await voidSaleRecord(id, {
    voidReason: parsed.data.void_reason,
    voidBy: parsed.data.void_by,
  });

  if (result.kind === "not_found") {
    return jsonError("找不到銷售交易", 404);
  }

  if (result.kind === "already_void") {
    return jsonError("此交易已作廢", 400);
  }

  await createAuditLog({
    userId: session.userId,
    action: "sale_voided",
    targetType: "Sale",
    targetId: result.sale.id,
    metadata: {
      saleNo: result.sale.saleNo,
      voidBy: result.sale.voidBy,
      voidReason: result.sale.voidReason,
    },
  });

  return NextResponse.json({
    success: true,
    message: "交易已作廢",
  });
}

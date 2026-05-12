import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { jsonError, requireAdminApi } from "@/lib/api";
import {
  createSaleRecord,
  formatDateTimeForApi,
  listSales,
  serializeSaleSummary,
} from "@/lib/sales";
import { saleCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { searchParams } = new URL(request.url);
  const result = await listSales({
    startDate: searchParams.get("start_date"),
    endDate: searchParams.get("end_date"),
    paymentMethod: searchParams.get("payment_method"),
    cashier: searchParams.get("cashier"),
    keyword: searchParams.get("keyword"),
    status: searchParams.get("status"),
  });

  return NextResponse.json({
    success: true,
    filters: {
      start_date: result.filters.startDate,
      end_date: result.filters.endDate,
      payment_method: result.filters.paymentMethod,
      cashier: result.filters.cashier,
      keyword: result.filters.keyword,
      status: result.filters.status,
    },
    data: result.sales.map(serializeSaleSummary),
  });
}

export async function POST(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const body = await request.json();
  const parsed = saleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "建立銷售交易失敗");
  }

  try {
    const sale = await createSaleRecord({
      paymentMethod: parsed.data.payment_method,
      cashier: parsed.data.cashier,
      note: parsed.data.note,
      items: parsed.data.items.map((item) => ({
        itemName: item.item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        itemNote: item.item_note,
      })),
    });

    await createAuditLog({
      userId: session.userId,
      action: "sale_created",
      targetType: "Sale",
      targetId: sale.id,
      metadata: {
        saleNo: sale.saleNo,
        totalAmount: sale.totalAmount.toString(),
        itemCount: sale.items.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sale_id: sale.id,
        sale_no: sale.saleNo,
        checkout_time: formatDateTimeForApi(sale.checkoutTime),
        total_amount: Number(sale.totalAmount),
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError("結帳失敗，請重新操作", 500);
  }
}

import { NextResponse } from "next/server";
import { jsonError, requireAdminApi } from "@/lib/api";
import { getDailyReport } from "@/lib/sales";

export async function GET(request: Request) {
  const session = requireAdminApi(request);
  if (!session) return jsonError("無權限存取", 401);

  const { searchParams } = new URL(request.url);
  const report = await getDailyReport(searchParams.get("date"));

  return NextResponse.json({
    success: true,
    data: {
      date: report.date,
      total_amount: report.totalAmount,
      transaction_count: report.transactionCount,
      payment_summary: report.paymentSummary,
      item_summary: report.itemSummary,
      cashier_summary: report.cashierSummary,
    },
  });
}

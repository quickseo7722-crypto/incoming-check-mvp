import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { VoidSaleButton } from "@/components/void-sale-button";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { listSales, paymentMethodOptions, type SaleStatus } from "@/lib/sales";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const result = await listSales({
    startDate: readSearchParam(params.start_date),
    endDate: readSearchParam(params.end_date),
    paymentMethod: readSearchParam(params.payment_method),
    cashier: readSearchParam(params.cashier),
    keyword: readSearchParam(params.keyword),
    status: readSearchParam(params.status),
  });

  return (
    <AdminShell
      title="銷售紀錄"
      subtitle="依日期、付款方式、經手人與品項關鍵字查詢歷史交易，並可查看明細或作廢。"
      userName={session.name}
    >
      <section className="panel p-5 sm:p-6">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" method="get">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            起始日期
            <input className="field" defaultValue={result.filters.startDate} name="start_date" type="date" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            結束日期
            <input className="field" defaultValue={result.filters.endDate} name="end_date" type="date" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            付款方式
            <select className="field" defaultValue={result.filters.paymentMethod} name="payment_method">
              <option value="all">全部</option>
              {paymentMethodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            經手人
            <input className="field" defaultValue={result.filters.cashier} name="cashier" placeholder="可留空" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            品項關鍵字
            <input className="field" defaultValue={result.filters.keyword} name="keyword" placeholder="例如：氣泡袋" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            交易狀態
            <select className="field" defaultValue={result.filters.status} name="status">
              <option value="all">全部</option>
              <option value="normal">normal</option>
              <option value="void">void</option>
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-3 xl:col-span-3">
            <button className="btn-primary" type="submit">
              查詢
            </button>
            <Link className="btn-secondary" href="/sales">
              清除條件
            </Link>
          </div>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">查詢結果</h2>
          <p className="mt-1 text-sm text-slate-600">共 {result.sales.length} 筆交易。</p>
        </div>

        {result.sales.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-medium">銷售單號</th>
                  <th className="px-6 py-3 font-medium">結帳時間</th>
                  <th className="px-6 py-3 font-medium">總金額</th>
                  <th className="px-6 py-3 font-medium">付款方式</th>
                  <th className="px-6 py-3 font-medium">經手人</th>
                  <th className="px-6 py-3 font-medium">狀態</th>
                  <th className="px-6 py-3 font-medium">備註</th>
                  <th className="px-6 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {result.sales.map((sale) => (
                  <tr className="border-t border-slate-100 align-top" key={sale.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{sale.saleNo}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(sale.checkoutTime)}</td>
                    <td className="px-6 py-4 text-slate-900">$ {formatMoney(Number(sale.totalAmount))}</td>
                    <td className="px-6 py-4 text-slate-600">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 text-slate-600">{sale.cashier}</td>
                    <td className="px-6 py-4">
                      <SaleStatusBadge compact status={sale.status as SaleStatus} />
                    </td>
                    <td className="max-w-xs px-6 py-4 text-slate-600">{sale.note || " - "}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn-secondary" href={`/sales/${sale.id}`}>
                          查看明細
                        </Link>
                        <VoidSaleButton
                          disabled={sale.status === "void"}
                          saleId={sale.id}
                          saleNo={sale.saleNo}
                          voidBy={session.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-sm text-slate-500">目前查無符合條件的銷售紀錄。</div>
        )}
      </section>
    </AdminShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { SaleStatusBadge } from "@/components/sale-status-badge";
import { VoidSaleButton } from "@/components/void-sale-button";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getSaleDetailById, type SaleStatus } from "@/lib/sales";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const sale = await getSaleDetailById(id);

  if (!sale) notFound();

  return (
    <AdminShell
      title={sale.saleNo}
      subtitle="查看單筆交易主檔、明細品項與作廢資訊。"
      userName={session.name}
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">銷售明細</h2>
                <p className="mt-1 text-sm text-slate-600">共 {sale.items.length} 個品項。</p>
              </div>
              <SaleStatusBadge status={sale.status as SaleStatus} />
            </div>
          </div>

          {sale.items.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">品項名稱</th>
                    <th className="px-6 py-3 font-medium">數量</th>
                    <th className="px-6 py-3 font-medium">單價</th>
                    <th className="px-6 py-3 font-medium">小計</th>
                    <th className="px-6 py-3 font-medium">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => (
                    <tr className="border-t border-slate-100" key={item.id}>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.itemName}</td>
                      <td className="px-6 py-4 text-slate-600">{formatMoney(Number(item.quantity))}</td>
                      <td className="px-6 py-4 text-slate-600">$ {formatMoney(Number(item.unitPrice))}</td>
                      <td className="px-6 py-4 text-slate-900">$ {formatMoney(Number(item.subtotal))}</td>
                      <td className="px-6 py-4 text-slate-600">{item.itemNote || " - "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-sm text-slate-500">這筆交易目前沒有明細資料。</div>
          )}
        </div>

        <div className="grid gap-4">
          <section className="panel p-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">交易資訊</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{sale.saleNo}</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>結帳時間：{formatDateTime(sale.checkoutTime)}</p>
              <p>付款方式：{sale.paymentMethod}</p>
              <p>經手人：{sale.cashier}</p>
              <p>總金額：$ {formatMoney(Number(sale.totalAmount))}</p>
              <p>備註：{sale.note || " - "}</p>
            </div>

            {sale.status === "void" ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p>作廢原因：{sale.voidReason || " - "}</p>
                <p className="mt-1">作廢人員：{sale.voidBy || " - "}</p>
                <p className="mt-1">作廢時間：{formatDateTime(sale.voidTime)}</p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="btn-secondary" href="/sales">
                回銷售紀錄
              </Link>
              <VoidSaleButton
                disabled={sale.status === "void"}
                saleId={sale.id}
                saleNo={sale.saleNo}
                voidBy={session.name}
              />
            </div>
          </section>
        </div>
      </section>
    </AdminShell>
  );
}

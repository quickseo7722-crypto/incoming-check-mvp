import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { OrderCountGrid } from "@/components/order-count-grid";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPurchaseOrderListRows } from "@/lib/purchase-order-list";

const HISTORY_LIMIT = 20;

export default async function HistoryPage() {
  const session = await requireAdmin();
  const orders = await getPurchaseOrderListRows({
    limit: HISTORY_LIMIT,
    orderBy: "updatedAt",
  });

  return (
    <AdminShell
      title="歷史紀錄"
      subtitle={`目前先顯示最近 ${HISTORY_LIMIT} 筆，避免列表頁一次載入過多資料。`}
      userName={session.name}
    >
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold sm:text-2xl">最近 20 筆叫貨單</h2>
          <p className="mt-1 text-sm text-slate-600">手機版改為卡片，桌機版保留表格，主要資訊優先顯示叫貨單標題與日期。</p>
        </div>

        <div className="grid gap-3 p-4 sm:hidden">
          {orders.map((order) => (
            <Link
              className="group rounded-[1.4rem] border border-slate-200 bg-white p-4 transition duration-150 hover:border-orange-200 hover:shadow-panel active:scale-[0.99]"
              href={`/purchase-orders/${order.id}`}
              key={order.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                    叫貨單標題
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-6 text-slate-900">
                    {order.title}
                  </h3>
                </div>
                <OrderStatusBadge size="compact" status={order.status} />
              </div>

              <p className="mt-3 text-sm text-slate-600">叫貨日期：{formatDate(order.orderDate)}</p>

              <div className="mt-4">
                <OrderCountGrid
                  compact
                  issueItems={order.counts.issueItems}
                  missingItems={order.counts.missingItems}
                  receivedItems={order.counts.receivedItems}
                  totalItems={order.counts.totalItems}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  清點人：{order.submittedByName || "尚未送出"}
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  更新：{formatDateTime(order.updatedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">叫貨單標題</th>
                <th className="px-6 py-3 font-medium">叫貨日期</th>
                <th className="px-6 py-3 font-medium">狀態</th>
                <th className="px-6 py-3 font-medium">品項</th>
                <th className="px-6 py-3 font-medium">已收</th>
                <th className="px-6 py-3 font-medium">未收</th>
                <th className="px-6 py-3 font-medium">異常</th>
                <th className="px-6 py-3 font-medium">清點人</th>
                <th className="px-6 py-3 font-medium">最後更新</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr className="border-t border-slate-100" key={order.id}>
                  <td className="px-6 py-4">
                    <Link className="font-medium text-slate-900 hover:text-orange-700" href={`/purchase-orders/${order.id}`}>
                      {order.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(order.orderDate)}</td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge size="compact" status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">{order.counts.totalItems}</td>
                  <td className="px-6 py-4 text-slate-600">{order.counts.receivedItems}</td>
                  <td className="px-6 py-4 text-slate-600">{order.counts.missingItems}</td>
                  <td className="px-6 py-4 text-slate-600">{order.counts.issueItems}</td>
                  <td className="px-6 py-4 text-slate-600">{order.submittedByName || "尚未送出"}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDateTime(order.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

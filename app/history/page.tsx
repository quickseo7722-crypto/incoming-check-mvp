import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function HistoryPage() {
  const session = await requireAdmin();
  const orders = await prisma.purchaseOrder.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell
      title="歷史紀錄"
      subtitle="保留每次叫貨、解析、清點與結案狀態，方便回查差異。"
      userName={session.name}
    >
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-2xl font-semibold">全部叫貨單</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">標題</th>
                <th className="px-6 py-3 font-medium">供應商</th>
                <th className="px-6 py-3 font-medium">叫貨日期</th>
                <th className="px-6 py-3 font-medium">狀態</th>
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
                  <td className="px-6 py-4 text-slate-600">{order.supplierName || "未填"}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(order.orderDate)}</td>
                  <td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td>
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

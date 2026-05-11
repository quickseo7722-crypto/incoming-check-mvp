import Link from "next/link";
import { PurchaseOrderStatus } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { OrderCountGrid } from "@/components/order-count-grid";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getPurchaseOrderListRows } from "@/lib/purchase-order-list";

export default async function DashboardPage() {
  const session = await requireAdmin();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [recentOrders, totalOrders, pendingOrders, issueOrders, completedToday] = await Promise.all([
    getPurchaseOrderListRows({ limit: 8, orderBy: "updatedAt" }),
    prisma.purchaseOrder.count(),
    prisma.purchaseOrder.count({
      where: {
        status: {
          in: [PurchaseOrderStatus.PENDING_CHECKING, PurchaseOrderStatus.IN_PROGRESS],
        },
      },
    }),
    prisma.purchaseOrder.count({
      where: { status: PurchaseOrderStatus.HAS_ISSUES },
    }),
    prisma.purchaseOrder.count({
      where: {
        completedAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    }),
  ]);

  const summaryCards = [
    { label: "全部叫貨單", value: totalOrders, tone: "from-orange-500 to-amber-400" },
    { label: "待清點 / 清點中", value: pendingOrders, tone: "from-sky-500 to-cyan-400" },
    { label: "有異常", value: issueOrders, tone: "from-rose-500 to-red-400" },
    { label: "今日完成", value: completedToday, tone: "from-emerald-500 to-teal-400" },
  ];

  return (
    <AdminShell
      title="進貨清點儀表板"
      subtitle="手機上先看待處理的叫貨單，點進去再做校正、追異常與完成清點。"
      userName={session.name}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            className={`rounded-[1.5rem] bg-gradient-to-br ${card.tone} p-4 text-white shadow-panel sm:p-5`}
            key={card.label}
          >
            <p className="text-xs text-white/85 sm:text-sm">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold sm:mt-4 sm:text-4xl">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="panel p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">最近叫貨單</h2>
            <p className="mt-1 text-sm text-slate-600">列表只載入必要欄位與統計，手機上也更容易快速掃描。</p>
          </div>
          <Link className="btn-primary w-full justify-center sm:w-auto" href="/purchase-orders/new">
            新增叫貨單
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
          {recentOrders.length ? null : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              目前還沒有叫貨單，可以先建立第一張草稿。
            </div>
          )}

          {recentOrders.map((order) => (
            <Link
              className="group rounded-[1.4rem] border border-slate-200 bg-white p-4 transition duration-150 hover:border-orange-200 hover:shadow-panel active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 sm:p-5"
              href={`/purchase-orders/${order.id}`}
              key={order.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                    叫貨單標題
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-6 text-slate-900 sm:text-xl">
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

              <div className="mt-4 flex items-center justify-end text-xs font-medium text-orange-700 opacity-90 transition group-hover:translate-x-0.5">
                查看詳情
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

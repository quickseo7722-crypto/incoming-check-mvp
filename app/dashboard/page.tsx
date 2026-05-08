import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { buildOrderSummary } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await requireAdmin();
  const orders = await prisma.purchaseOrder.findMany({
    include: {
      items: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 8,
  });

  const summary = {
    total: orders.length,
    pending: orders.filter((order) => ["PENDING_CHECKING", "IN_PROGRESS"].includes(order.status)).length,
    issues: orders.filter((order) => order.status === "HAS_ISSUES").length,
    completedToday: orders.filter((order) => {
      if (!order.completedAt) return false;
      const now = new Date();
      return order.completedAt.toDateString() === now.toDateString();
    }).length,
  };

  return (
    <AdminShell
      title="進貨清點儀表板"
      subtitle="先看待處理的叫貨單，再進一步校正圖片解析或追異常。"
      userName={session.name}
    >
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "近期叫貨單", value: summary.total, tone: "from-orange-500 to-amber-400" },
          { label: "待清點 / 清點中", value: summary.pending, tone: "from-sky-500 to-cyan-400" },
          { label: "有異常", value: summary.issues, tone: "from-rose-500 to-red-400" },
          { label: "今日完成", value: summary.completedToday, tone: "from-emerald-500 to-teal-400" },
        ].map((card) => (
          <article className={`rounded-[1.75rem] bg-gradient-to-br ${card.tone} p-5 text-white shadow-panel`} key={card.label}>
            <p className="text-sm text-white/85">{card.label}</p>
            <p className="mt-4 text-4xl font-semibold">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">最近叫貨單</h2>
            <p className="mt-2 text-sm text-slate-600">從草稿、待清點到異常處理，這裡是每天最常用的入口。</p>
          </div>
          <Link className="btn-primary" href="/purchase-orders/new">
            新增叫貨單
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {orders.length ? null : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              目前還沒有叫貨單，先建立第一張草稿吧。
            </div>
          )}

          {orders.map((order) => {
            const stats = buildOrderSummary(order.items);
            return (
              <Link className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-orange-200 hover:shadow-panel" href={`/purchase-orders/${order.id}`} key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-900">{order.title}</h3>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      供應商：{order.supplierName || "未填"} ｜ 叫貨日期：{formatDate(order.orderDate)}
                    </p>
                  </div>
                  <div className="grid min-w-60 grid-cols-2 gap-2 text-sm text-slate-600 md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">總品項 {stats.totalItems}</div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">已收到 {stats.receivedItems}</div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">未收到 {stats.missingItems}</div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">異常 {stats.issueItems}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}

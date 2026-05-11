import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { OrderCountGrid } from "@/components/order-count-grid";
import { OrderDetailActions } from "@/components/order-detail-actions";
import { ItemStatusBadge, OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import { buildOrderSummary } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      images: { orderBy: { createdAt: "asc" } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!order) notFound();
  const summary = buildOrderSummary(order.items);

  return (
    <AdminShell
      title={order.title}
      subtitle="手機版優先顯示摘要、結果與品項明細；桌機版則維持清楚的雙欄閱讀節奏。"
      userName={session.name}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <section className="order-3 grid gap-4 lg:order-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                品項明細
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">所有品項</h2>
            </div>
            <Link className="text-sm font-medium text-orange-700 hover:text-orange-600" href="/dashboard">
              回儀表板
            </Link>
          </div>

          <div className="grid gap-4">
            {order.items.map((item) => (
              <article className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                    {item.name}
                  </h3>
                  <ItemStatusBadge size="compact" status={item.status} />
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p className="break-words">規格：{item.spec || "未填"}</p>
                  <p>叫貨：{formatQuantity(item.orderedQuantity, item.unit)}</p>
                  <p>實收：{formatQuantity(item.receivedQuantity, item.unit)}</p>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
                  <p className="break-words">清點人：{item.checkedByName || "未填"}</p>
                  <p className="mt-1">更新時間：{formatDateTime(item.checkedAt)}</p>
                </div>

                {item.staffNote ? (
                  <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    員工備註：{item.staffNote}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <div className="order-1 grid w-full gap-4 lg:sticky lg:top-6 lg:order-1">
          <section className="panel w-full rounded-3xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                  叫貨單摘要
                </p>
                <h2 className="mt-1 break-words text-2xl font-semibold leading-tight text-slate-900">
                  {order.title}
                </h2>
              </div>
              <OrderStatusBadge size="compact" status={order.status} />
            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p className="break-words">供應商：{order.supplierName || "未填"}</p>
              <p>叫貨日期：{formatDate(order.orderDate)}</p>
              <p className="break-words">清點人：{order.submittedByName || "尚未送出"}</p>
              <p>完成時間：{formatDateTime(order.completedAt)}</p>
            </div>

            {order.finalNote ? (
              <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                老闆備註：{order.finalNote}
              </div>
            ) : null}

            <div className="mt-5">
              <OrderDetailActions
                isClosed={order.status === "CLOSED"}
                orderId={order.id}
                shareToken={order.shareToken}
              />
            </div>
          </section>

          <section className="panel w-full rounded-3xl p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                結果摘要
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">清點統計</h2>
            </div>

            <OrderCountGrid
              issueItems={summary.issueItems}
              missingItems={summary.missingItems}
              receivedItems={summary.receivedItems}
              totalItems={summary.totalItems}
              twoColumn
            />

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              清點完成率：<span className="font-semibold text-slate-900">{summary.completionRate}%</span>
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

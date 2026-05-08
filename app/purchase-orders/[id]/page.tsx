import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { OrderDetailActions } from "@/components/order-detail-actions";
import { ItemStatusBadge, OrderStatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import { buildOrderSummary } from "@/lib/order-utils";
import { prisma } from "@/lib/prisma";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      subtitle="查看整體完成率、異常品項與員工回傳結果。"
      userName={session.name}
    >
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "總品項數", value: summary.totalItems },
          { label: "已收到", value: summary.receivedItems },
          { label: "未收到", value: summary.missingItems },
          { label: "清點完成率", value: `${summary.completionRate}%` },
        ].map((card) => (
          <article className="panel p-5" key={card.label}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">叫貨單摘要</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="mt-3 grid gap-1 text-sm text-slate-600">
              <p>供應商：{order.supplierName || "未填"}</p>
              <p>叫貨日期：{formatDate(order.orderDate)}</p>
              <p>清點人：{order.submittedByName || "尚未送出"}</p>
              <p>完成時間：{formatDateTime(order.completedAt)}</p>
            </div>
          </div>
          <OrderDetailActions orderId={order.id} shareToken={order.shareToken} isClosed={order.status === "CLOSED"} />
        </div>

        {order.finalNote ? (
          <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            老闆備註：{order.finalNote}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="btn-secondary" href={`/purchase-orders/${order.id}/edit`}>
            回編輯頁
          </Link>
          <Link className="btn-secondary" href={`/share/${order.shareToken}`} target="_blank">
            預覽員工頁
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">品項明細</h2>
            <p className="mt-2 text-sm text-slate-600">所有異常、數量差異與備註都會保留在這裡。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {order.items.map((item) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
                    <ItemStatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">規格：{item.spec || "未填"} ｜ 叫貨：{formatQuantity(item.orderedQuantity, item.unit)}</p>
                  <p className="mt-1 text-sm text-slate-600">實收：{formatQuantity(item.receivedQuantity, item.unit)}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>清點人：{item.checkedByName || "未填"}</p>
                  <p className="mt-1">更新時間：{formatDateTime(item.checkedAt)}</p>
                </div>
              </div>
              {item.staffNote ? (
                <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">員工備註：{item.staffNote}</div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

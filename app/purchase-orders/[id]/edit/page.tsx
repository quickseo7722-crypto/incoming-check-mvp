import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { OrderEditor } from "@/components/order-editor";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <AdminShell
      title={`編輯：${order.title}`}
      subtitle="這裡是 AI 解析後的人工校正區，確認內容正確後再分享給員工。"
      userName={session.name}
    >
      <OrderEditor
        initialOrder={{
          id: order.id,
          title: order.title,
          supplierName: order.supplierName,
          orderDate: order.orderDate?.toISOString() || null,
          finalNote: order.finalNote,
          shareToken: order.shareToken,
          status: order.status,
          images: order.images.map((image) => ({
            id: image.id,
            url: image.url,
            originalName: image.originalName,
            ocrStatus: image.ocrStatus,
            parseError: image.parseError,
          })),
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            spec: item.spec ?? "",
            orderedQuantity: item.orderedQuantity,
            unit: item.unit ?? "",
            receivedQuantity: item.receivedQuantity,
            status: item.status,
            staffNote: item.staffNote ?? "",
            bossNote: item.bossNote ?? "",
            note: item.note ?? "",
            confidence: item.confidence,
            rawText: item.rawText ?? "",
            checkedByName: item.checkedByName ?? "",
          })),
        }}
      />
    </AdminShell>
  );
}

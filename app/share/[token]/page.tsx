import { notFound } from "next/navigation";
import { StaffCheckingForm } from "@/components/staff-checking-form";
import { prisma } from "@/lib/prisma";

export default async function ShareCheckingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.purchaseOrder.findFirst({
    where: {
      shareToken: token,
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!order) notFound();

  return (
    <StaffCheckingForm
      order={{
        id: order.id,
        title: order.title,
        supplierName: order.supplierName,
        shareToken: order.shareToken,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          spec: item.spec,
          orderedQuantity: item.orderedQuantity,
          unit: item.unit,
          receivedQuantity: item.receivedQuantity,
          status: item.status,
          staffNote: item.staffNote,
        })),
      }}
    />
  );
}

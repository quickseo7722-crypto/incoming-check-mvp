import { ItemCheckStatus, PurchaseOrderStatus } from "@prisma/client";
import { issueStatuses } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export type PurchaseOrderListRow = {
  id: string;
  title: string;
  status: PurchaseOrderStatus;
  orderDate: Date | null;
  updatedAt: Date;
  submittedByName: string | null;
  counts: {
    totalItems: number;
    receivedItems: number;
    missingItems: number;
    issueItems: number;
  };
};

type GetPurchaseOrderListRowsOptions = {
  limit: number;
  orderBy?: "createdAt" | "updatedAt";
};

export async function getPurchaseOrderListRows({
  limit,
  orderBy = "updatedAt",
}: GetPurchaseOrderListRowsOptions): Promise<PurchaseOrderListRow[]> {
  const orders = await prisma.purchaseOrder.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      orderDate: true,
      updatedAt: true,
      submittedByName: true,
    },
    orderBy: { [orderBy]: "desc" },
    take: limit,
  });

  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const groupedItemCounts = await prisma.purchaseOrderItem.groupBy({
    by: ["purchaseOrderId", "status"],
    where: {
      purchaseOrderId: {
        in: orderIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = new Map<
    string,
    {
      totalItems: number;
      receivedItems: number;
      missingItems: number;
      issueItems: number;
    }
  >();

  for (const row of groupedItemCounts) {
    const existing = countMap.get(row.purchaseOrderId) || {
      totalItems: 0,
      receivedItems: 0,
      missingItems: 0,
      issueItems: 0,
    };

    existing.totalItems += row._count._all;

    if (row.status === ItemCheckStatus.RECEIVED) {
      existing.receivedItems += row._count._all;
    }

    if (row.status === ItemCheckStatus.MISSING) {
      existing.missingItems += row._count._all;
    }

    if (issueStatuses.has(row.status)) {
      existing.issueItems += row._count._all;
    }

    countMap.set(row.purchaseOrderId, existing);
  }

  return orders.map((order) => ({
    ...order,
    counts:
      countMap.get(order.id) || {
        totalItems: 0,
        receivedItems: 0,
        missingItems: 0,
        issueItems: 0,
      },
  }));
}

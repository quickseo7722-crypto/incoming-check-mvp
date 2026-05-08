import {
  ItemCheckStatus,
  PurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from "@prisma/client";
import { issueStatuses } from "@/lib/labels";

export function parseNumber(input: unknown) {
  if (input === null || input === undefined || input === "") return null;
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

export function buildOrderStatus(items: Array<Pick<PurchaseOrderItem, "status" | "orderedQuantity" | "receivedQuantity" | "staffNote">>) {
  if (!items.length) return PurchaseOrderStatus.DRAFT;
  const hasUnchecked = items.some((item) => item.status === ItemCheckStatus.UNCHECKED);
  const hasIssue = items.some((item) => {
    if (issueStatuses.has(item.status)) return true;
    if ((item.receivedQuantity ?? null) !== (item.orderedQuantity ?? null)) return true;
    return Boolean(item.staffNote?.trim());
  });

  if (hasUnchecked) return PurchaseOrderStatus.IN_PROGRESS;
  if (hasIssue) return PurchaseOrderStatus.HAS_ISSUES;
  return PurchaseOrderStatus.COMPLETED;
}

export function buildOrderSummary(items: PurchaseOrderItem[]) {
  const totalItems = items.length;
  const receivedItems = items.filter((item) => item.status === ItemCheckStatus.RECEIVED).length;
  const missingItems = items.filter((item) => item.status === ItemCheckStatus.MISSING).length;
  const issueItems = items.filter((item) => issueStatuses.has(item.status)).length;
  const checkedItems = items.filter((item) => item.status !== ItemCheckStatus.UNCHECKED).length;

  return {
    totalItems,
    receivedItems,
    missingItems,
    issueItems,
    checkedItems,
    completionRate: totalItems ? Math.round((checkedItems / totalItems) * 100) : 0,
  };
}

export function serializeOrder<T extends PurchaseOrder & { items?: PurchaseOrderItem[] }>(order: T) {
  return {
    ...order,
    orderDate: order.orderDate?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    closedAt: order.closedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items:
      order.items?.map((item) => ({
        ...item,
        checkedAt: item.checkedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })) ?? [],
  };
}

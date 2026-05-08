import { ItemCheckStatus, PurchaseOrderStatus } from "@prisma/client";

export const purchaseOrderStatusLabel: Record<PurchaseOrderStatus, string> = {
  DRAFT: "草稿",
  PENDING_CHECKING: "待清點",
  IN_PROGRESS: "清點中",
  COMPLETED: "已完成",
  HAS_ISSUES: "有異常",
  CLOSED: "已結案",
};

export const itemStatusLabel: Record<ItemCheckStatus, string> = {
  UNCHECKED: "未清點",
  RECEIVED: "已收到",
  MISSING: "未收到",
  PARTIAL: "部分收到",
  QUANTITY_MISMATCH: "數量錯誤",
  WRONG_ITEM: "品項錯誤",
  QUALITY_ISSUE: "品質異常",
  NEEDS_REVIEW: "待老闆確認",
};

export const issueStatuses = new Set<ItemCheckStatus>([
  ItemCheckStatus.MISSING,
  ItemCheckStatus.PARTIAL,
  ItemCheckStatus.QUANTITY_MISMATCH,
  ItemCheckStatus.WRONG_ITEM,
  ItemCheckStatus.QUALITY_ISSUE,
  ItemCheckStatus.NEEDS_REVIEW,
]);

export const itemStatusOptions = Object.entries(itemStatusLabel).map(([value, label]) => ({
  value,
  label,
}));

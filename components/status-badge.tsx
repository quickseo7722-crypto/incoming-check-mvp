import { ItemCheckStatus, PurchaseOrderStatus } from "@prisma/client";
import { itemStatusLabel, purchaseOrderStatusLabel } from "@/lib/labels";

const statusClassName = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_CHECKING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  HAS_ISSUES: "bg-rose-100 text-rose-800",
  CLOSED: "bg-stone-200 text-stone-700",
  UNCHECKED: "bg-slate-100 text-slate-700",
  RECEIVED: "bg-emerald-100 text-emerald-800",
  MISSING: "bg-rose-100 text-rose-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  QUANTITY_MISMATCH: "bg-orange-100 text-orange-800",
  WRONG_ITEM: "bg-fuchsia-100 text-fuchsia-800",
  QUALITY_ISSUE: "bg-rose-100 text-rose-800",
  NEEDS_REVIEW: "bg-purple-100 text-purple-800",
} as const;

type BadgeSize = "default" | "compact";

function getBadgeSizeClassName(size: BadgeSize) {
  return size === "compact"
    ? "px-2.5 py-1 text-[11px] leading-none"
    : "px-3 py-1 text-xs";
}

export function OrderStatusBadge({
  status,
  size = "default",
}: {
  status: PurchaseOrderStatus;
  size?: BadgeSize;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-semibold ${getBadgeSizeClassName(size)} ${statusClassName[status]}`}
    >
      {purchaseOrderStatusLabel[status]}
    </span>
  );
}

export function ItemStatusBadge({
  status,
  size = "default",
}: {
  status: ItemCheckStatus;
  size?: BadgeSize;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-semibold ${getBadgeSizeClassName(size)} ${statusClassName[status]}`}
    >
      {itemStatusLabel[status]}
    </span>
  );
}

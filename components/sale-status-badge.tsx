import { saleStatusLabels, type SaleStatus } from "@/lib/sales";

const statusClassName: Record<SaleStatus, string> = {
  normal: "bg-emerald-100 text-emerald-800",
  void: "bg-rose-100 text-rose-800",
};

export function SaleStatusBadge({
  status,
  compact = false,
}: {
  status: SaleStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-semibold ${
        compact ? "px-2.5 py-1 text-[11px] leading-none" : "px-3 py-1 text-xs"
      } ${statusClassName[status]}`}
    >
      {saleStatusLabels[status]}
    </span>
  );
}

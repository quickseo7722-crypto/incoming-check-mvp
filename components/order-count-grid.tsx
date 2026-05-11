type OrderCountGridProps = {
  totalItems: number;
  receivedItems: number;
  missingItems: number;
  issueItems: number;
  compact?: boolean;
  twoColumn?: boolean;
};

const statItems = [
  { key: "totalItems", label: "品項" },
  { key: "receivedItems", label: "已收" },
  { key: "missingItems", label: "未收" },
  { key: "issueItems", label: "異常" },
] as const;

export function OrderCountGrid({
  totalItems,
  receivedItems,
  missingItems,
  issueItems,
  compact = false,
  twoColumn = false,
}: OrderCountGridProps) {
  const values = {
    totalItems,
    receivedItems,
    missingItems,
    issueItems,
  };

  const gridClassName = twoColumn
    ? "grid grid-cols-2 gap-3"
    : `grid grid-cols-2 gap-2 ${compact ? "md:grid-cols-2" : "md:grid-cols-4 md:gap-3"}`;

  return (
    <div className={gridClassName}>
      {statItems.map((item) => (
        <div
          className={`rounded-2xl border border-slate-200 bg-slate-50 ${
            compact ? "px-3 py-2" : "p-4 sm:p-5"
          }`}
          key={item.key}
        >
          <div className={`${compact ? "text-[11px]" : "text-xs"} font-medium tracking-wide text-slate-500`}>
            {item.label}
          </div>
          <div
            className={`font-semibold text-slate-900 ${
              compact ? "mt-1 text-base sm:text-lg" : "mt-2 text-2xl sm:text-3xl"
            }`}
          >
            {values[item.key]}
          </div>
        </div>
      ))}
    </div>
  );
}

type OrderCountGridProps = {
  totalItems: number;
  receivedItems: number;
  missingItems: number;
  issueItems: number;
  compact?: boolean;
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
}: OrderCountGridProps) {
  const values = {
    totalItems,
    receivedItems,
    missingItems,
    issueItems,
  };

  return (
    <div className={`grid grid-cols-2 gap-2 ${compact ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
      {statItems.map((item) => (
        <div
          className={`rounded-2xl border border-slate-200 bg-slate-50 ${
            compact ? "px-3 py-2" : "px-3 py-2.5"
          }`}
          key={item.key}
        >
          <div className="text-[11px] font-medium tracking-wide text-slate-500">{item.label}</div>
          <div className={`${compact ? "mt-1 text-base" : "mt-1 text-lg"} font-semibold text-slate-900`}>
            {values[item.key]}
          </div>
        </div>
      ))}
    </div>
  );
}

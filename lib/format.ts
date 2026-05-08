export function formatDate(value?: string | Date | null) {
  if (!value) return "未設定";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "尚未完成";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未完成";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatQuantity(value?: number | null, unit?: string | null) {
  if (value === null || value === undefined) return unit ? `未填 ${unit}` : "未填";
  return `${value}${unit || ""}`;
}

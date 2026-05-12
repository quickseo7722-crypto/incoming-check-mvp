export function formatDate(value?: string | Date | null) {
  if (!value) return "未提供";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未提供";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "未提供";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未提供";
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

export function formatMoney(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "0";
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "0";
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

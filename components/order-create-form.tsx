"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="panel p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        const response = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, supplierName, orderDate }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setError(payload.error || "建立失敗");
          setLoading(false);
          return;
        }

        router.push(`/purchase-orders/${payload.order.id}/edit`);
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          叫貨單標題
          <input
            className="field"
            placeholder="例如：5/8 青菜與乾貨補貨"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          供應商
          <input
            className="field"
            placeholder="例如：1688 蔬果供應商"
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:max-w-xs">
          叫貨日期
          <input
            className="field"
            type="date"
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading || !title.trim()} type="submit">
          {loading ? "建立中..." : "建立草稿並進入編輯"}
        </button>
      </div>
    </form>
  );
}

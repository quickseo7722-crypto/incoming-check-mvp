"use client";

import { useMemo, useState } from "react";
import { ItemCheckStatus } from "@prisma/client";
import { itemStatusLabel } from "@/lib/labels";

type StaffOrderItem = {
  id: string;
  name: string;
  spec: string | null;
  orderedQuantity: number | null;
  unit: string | null;
  receivedQuantity: number | null;
  status: ItemCheckStatus;
  staffNote: string | null;
};

type StaffOrder = {
  id: string;
  title: string;
  supplierName: string | null;
  shareToken: string;
  items: StaffOrderItem[];
};

const quickStatuses: ItemCheckStatus[] = [
  ItemCheckStatus.RECEIVED,
  ItemCheckStatus.MISSING,
  ItemCheckStatus.PARTIAL,
  ItemCheckStatus.QUANTITY_MISMATCH,
  ItemCheckStatus.WRONG_ITEM,
  ItemCheckStatus.QUALITY_ISSUE,
];

const requiredNoteStatuses = new Set<ItemCheckStatus>([
  ItemCheckStatus.MISSING,
  ItemCheckStatus.PARTIAL,
  ItemCheckStatus.QUANTITY_MISMATCH,
  ItemCheckStatus.WRONG_ITEM,
  ItemCheckStatus.QUALITY_ISSUE,
]);

export function StaffCheckingForm({ order }: { order: StaffOrder }) {
  const [checkerName, setCheckerName] = useState("");
  const [items, setItems] = useState(
    order.items.map((item) => ({
      ...item,
      staffNote: item.staffNote || "",
      receivedQuantity: item.receivedQuantity ?? item.orderedQuantity ?? null,
    })),
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const progress = useMemo(() => {
    const checkedCount = items.filter((item) => item.status !== ItemCheckStatus.UNCHECKED).length;
    return {
      checkedCount,
      total: items.length,
      percentage: items.length ? Math.round((checkedCount / items.length) * 100) : 0,
    };
  }, [items]);

  async function submit() {
    if (!checkerName.trim()) {
      setMessage("請先填寫清點人名稱");
      return;
    }

    if (items.some((item) => item.status === ItemCheckStatus.UNCHECKED)) {
      const proceed = window.confirm("仍有未清點品項，確定要送出嗎？");
      if (!proceed) return;
    }

    const invalidIssue = items.find(
      (item) => requiredNoteStatuses.has(item.status) && !item.staffNote?.trim(),
    );
    if (invalidIssue) {
      setMessage(`品項「${invalidIssue.name}」屬於異常，請補上備註`);
      return;
    }

    setBusy(true);
    setMessage("");

    const response = await fetch(`/api/share/${order.shareToken}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkerName,
        items: items.map((item) => ({
          id: item.id,
          receivedQuantity: item.receivedQuantity,
          status: item.status,
          staffNote: item.staffNote,
        })),
      }),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error || "送出失敗");
      return;
    }

    setMessage("清點結果已送出，老闆可以回後台查看摘要。");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <section className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-stone-900 via-orange-900 to-amber-700 px-5 py-6 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-100">Staff Check Link</p>
          <h1 className="mt-3 text-3xl font-semibold">{order.title}</h1>
          <p className="mt-2 text-sm text-orange-50/90">供應商：{order.supplierName || "未填寫"}，請依實際到貨狀況逐項清點。</p>
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            清點人名稱
            <input className="field" placeholder="例如：小王" value={checkerName} onChange={(event) => setCheckerName(event.target.value)} />
          </label>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
            <div>已清點 {progress.checkedCount} / {progress.total}</div>
            <div className="mt-1 font-semibold">完成率 {progress.percentage}%</div>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

      <section className="grid gap-4">
        {items.map((item, index) => (
          <article className="panel p-5" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-orange-600">Item {index + 1}</p>
                <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>
                <p className="mt-2 text-sm text-slate-600">規格：{item.spec || "未填"}</p>
                <p className="mt-1 text-sm text-slate-600">叫貨數量：{item.orderedQuantity ?? "未填"}{item.unit || ""}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {itemStatusLabel[item.status]}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickStatuses.map((status) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    item.status === status
                      ? "bg-orange-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                  key={status}
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              status,
                              receivedQuantity:
                                status === ItemCheckStatus.RECEIVED ? entry.orderedQuantity ?? entry.receivedQuantity : entry.receivedQuantity,
                            }
                          : entry,
                      ),
                    )
                  }
                >
                  {itemStatusLabel[status]}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                實收數量
                <input
                  className="field"
                  inputMode="decimal"
                  value={item.receivedQuantity ?? ""}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              receivedQuantity: event.target.value === "" ? null : Number(event.target.value),
                            }
                          : entry,
                      ),
                    )
                  }
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                備註
                <input
                  className="field"
                  placeholder="異常時請說明，例如少 2 包、規格不符"
                  value={item.staffNote || ""}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, staffNote: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <div className="sticky bottom-4">
        <button className="btn-primary w-full py-3 text-base" disabled={busy} type="button" onClick={submit}>
          {busy ? "送出中..." : "送出清點結果"}
        </button>
      </div>
    </div>
  );
}

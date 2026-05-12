"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { paymentMethodOptions } from "@/lib/sales";

type PosRow = {
  itemName: string;
  quantity: string;
  unitPrice: string;
  itemNote: string;
};

const initialRow = (): PosRow => ({
  itemName: "",
  quantity: "1",
  unitPrice: "0",
  itemNote: "",
});

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PosCheckoutForm({ defaultCashier }: { defaultCashier: string }) {
  const [rows, setRows] = useState<PosRow[]>([initialRow()]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashier, setCashier] = useState(defaultCashier);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [successSaleNo, setSuccessSaleNo] = useState("");
  const [busy, setBusy] = useState(false);

  const subtotals = rows.map((row) => {
    const quantity = toPositiveNumber(row.quantity);
    const unitPrice = toPositiveNumber(row.unitPrice);
    return Math.round(quantity * unitPrice * 100) / 100;
  });

  const totalAmount = subtotals.reduce((sum, subtotal) => sum + subtotal, 0);

  function resetForm() {
    setRows([initialRow()]);
    setPaymentMethod("");
    setCashier(defaultCashier);
    setNote("");
    setError("");
  }

  function validateRows() {
    const hasAnyValue = rows.some(
      (row) =>
        row.itemName.trim() ||
        row.itemNote.trim() ||
        row.quantity !== "1" ||
        row.unitPrice !== "0",
    );

    if (!hasAnyValue) {
      return "請至少輸入一個品項";
    }

    for (const row of rows) {
      if (!row.itemName.trim()) return "品項名稱不可空白";
      if (toPositiveNumber(row.quantity) <= 0) return "數量必須大於 0";
      if (toPositiveNumber(row.unitPrice) < 0) return "單價不可小於 0";
    }

    if (!paymentMethod) return "請選擇付款方式";
    if (!cashier.trim()) return "請輸入經手人";
    return "";
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">快速結帳</h2>
            <p className="mt-2 text-sm text-slate-600">
              以手動輸入品項為主，金額會即時計算，送出前會由後端重新驗算。
            </p>
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-700">總金額</p>
            <p className="mt-2 text-3xl font-semibold text-orange-900">$ {formatMoney(totalAmount)}</p>
          </div>
        </div>

        {successSaleNo ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            結帳成功，銷售單號：<span className="font-semibold">{successSaleNo}</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {rows.map((row, index) => (
            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={`row-${index}`}>
              <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  品項名稱
                  <input
                    className="field"
                    disabled={busy}
                    placeholder="例如：氣泡袋 20x30"
                    value={row.itemName}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, itemName: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  數量
                  <input
                    className="field"
                    disabled={busy}
                    min="0"
                    step="0.01"
                    type="number"
                    value={row.quantity}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, quantity: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  單價
                  <input
                    className="field"
                    disabled={busy}
                    min="0"
                    step="0.01"
                    type="number"
                    value={row.unitPrice}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, unitPrice: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>

                <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  小計
                  <div className="field flex items-center bg-slate-100 text-base font-semibold text-slate-900">
                    $ {formatMoney(subtotals[index])}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  單品備註
                  <input
                    className="field"
                    disabled={busy}
                    placeholder="選填"
                    value={row.itemNote}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, itemNote: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>

                <button
                  className="btn-secondary"
                  disabled={busy || rows.length === 1}
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                >
                  刪除品項列
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="btn-secondary"
            disabled={busy}
            type="button"
            onClick={() => setRows((current) => [...current, initialRow()])}
          >
            新增品項列
          </button>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            付款方式
            <select
              className="field"
              disabled={busy}
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="">請選擇付款方式</option>
              {paymentMethodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            經手人
            <input
              className="field"
              disabled={busy}
              placeholder="請輸入經手人"
              value={cashier}
              onChange={(event) => setCashier(event.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
          備註
          <textarea
            className="field min-h-28"
            disabled={busy}
            placeholder="選填"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="btn-primary min-w-36"
            disabled={busy}
            type="button"
            onClick={async () => {
              const validationMessage = validateRows();
              setSuccessSaleNo("");

              if (validationMessage) {
                setError(validationMessage);
                return;
              }

              setBusy(true);
              setError("");

              try {
                const response = await fetch("/api/sales", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    payment_method: paymentMethod,
                    cashier,
                    note,
                    items: rows.map((row) => ({
                      item_name: row.itemName,
                      quantity: Number(row.quantity),
                      unit_price: Number(row.unitPrice),
                      item_note: row.itemNote,
                    })),
                  }),
                });
                const payload = await response.json();

                if (!response.ok) {
                  setError(payload.error || "結帳失敗，請重新操作");
                  return;
                }

                setSuccessSaleNo(payload.data.sale_no || "");
                resetForm();
              } catch {
                setError("結帳失敗，請重新操作");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "儲存中..." : "完成結帳"}
          </button>

          <button
            className="btn-secondary"
            disabled={busy}
            type="button"
            onClick={() => {
              setSuccessSaleNo("");
              resetForm();
            }}
          >
            清空
          </button>
        </div>
      </section>
    </div>
  );
}

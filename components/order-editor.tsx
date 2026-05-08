"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ItemCheckStatus, PurchaseOrderStatus } from "@prisma/client";
import { OrderStatusBadge } from "@/components/status-badge";
import { itemStatusOptions } from "@/lib/labels";

type EditableImage = {
  id: string;
  url: string;
  originalName: string;
  ocrStatus: string;
  parseError: string | null;
};

type EditableItem = {
  id?: string;
  name: string;
  spec: string;
  orderedQuantity: number | null;
  unit: string;
  receivedQuantity?: number | null;
  status: ItemCheckStatus;
  staffNote?: string;
  bossNote?: string;
  note?: string;
  confidence?: number | null;
  rawText?: string;
  checkedByName?: string;
};

type EditableOrder = {
  id: string;
  title: string;
  supplierName: string | null;
  orderDate: string | null;
  finalNote: string | null;
  shareToken: string;
  status: PurchaseOrderStatus;
  images: EditableImage[];
  items: EditableItem[];
};

function normalizeOrder(order: EditableOrder): EditableOrder {
  return {
    ...order,
    supplierName: order.supplierName || "",
    orderDate: order.orderDate ? order.orderDate.slice(0, 10) : "",
    finalNote: order.finalNote || "",
    items: order.items.map((item) => ({
      ...item,
      spec: item.spec || "",
      unit: item.unit || "",
      staffNote: item.staffNote || "",
      bossNote: item.bossNote || "",
      note: item.note || "",
      rawText: item.rawText || "",
      checkedByName: item.checkedByName || "",
      orderedQuantity: item.orderedQuantity ?? null,
      receivedQuantity: item.receivedQuantity ?? null,
      confidence: item.confidence ?? null,
    })),
  };
}

export function OrderEditor({ initialOrder }: { initialOrder: EditableOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState<EditableOrder>(() => normalizeOrder(initialOrder));
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const sharePath = `/share/${order.shareToken}`;

  async function copyShareLink() {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setMessage("分享連結已複製");
    } catch {
      setMessage("複製失敗，請手動複製連結");
    }
  }

  async function refreshOrder() {
    const response = await fetch(`/api/purchase-orders/${order.id}`);
    const payload = await response.json();
    if (response.ok) {
      setOrder(normalizeOrder(payload.order));
    }
  }

  async function saveDraft() {
    setBusy(true);
    setMessage("");

    const response = await fetch(`/api/purchase-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error || "儲存失敗");
      return;
    }

    setOrder(normalizeOrder(payload.order));
    setMessage("草稿已儲存");
    router.refresh();
  }

  async function uploadImages() {
    if (!files?.length) {
      setMessage("請先選擇圖片");
      return;
    }

    setBusy(true);
    setMessage("");

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/purchase-orders/${order.id}/images`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error || "上傳失敗");
      return;
    }

    setFiles(null);
    await refreshOrder();
    setMessage(`已上傳 ${payload.images.length} 張圖片`);
  }

  async function parseImage(imageId: string) {
    setBusy(true);
    setMessage("AI 解析中，可能需要幾秒鐘...");
    const response = await fetch(`/api/purchase-orders/${order.id}/images/${imageId}/parse`, {
      method: "POST",
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error || "解析失敗");
      await refreshOrder();
      return;
    }

    setOrder(normalizeOrder(payload.order));
    const warningText = payload.parsed?.warnings?.length ? `，警告 ${payload.parsed.warnings.join("；")}` : "";
    setMessage(`解析完成，新增 ${payload.parsed.items.length} 筆品項${warningText}`);
  }

  async function confirmOrder() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/purchase-orders/${order.id}/confirm`, {
      method: "POST",
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(payload.error || "確認失敗");
      return;
    }

    setOrder((current) => ({ ...current, status: payload.order.status }));
    setMessage("已建立正式清點單，可以把分享連結傳給員工了");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">草稿編輯與人工校正</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              先把圖片解析成品項，再逐筆修正數量、規格與單位，最後建立清點連結。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" type="button" onClick={() => router.push(`/purchase-orders/${order.id}`)}>
              查看結果頁
            </button>
            <button className="btn-primary" disabled={busy} type="button" onClick={saveDraft}>
              {busy ? "處理中..." : "儲存草稿"}
            </button>
            <button className="btn-primary" disabled={busy || !order.items.length} type="button" onClick={confirmOrder}>
              建立清點單
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-1">
            叫貨單標題
            <input
              className="field"
              value={order.title}
              onChange={(event) => setOrder((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            供應商
            <input
              className="field"
              value={order.supplierName || ""}
              onChange={(event) => setOrder((current) => ({ ...current, supplierName: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            叫貨日期
            <input
              className="field"
              type="date"
              value={order.orderDate || ""}
              onChange={(event) => setOrder((current) => ({ ...current, orderDate: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">圖片上傳與解析</h3>
              <p className="mt-1 text-sm text-slate-600">支援多張截圖，逐張解析即可累加品項。</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              className="field max-w-full"
              multiple
              accept="image/png,image/jpeg,image/webp"
              type="file"
              onChange={(event) => setFiles(event.target.files)}
            />
            <button className="btn-primary" disabled={busy} type="button" onClick={uploadImages}>
              上傳圖片
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {order.images.length ? null : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                尚未上傳任何截圖。建議先上傳 1688 訂單畫面，再點擊「開始解析」。
              </div>
            )}

            {order.images.map((image) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4" key={image.id}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <Image alt={image.originalName} className="object-cover" fill sizes="(max-width: 1024px) 100vw, 40vw" src={image.url} />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{image.originalName}</p>
                    <p className="mt-1 text-xs text-slate-500">狀態：{image.ocrStatus}</p>
                    {image.parseError ? <p className="mt-1 text-xs text-rose-600">{image.parseError}</p> : null}
                  </div>
                  <button className="btn-secondary" disabled={busy} type="button" onClick={() => parseImage(image.id)}>
                    開始解析
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">清點品項校正</h3>
              <p className="mt-1 text-sm text-slate-600">第一版只保留品名、規格、數量、單位四個核心欄位。</p>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() =>
                setOrder((current) => ({
                  ...current,
                  items: [
                    ...current.items,
                    {
                      name: "",
                      spec: "",
                      orderedQuantity: null,
                      unit: "",
                      status: ItemCheckStatus.UNCHECKED,
                    },
                  ],
                }))
              }
            >
              手動新增品項
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {order.items.length ? null : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                解析後的品項會出現在這裡，也可以直接手動新增。
              </div>
            )}

            {order.items.map((item, index) => (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id || `draft-${index}`}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    品名
                    <input
                      className="field"
                      value={item.name}
                      onChange={(event) =>
                        setOrder((current) => ({
                          ...current,
                          items: current.items.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    規格
                    <input
                      className="field"
                      value={item.spec}
                      onChange={(event) =>
                        setOrder((current) => ({
                          ...current,
                          items: current.items.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, spec: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    數量
                    <input
                      className="field"
                      inputMode="decimal"
                      value={item.orderedQuantity ?? ""}
                      onChange={(event) =>
                        setOrder((current) => ({
                          ...current,
                          items: current.items.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  orderedQuantity: event.target.value === "" ? null : Number(event.target.value),
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    單位
                    <input
                      className="field"
                      value={item.unit}
                      onChange={(event) =>
                        setOrder((current) => ({
                          ...current,
                          items: current.items.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, unit: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>AI 狀態：{itemStatusOptions.find((option) => option.value === item.status)?.label || "未清點"}</span>
                    {typeof item.confidence === "number" ? <span>信心分數：{item.confidence.toFixed(2)}</span> : null}
                    {item.rawText ? <span className="max-w-xl truncate">原始文字：{item.rawText}</span> : null}
                  </div>
                  <button
                    className="text-sm font-medium text-rose-600"
                    type="button"
                    onClick={() =>
                      setOrder((current) => ({
                        ...current,
                        items: current.items.filter((_, entryIndex) => entryIndex !== index),
                      }))
                    }
                  >
                    刪除
                  </button>
                </div>
              </article>
            ))}
          </div>

          <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-slate-700">
            老闆總備註
            <textarea
              className="field min-h-28"
              value={order.finalNote || ""}
              onChange={(event) => setOrder((current) => ({ ...current, finalNote: event.target.value }))}
            />
          </label>

          <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            <p className="font-medium">員工分享連結</p>
            <p className="mt-2 break-all text-orange-700"> {sharePath}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="btn-secondary" type="button" onClick={copyShareLink}>
                複製連結
              </button>
              <button className="btn-secondary" type="button" onClick={() => window.open(sharePath, "_blank")}>
                預覽員工頁
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

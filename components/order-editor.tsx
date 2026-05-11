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

type FeedbackState = {
  tone: "info" | "success" | "error";
  text: string;
} | null;

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function trimText(value?: string | null) {
  return value?.trim() || "";
}

function normalizeOrder(order: EditableOrder): EditableOrder {
  return {
    ...order,
    title: trimText(order.title),
    supplierName: trimText(order.supplierName),
    orderDate: order.orderDate ? order.orderDate.slice(0, 10) : "",
    finalNote: trimText(order.finalNote),
    items: order.items.map((item) => ({
      ...item,
      name: trimText(item.name),
      spec: trimText(item.spec),
      unit: trimText(item.unit),
      staffNote: trimText(item.staffNote),
      bossNote: trimText(item.bossNote),
      note: trimText(item.note),
      rawText: trimText(item.rawText),
      checkedByName: trimText(item.checkedByName),
      orderedQuantity: normalizeNumber(item.orderedQuantity),
      receivedQuantity: normalizeNumber(item.receivedQuantity),
      confidence: normalizeNumber(item.confidence),
    })),
  };
}

function sanitizeItemForSave(item: EditableItem): EditableItem {
  return {
    ...item,
    name: trimText(item.name),
    spec: trimText(item.spec),
    unit: trimText(item.unit),
    staffNote: trimText(item.staffNote),
    bossNote: trimText(item.bossNote),
    note: trimText(item.note),
    rawText: trimText(item.rawText),
    checkedByName: trimText(item.checkedByName),
    orderedQuantity: normalizeNumber(item.orderedQuantity),
    receivedQuantity: normalizeNumber(item.receivedQuantity),
    confidence: normalizeNumber(item.confidence),
  };
}

async function parseApiResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 15000,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    const payload = await parseApiResponse(response);
    return { response, payload };
  } finally {
    window.clearTimeout(timer);
  }
}

export function OrderEditor({ initialOrder }: { initialOrder: EditableOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState<EditableOrder>(() => normalizeOrder(initialOrder));
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const sharePath = `/share/${order.shareToken}`;

  async function copyShareLink() {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setFeedback({ tone: "success", text: "分享連結已複製。" });
    } catch {
      setFeedback({ tone: "error", text: "複製連結失敗，請稍後再試。" });
    }
  }

  async function refreshOrder() {
    try {
      const { response, payload } = await fetchJsonWithTimeout(
        `/api/purchase-orders/${order.id}`,
        undefined,
        15000,
      );

      if (response.ok && payload && "order" in payload) {
        setOrder(normalizeOrder(payload.order as EditableOrder));
      }
    } catch {
      // Non-blocking refresh failure; the user still keeps current local edits.
    }
  }

  async function saveDraft() {
    setBusy(true);
    setFeedback({ tone: "info", text: "儲存中..." });

    const payloadToSave = {
      ...order,
      title: trimText(order.title),
      supplierName: trimText(order.supplierName),
      finalNote: trimText(order.finalNote),
      items: order.items.map(sanitizeItemForSave),
    };

    try {
      const { response, payload } = await fetchJsonWithTimeout(
        `/api/purchase-orders/${order.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadToSave),
        },
        15000,
      );

      if (!response.ok) {
        const itemHint =
          payload?.item && typeof payload.item === "object"
            ? `（第 ${payload.item.index + 1} 筆：${payload.item.name || "未命名品項"}）`
            : "";
        setFeedback({
          tone: "error",
          text: `${payload?.error || "儲存失敗，請稍後再試。"}${itemHint}`,
        });
        return;
      }

      if (!payload?.order) {
        setFeedback({ tone: "error", text: "儲存失敗，伺服器沒有回傳更新結果。" });
        return;
      }

      setOrder(normalizeOrder(payload.order as EditableOrder));
      setFeedback({ tone: "success", text: "已儲存" });
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      setFeedback({
        tone: "error",
        text: isAbort
          ? "儲存超時，可能未成功寫入，請稍後再試。"
          : "儲存失敗，請稍後再試。",
      });
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages() {
    if (!files?.length) {
      setFeedback({ tone: "error", text: "請先選擇圖片。" });
      return;
    }

    setBusy(true);
    setFeedback({ tone: "info", text: "圖片上傳中..." });

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/purchase-orders/${order.id}/images`, {
        method: "POST",
        body: formData,
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        setFeedback({ tone: "error", text: payload.error || "上傳失敗，請稍後再試。" });
        return;
      }

      setFiles(null);
      await refreshOrder();
      setFeedback({
        tone: "success",
        text: `已上傳 ${payload.images?.length ?? 0} 張圖片。`,
      });
    } catch {
      setFeedback({ tone: "error", text: "上傳失敗，請稍後再試。" });
    } finally {
      setBusy(false);
    }
  }

  async function parseImage(imageId: string) {
    setBusy(true);
    setFeedback({ tone: "info", text: "AI 解析中，可能需要幾秒鐘..." });

    try {
      const response = await fetch(
        `/api/purchase-orders/${order.id}/images/${imageId}/parse`,
        {
          method: "POST",
        },
      );
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        setFeedback({ tone: "error", text: payload.error || "解析失敗，請稍後再試。" });
        await refreshOrder();
        return;
      }

      setOrder(normalizeOrder(payload.order as EditableOrder));
      const warningText =
        payload.parsed?.warnings?.length
          ? ` 警告：${payload.parsed.warnings.join("；")}`
          : "";
      setFeedback({
        tone: "success",
        text: `解析完成，新增 ${payload.parsed?.items?.length ?? 0} 筆品項。${warningText}`,
      });
    } catch {
      setFeedback({ tone: "error", text: "解析失敗，請稍後再試。" });
      await refreshOrder();
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    setBusy(true);
    setFeedback({ tone: "info", text: "建立正式清點單中..." });

    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/confirm`, {
        method: "POST",
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        setFeedback({ tone: "error", text: payload.error || "確認失敗，請稍後再試。" });
        return;
      }

      setOrder((current) => ({ ...current, status: payload.order.status }));
      setFeedback({
        tone: "success",
        text: "已建立正式清點單，可以將分享連結發給員工。",
      });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "確認失敗，請稍後再試。" });
    } finally {
      setBusy(false);
    }
  }

  function updateItem(
    index: number,
    updater: (item: EditableItem) => EditableItem,
  ) {
    setOrder((current) => ({
      ...current,
      items: current.items.map((entry, entryIndex) =>
        entryIndex === index ? updater(entry) : entry,
      ),
    }));
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
              先把圖片解析成品項，再逐筆修正名稱、規格、數量、單位與包裝說明。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => router.push(`/purchase-orders/${order.id}`)}
            >
              查看結果頁
            </button>
            <button
              className="btn-primary"
              disabled={busy}
              type="button"
              onClick={saveDraft}
            >
              {busy ? "處理中..." : "儲存草稿"}
            </button>
            <button
              className="btn-primary"
              disabled={busy || !order.items.length}
              type="button"
              onClick={confirmOrder}
            >
              建立清點單
            </button>
          </div>
        </div>

        {feedback ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : feedback.tone === "error"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-800"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-1">
            叫貨單標題
            <input
              className="field"
              value={order.title}
              onChange={(event) =>
                setOrder((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            供應商
            <input
              className="field"
              value={order.supplierName || ""}
              onChange={(event) =>
                setOrder((current) => ({ ...current, supplierName: event.target.value }))
              }
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            叫貨日期
            <input
              className="field"
              type="date"
              value={order.orderDate || ""}
              onChange={(event) =>
                setOrder((current) => ({ ...current, orderDate: event.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">圖片上傳與解析</h3>
              <p className="mt-1 text-sm text-slate-600">
                支援逐張截圖解析，解析結果會累加到右側的品項校正區。
              </p>
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
            <button
              className="btn-primary"
              disabled={busy}
              type="button"
              onClick={uploadImages}
            >
              上傳圖片
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {order.images.length ? null : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                尚未上傳任何截圖。建議先上傳 1688 訂單畫面，再開始解析。
              </div>
            )}

            {order.images.map((image) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4" key={image.id}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <Image
                    alt={image.originalName}
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    src={image.url}
                  />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{image.originalName}</p>
                    <p className="mt-1 text-xs text-slate-500">狀態：{image.ocrStatus}</p>
                    {image.parseError ? (
                      <p className="mt-1 text-xs text-rose-600">{image.parseError}</p>
                    ) : null}
                  </div>
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    type="button"
                    onClick={() => parseImage(image.id)}
                  >
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
              <p className="mt-1 text-sm text-slate-600">
                第一版清點以外層包裝數量為主，包裝內含數量會保留在備註中。
              </p>
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
                      note: "",
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
                解析後的品項會出現在這裡，也可以手動新增。
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
                        updateItem(index, (entry) => ({ ...entry, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    規格
                    <input
                      className="field"
                      value={item.spec}
                      onChange={(event) =>
                        updateItem(index, (entry) => ({ ...entry, spec: event.target.value }))
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
                        updateItem(index, (entry) => ({
                          ...entry,
                          orderedQuantity: normalizeNumber(event.target.value),
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
                        updateItem(index, (entry) => ({ ...entry, unit: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-slate-700">
                  包裝說明 / 備註
                  <input
                    className="field"
                    placeholder="例如：每件 7000个"
                    value={item.note || ""}
                    onChange={(event) =>
                      updateItem(index, (entry) => ({ ...entry, note: event.target.value }))
                    }
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      AI 狀態：
                      {itemStatusOptions.find((option) => option.value === item.status)?.label ||
                        "未清點"}
                    </span>
                    {typeof item.confidence === "number" ? (
                      <span>信心分數：{item.confidence.toFixed(2)}</span>
                    ) : null}
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

                {item.rawText ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                    <p className="font-medium text-slate-600">原始辨識文字</p>
                    <p className="mt-1 break-words whitespace-pre-wrap">{item.rawText}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-slate-700">
            老闆總備註
            <textarea
              className="field min-h-28"
              value={order.finalNote || ""}
              onChange={(event) =>
                setOrder((current) => ({ ...current, finalNote: event.target.value }))
              }
            />
          </label>

          <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            <p className="font-medium">員工分享連結</p>
            <p className="mt-2 break-all text-orange-700">{sharePath}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="btn-secondary" type="button" onClick={copyShareLink}>
                複製連結
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => window.open(sharePath, "_blank")}
              >
                預覽員工頁
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

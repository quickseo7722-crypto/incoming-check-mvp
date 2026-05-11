"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderDetailActions({
  orderId,
  shareToken,
  isClosed,
}: {
  orderId: string;
  shareToken: string;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const sharePath = `/share/${shareToken}`;

  async function copyShareLink() {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        className="btn-primary h-10 w-full"
        type="button"
        onClick={copyShareLink}
      >
        {copied ? "已複製分享連結" : "複製分享連結"}
      </button>

      <button
        className="btn-secondary h-10 w-full"
        type="button"
        onClick={() => window.open(sharePath, "_blank", "noopener,noreferrer")}
      >
        開啟員工清點頁
      </button>

      <button
        className="btn-secondary h-10 w-full sm:col-span-2"
        type="button"
        onClick={() => router.push(`/purchase-orders/${orderId}/edit`)}
      >
        回到編輯頁
      </button>

      {!isClosed ? (
        <button
          className="btn-danger h-10 w-full sm:col-span-2"
          disabled={busy}
          type="button"
          onClick={async () => {
            setBusy(true);
            try {
              await fetch(`/api/purchase-orders/${orderId}/close`, { method: "POST" });
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "結案中..." : "結案"}
        </button>
      ) : null}
    </div>
  );
}
